import {sql} from '@/lib/db';
import {ask} from '@/lib/activities/answers';
import {aheadFit, levelValue, type AheadFit, type Level} from '@/lib/activities/ahead';
import {MODELS, museConfigured, museJson} from '@/lib/muse/client';

/** A Discover card. Everything about other people here came from ask() answers or public rows (events/groups/reels). */
export type DiscoverCard = {
  id: string;
  kind: 'invite' | 'game' | 'event' | 'start' | 'friend' | 'group' | 'mentor' | 'reel';
  title: string;
  subtitle?: string;
  /** One-line "why you see this" (Muse Ember when configured, template otherwise). */
  why: string;
  /** True when `why` is the deterministic fallback and Ember's line can still be fetched. */
  whyPending?: boolean;
  fallback?: string;
  href?: string;
  cta?: string;
  /** Tag removed by "Not interested". */
  tag?: string;
  imageUrl?: string | null;
  avatarUrl?: string | null;
  score: number;
  meta?: Record<string, string | number | boolean | null>;
};

export type DiscoverSection = {id: 'first_move' | 'friends' | 'events' | 'groups' | 'mentors' | 'learn' | 'start'; title: string; cards: DiscoverCard[]};
export type DiscoverPayload = {sections: DiscoverSection[]; tags: string[]; museOffline: boolean; generatedAt: string};

const FITNESS_WORDS = ['run', '5k', '10k', 'marathon', 'climb', 'yoga', 'lift', 'gym', 'bike', 'cycling', 'ride', 'hike', 'swim', 'workout', 'bootcamp', 'pickleball', 'boss fight', 'fitness', 'walk'];
const TAG_WORDS: Record<string, string[]> = {
  Running: ['run', '5k', '10k', 'marathon', 'trail'],
  Climbing: ['climb', 'boulder'],
  Yoga: ['yoga', 'pilates'],
  Lifting: ['lift', 'strength', 'gym', 'bench'],
  Cycling: ['bike', 'cycling', 'ride'],
  Hiking: ['hike', 'trail'],
  Swimming: ['swim'],
  Walking: ['walk', 'photowalk', 'steps'],
  Pickleball: ['pickleball'],
  Basketball: ['basketball', 'hoops'],
  Soccer: ['soccer', 'football'],
};

export function isFitnessText(text: string): boolean {
  const t = text.toLowerCase();
  return FITNESS_WORDS.some(w => t.includes(w));
}

export function tagsForText(text: string): string[] {
  const t = text.toLowerCase();
  return Object.entries(TAG_WORDS).filter(([, words]) => words.some(w => t.includes(w))).map(([tag]) => tag);
}

function overlap(a: string[], b: string[]): number {
  const set = new Set(a.map(x => x.toLowerCase()));
  return b.filter(x => set.has(x.toLowerCase())).length;
}

function recencyScore(date: string | Date | null | undefined): number {
  if (!date) return 0;
  const days = Math.abs(new Date(date).getTime() - Date.now()) / 86_400_000;
  return Math.max(0, 3 - days / 7);
}

function first(name: string): string {
  return name.split(' ')[0];
}

const WHY_CACHE = new Map<string, {text: string; at: number}>();
const WHY_TTL = 10 * 60 * 1000;

export type WhyRequest = {id: string; kind: string; title: string; subtitle?: string; tag?: string; meta?: unknown; fallback: string};

/** Ember writes the "why you see this" lines for a whole page of cards in one call (cached per user+card
 *  for 10 min, 8 s budget, falls back to the deterministic reason). Called from /api/activities/why. */
export async function discoverWhy(userId: number, cards: WhyRequest[]): Promise<{why: Record<string, string>; offline: boolean}> {
  const why: Record<string, string> = {};
  const missing: WhyRequest[] = [];
  for (const c of cards) {
    const hit = WHY_CACHE.get(`${userId}:${c.id}`);
    if (hit && Date.now() - hit.at < WHY_TTL) why[c.id] = hit.text;
    else missing.push(c);
  }
  if (!museConfigured() || missing.length === 0) return {why, offline: !museConfigured()};
  try {
    const out = await Promise.race([
      museJson<{items: {id: string; why: string}[]}>({
        model: MODELS.ember,
        effort: 'minimal',
        schemaName: 'discover_why_batch',
        schema: {type: 'object', properties: {items: {type: 'array', items: {type: 'object', properties: {id: {type: 'string'}, why: {type: 'string'}}, required: ['id', 'why'], additionalProperties: false}}}, required: ['items'], additionalProperties: false},
        input: `For each Activities card below, write one friendly sentence (max 14 words) telling a Facebook user why they see it. Never mention bodies, weight, health or performance judgements. Return one item per card id. Cards: ${JSON.stringify(missing.slice(0, 40).map(c => ({id: c.id, kind: c.kind, title: c.title, subtitle: c.subtitle, tag: c.tag, meta: c.meta, reason: c.fallback})))}`,
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('muse timeout')), 8000)),
    ]);
    for (const item of out.items) {
      const text = item.why?.trim();
      if (!text || !missing.some(c => c.id === item.id)) continue;
      why[item.id] = text;
      WHY_CACHE.set(`${userId}:${item.id}`, {text, at: Date.now()});
    }
    return {why, offline: false};
  } catch {
    return {why, offline: true};
  }
}

type Friend = {id: number; name: string; avatar_url: string};

export async function getUserTags(userId: number): Promise<string[]> {
  const rows = await sql`select tag from user_tags where user_id = ${userId} order by kind, tag`;
  return rows.map(r => r.tag as string);
}

export async function friendsOf(userId: number): Promise<Friend[]> {
  const rows = await sql`
    select u.id, u.name, u.avatar_url from friendships f join users u on u.id = f.friend_id
    where f.user_id = ${userId} and f.status = 'accepted' order by u.name`;
  return rows as Friend[];
}

/** Upcoming fitness-y events with the viewer's friends who are going (real counts). */
export async function trainEvents(userId: number, friends: Friend[], tags: string[]) {
  const friendIds = friends.map(f => f.id);
  if (!friendIds.length) return [];
  const rows = await sql`
    select e.id, e.title, e.location, e.cover_url, e.starts_at, e.settings,
           coalesce(array_agg(r.user_id) filter (where r.user_id is not null), '{}') as friend_ids,
           exists (select 1 from event_rsvps me where me.event_id = e.id and me.user_id = ${userId}) as me_going
    from events e
    left join event_rsvps r on r.event_id = e.id and r.status = 'going' and r.user_id = any(${friendIds}::int[])
    where e.starts_at > now() - interval '12 hours' and e.starts_at < now() + interval '21 days'
    group by e.id order by e.starts_at asc`;
  return rows
    .filter(r => isFitnessText(`${r.title} ${r.settings?.fitness ? 'fitness' : ''}`) && (r.friend_ids as number[]).length > 0)
    .map(r => {
      const going = (r.friend_ids as number[]).map(id => friends.find(f => f.id === id)).filter(Boolean) as Friend[];
      const eventTags = tagsForText(r.title as string);
      return {
        id: r.id as number,
        title: r.title as string,
        location: r.location as string,
        coverUrl: r.cover_url as string,
        startsAt: new Date(r.starts_at as string).toISOString(),
        bossFight: !!(r.settings as {bossFight?: boolean})?.bossFight || /boss fight/i.test(r.title as string),
        going,
        meGoing: !!r.me_going,
        tags: eventTags,
        score: going.length * 2 + overlap(tags, eventTags) * 2 + recencyScore(r.starts_at as string),
      };
    })
    .sort((a, b) => b.score - a.score);
}

export async function getDiscover(userId: number): Promise<DiscoverPayload> {
  const [tags, friends, profileRows] = await Promise.all([getUserTags(userId), friendsOf(userId), sql`select * from activity_profiles where user_id = ${userId}`]);
  const friendIds = friends.map(f => f.id);
  const firstName = (await sql`select name from users where id = ${userId}`)[0]?.name as string;
  void firstName;
  void profileRows;
  // Muse is deliberately kept out of the request path: cards ship with the deterministic reason
  // (or a cached Ember line) and the client asks /api/activities/why for the rest in one batch.
  const offline = !museConfigured();
  const sections: DiscoverSection[] = [];
  const build = (card: Omit<DiscoverCard, 'why'>, fallback: string): DiscoverCard => {
    const hit = WHY_CACHE.get(`${userId}:${card.id}`);
    const cached = hit && Date.now() - hit.at < WHY_TTL ? hit.text : null;
    return {...card, why: cached ?? fallback, whyPending: !offline && !cached, fallback};
  };

  // --- Pending invites / friends' open games (Turf, owned by D) ---
  const invites = await sql`
    select g.id, g.settings, g.ends_at, u.name as host_name, u.avatar_url as host_avatar
    from game_invites gi join games g on g.id = gi.game_id left join users u on u.id = g.host_id
    where gi.user_id = ${userId} and gi.status = 'invited' and g.status in ('pending', 'live') order by g.created_at desc limit 3`.catch(() => []);
  const openGames = friendIds.length
    ? await sql`
      select g.id, g.settings, g.ends_at, g.status, u.name as host_name, u.avatar_url as host_avatar
      from games g join users u on u.id = g.host_id
      where g.host_id = any(${friendIds}::int[]) and g.status in ('pending', 'live')
        and not exists (select 1 from game_invites gi where gi.game_id = g.id and gi.user_id = ${userId})
      order by g.created_at desc limit 3`.catch(() => [])
    : [];
  const events = await trainEvents(userId, friends, tags);

  // --- Your first move ---
  const firstMove: DiscoverCard[] = [];
  if (invites[0]) {
    const g = invites[0];
    const title = (g.settings as {title?: string})?.title ?? 'Turf game';
    firstMove.push(await build({id: `invite-${g.id}`, kind: 'invite', title: `${first(g.host_name as string)} invited you to ${title}`, subtitle: 'A friend is waiting on you', href: `/activities/turf/${g.id}`, cta: 'View invite', avatarUrl: g.host_avatar as string, score: 100}, `${first(g.host_name as string)} invited you, so this comes first.`));
  } else if (openGames[0]) {
    const g = openGames[0];
    const title = (g.settings as {title?: string})?.title ?? 'Turf game';
    firstMove.push(await build({id: `game-${g.id}`, kind: 'game', title: `${first(g.host_name as string)} has an open game: ${title}`, subtitle: 'Ask to join', href: `/activities/turf/${g.id}`, cta: 'Ask to join', avatarUrl: g.host_avatar as string, score: 90}, `A friend's game is open right now.`));
  } else if (events[0]) {
    const e = events[0];
    firstMove.push(await build({id: `first-event-${e.id}`, kind: 'event', title: `Train for ${e.title}`, subtitle: `${e.going.length} ${e.going.length === 1 ? 'friend is' : 'friends are'} going`, href: `/events?id=${e.id}`, cta: 'Train with them', imageUrl: e.coverUrl, tag: e.tags[0], score: 80, meta: {friends: e.going.length}}, `${e.going.map(g => first(g.name)).join(' and ')} RSVP'd and it matches your ${e.tags[0] ?? 'activity'} tag.`));
  } else {
    firstMove.push(await build({id: 'first-start', kind: 'start', title: 'Start a game', subtitle: 'Turf with friends takes 30 seconds to set up', href: '/activities?start=turf', cta: 'Start a game', score: 70}, 'Nothing is waiting on you, so start something.'));
  }
  sections.push({id: 'first_move', title: 'Your first move', cards: firstMove});

  // --- Friends doing Activities (privacy-safe booleans via ask()) ---
  const friendTagRows = friendIds.length ? await sql`select user_id, tag from user_tags where user_id = any(${friendIds}::int[])` : [];
  const friendTags = new Map<number, string[]>();
  for (const r of friendTagRows) friendTags.set(r.user_id as number, [...(friendTags.get(r.user_id as number) ?? []), r.tag as string]);
  const friendCards: DiscoverCard[] = [];
  await Promise.all(friends.slice(0, 20).map(async f => {
    const [thisWeek, today] = await Promise.all([ask(f.id, 'friends', 'workouts_this_week', `discover:${userId}`), ask(f.id, 'friends', 'completed_move_today', `discover:${userId}`)]);
    const active = thisWeek.value === true || (typeof thisWeek.value === 'number' && thisWeek.value > 0);
    if (!active) return;
    const shared = overlap(tags, friendTags.get(f.id) ?? []);
    const what = today.value === true ? 'moved today' : 'worked out this week';
    friendCards.push(await build({id: `friend-${f.id}`, kind: 'friend', title: f.name, subtitle: `${first(f.name)} ${what}`, href: `/profile/${f.id}`, cta: 'Invite to a game', avatarUrl: f.avatar_url, tag: (friendTags.get(f.id) ?? []).find(t => tags.includes(t)), score: 10 + shared * 3 + (today.value === true ? 2 : 0), meta: {shared}}, shared ? `You both tagged ${(friendTags.get(f.id) ?? []).find(t => tags.includes(t))}.` : `${first(f.name)} shares workout check-ins with friends.`));
  }));
  friendCards.sort((a, b) => b.score - a.score);
  if (friendCards.length) sections.push({id: 'friends', title: 'Friends doing Activities', cards: friendCards});

  // --- Train for an event ---
  const eventCards: DiscoverCard[] = [];
  for (const e of events) {
    eventCards.push(await build({id: `event-${e.id}`, kind: 'event', title: e.title, subtitle: `Train for this with the ${e.going.length} ${e.going.length === 1 ? 'friend' : 'friends'} going`, href: `/events?id=${e.id}`, cta: 'Train with them', imageUrl: e.coverUrl, tag: e.tags[0], score: e.score, meta: {friends: e.going.length, bossFight: e.bossFight, startsAt: e.startsAt, location: e.location}}, e.bossFight ? 'This event is a Rally boss fight; moves there count double.' : `${e.going.map(g => first(g.name)).join(', ')} ${e.going.length === 1 ? 'is' : 'are'} going.`));
  }
  if (eventCards.length) sections.push({id: 'events', title: 'Train for an event', cards: eventCards});

  // --- Groups & clubs ---
  const groups = await sql`
    select g.id, g.name, g.cover_url,
           (select count(*) from group_members gm where gm.group_id = g.id) as member_count,
           (select count(*) from group_members gm where gm.group_id = g.id and gm.user_id = any(${friendIds.length ? friendIds : [0]}::int[])) as friend_members,
           exists (select 1 from group_members gm where gm.group_id = g.id and gm.user_id = ${userId}) as joined,
           exists (select 1 from quests q where q.group_id = g.id and q.status = 'active') as has_rally
    from groups g order by member_count desc limit 40`;
  const groupCards: DiscoverCard[] = [];
  for (const g of groups) {
    const gTags = tagsForText(g.name as string);
    const matched = gTags.filter(t => tags.includes(t));
    if (!matched.length && !g.has_rally && !isFitnessText(g.name as string)) continue;
    const fm = Number(g.friend_members);
    groupCards.push(await build({id: `group-${g.id}`, kind: 'group', title: g.name as string, subtitle: `${Number(g.member_count).toLocaleString()} members${fm ? ` · ${fm} ${fm === 1 ? 'friend' : 'friends'}` : ''}${g.has_rally ? ' · weekly Rally' : ''}`, href: `/groups/${g.id}`, cta: g.joined ? 'Open' : 'Join', imageUrl: g.cover_url as string, tag: matched[0] ?? gTags[0], score: matched.length * 4 + fm * 2 + (g.has_rally ? 3 : 0), meta: {joined: !!g.joined, rally: !!g.has_rally}}, matched.length ? `Matches your ${matched[0]} tag${fm ? ` and ${fm} of your friends are in it` : ''}.` : g.has_rally ? 'This group runs a weekly Rally.' : 'An active club near you.'));
  }
  groupCards.sort((a, b) => b.score - a.score);
  if (groupCards.length) sections.push({id: 'groups', title: 'Groups & clubs', cards: groupCards});

  // --- A few months ahead (names hidden; talk only through Muses) ---
  const mentorMatches = await matchMentors(userId, tags);
  const mentorCards: DiscoverCard[] = [];
  for (const m of mentorMatches.slice(0, 6)) {
    mentorCards.push(build({id: `mentor-${m.mentorId}`, kind: 'mentor', title: m.title, subtitle: m.subtitle, href: `/activities/ahead?offer=${m.mentorId}`, cta: 'Ask their Muse', tag: m.goalTag ?? undefined, score: m.score, meta: {mentorId: m.mentorId, requestId: m.requestId, status: m.status}}, m.why));
  }
  if (mentorCards.length) sections.push({id: 'mentors', title: 'A few months ahead of you', cards: mentorCards});

  // --- Suggested reels (the /activities bento): tag matches first, topped up with popular workouts so it is never empty ---
  const reels = await sql`select id, caption, poster_url, tags, difficulty, plays from reels where is_fitness order by plays desc, id desc limit 60`.catch(() => []);
  const reelCards: DiscoverCard[] = reels
    .map(r => {
      const rTags = (r.tags as string[]) ?? [];
      const matched = rTags.filter(t => tags.some(ut => ut.toLowerCase() === t.toLowerCase()));
      const label = matched[0] ?? rTags[0] ?? 'Workouts';
      // No Ember line: the bento shows the label, not a "why".
      return {id: `reel-${r.id}`, kind: 'reel' as const, title: (r.caption as string) || 'Workout reel', subtitle: [r.difficulty, ...rTags.slice(0, 2)].filter(Boolean).join(' · '), href: `/reels?reel=${r.id}#activities`, cta: 'Watch', imageUrl: r.poster_url as string | null, tag: matched[0], why: `Suggested for ${label}.`, score: matched.length * 3 + Math.min(3, Number(r.plays) / 100), meta: {label}};
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
  if (reelCards.length) sections.push({id: 'learn', title: 'Suggested reels', cards: reelCards});

  // --- Start a game (Rally library; endpoints owned by C/D) ---
  const start: DiscoverCard[] = [
    await build({id: 'start-turf', kind: 'start', title: 'Turf', subtitle: 'Claim streets with friends on real runs and walks', href: '/activities?start=turf', cta: 'Start Turf', score: 3, meta: {template: 'turf'}}, 'Turf fits your Running tag and small-group style.'),
    await build({id: 'start-reel', kind: 'start', title: 'Quest from a Reel', subtitle: 'Turn any workout reel into a weekly boss fight', href: '/reels', cta: 'Pick a reel', score: 2, meta: {template: 'reel'}}, 'Reels you watch can become group quests.'),
    await build({id: 'start-sentence', kind: 'start', title: 'Quest from a sentence', subtitle: '"Run 3 km three times this week" → a game for your chat', href: '/activities?start=sentence', cta: 'Write one', score: 1, meta: {template: 'sentence'}}, 'Describe the game; Muse builds the rules.'),
  ];
  sections.push({id: 'start', title: 'Start a game', cards: start});

  return {sections, tags, museOffline: offline, generatedAt: new Date().toISOString()};
}

export type MentorMatch = {mentorId: number; title: string; subtitle: string; why: string; goalTag: string | null; score: number; requestId: number | null; status: string | null; connect: string | null};

const METRIC_GOALS: Record<string, string[]> = {
  '5k time': ['Get faster', 'Train for an event', 'Running'],
  'Bench press': ['Get stronger', 'Lifting'],
  'Workouts per week': ['Be consistent', 'Get started', 'Do it with friends'],
  'Weekly distance': ['Train for an event', 'Running', 'Cycling'],
  'Active days': ['Be consistent', 'Get started'],
};

/**
 * "A few months ahead": opted-in people whose level now ≈ where the seeker could be in ~3 months.
 * Their side is read only through ask(…, 'mentor_match') (rounded, their policy, audit-logged as 'ahead:match' with no
 * seeker id); their vault is never read here. Opt-in records + goal tags still match when activity data is thin.
 * shortcut: 2 ask() calls per opted-in person per page load; cache or precompute once the pool is more than a few dozen.
 */
export async function matchMentors(seekerId: number, tags: string[]): Promise<MentorMatch[]> {
  const offers = await sql`
    select o.user_id, o.metric, o.from_value, o.to_value, o.weeks, o.consent,
           (select d.birthday from user_details d where d.user_id = o.user_id) as birthday,
           r.id as request_id, r.status as request_status, r.connect_status
    from mentor_offers o
    left join lateral (select id, status, connect_status from mentor_requests where mentor_id = o.user_id and seeker_id = ${seekerId} order by id desc limit 1) r on true
    where o.user_id <> ${seekerId}`.catch(() => []);
  if (!offers.length) return [];
  const [myKm, myDays] = await Promise.all([ask(seekerId, 'only_me', 'distance_last_7_days_km', 'ahead:self'), ask(seekerId, 'only_me', 'active_days_last_7_days', 'ahead:self')]);
  const me: Level = {km: levelValue(myKm.value), days: levelValue(myDays.value)};
  const out: MentorMatch[] = [];
  await Promise.all(offers.map(async o => {
    const bday = o.birthday ? new Date(o.birthday as string) : null;
    if (bday && !Number.isNaN(bday.getTime()) && Date.now() - bday.getTime() < 18 * 365.25 * 86_400_000) return;
    const metric = ((o.metric as string) ?? '').trim();
    const goals = METRIC_GOALS[metric] ?? [];
    const matched = goals.filter(g => tags.includes(g));
    const record = metric ? `${metric}: ${o.from_value ?? ''} → ${o.to_value ?? ''}` : null;
    let fit: AheadFit | null = null;
    let theirs = '';
    if ((o.consent as {workouts?: boolean} | null)?.workouts) {
      const uid = o.user_id as number;
      const [km, days] = await Promise.all([ask(uid, 'mentor_match', 'distance_last_7_days_km', 'ahead:match'), ask(uid, 'mentor_match', 'active_days_last_7_days', 'ahead:match')]);
      fit = aheadFit(me, {km: levelValue(km.value), days: levelValue(days.value)});
      theirs = fit?.metric === 'km' ? `Covers ${km.value} a week` : fit ? `Active ${days.value} days a week` : '';
    }
    if (!fit && !matched.length) return;
    const mine = fit?.metric === 'km' ? `about ${Math.round(fit.me)} km` : fit ? `${Math.round(fit.me)} ${Math.round(fit.me) === 1 ? 'day' : 'days'}` : '';
    out.push({
      mentorId: o.user_id as number,
      title: fit ? theirs : (record as string),
      subtitle: fit ? `You're at ${mine} now${record ? ` · ${record}` : ''}` : `Got there in ${Number(o.weeks ?? 0)} weeks`,
      why: fit ? "That's about where you could be in 3 months." : `Their record matches your goal to ${matched[0].toLowerCase()}.`,
      goalTag: matched[0] ?? null,
      score: (fit ? fit.fit * 10 : 0) + matched.length * 3 + (record ? 1 : 0),
      requestId: (o.request_id as number) ?? null,
      status: (o.request_status as string) ?? null,
      connect: (o.connect_status as string) ?? null,
    });
  }));
  return out.sort((a, b) => b.score - a.score);
}
