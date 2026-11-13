import {sql} from '@/lib/db';
import {ask, askCached, flushAudit, type PendingAudit} from '@/lib/activities/answers';
import {armKey, rankCards, type ArmStats} from '@/lib/activities/rank';
import {aheadFit, levelValue, loadSeries, trajectoryFit, type AheadFit, type Level, type TrajectoryFit} from '@/lib/activities/ahead';
import {TIER_RANK, tierOf} from '@/lib/activities/level';
import {MODELS, museConfigured, museJson} from '@/lib/muse/client';
import {bandValue, friendVisibleTags, MENTOR_K} from '@/lib/activities/privacy';
import {classifyActivity} from '@/lib/activities/classify';
import {isFitnessText, tagsForText} from '@/lib/activities/keywords';

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

// Pure keyword tagger lives in keywords.ts (node --test-able); re-exported for existing callers.
export {isFitnessText, tagsForText};

/** Ontology activity (classify.ts) -> Discover tag. */
const ACTIVITY_TAG: Record<string, string> = {run: 'Running', trail_run: 'Running', walk: 'Walking', hike: 'Hiking', swim: 'Swimming', cycle: 'Cycling', strength: 'Lifting', bodyweight: 'Lifting', yoga: 'Yoga', pilates: 'Yoga', stretch: 'Yoga'};
const EMBED_TAG = new Map<string, Promise<string | undefined>>();

/** Keyword tags plus the embedder's top activity (score >= 0.5) when the model is present; keywords only without it. */
export async function tagsFor(text: string): Promise<string[]> {
  const tags = tagsForText(text);
  // shortcut: unbounded memo keyed by text (event titles, group names); add an LRU cap if texts become per-user or unbounded
  if (!EMBED_TAG.has(text)) EMBED_TAG.set(text, classifyActivity(text).then(([top]) => (top && top.score >= 0.5 ? ACTIVITY_TAG[top.activity] : undefined)));
  const extra = await EMBED_TAG.get(text);
  return extra && !tags.includes(extra) ? [...tags, extra] : tags;
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

/** The user's own positive tags; dismissed suggestions (confirmed = false) are not interests. */
export async function getUserTags(userId: number): Promise<string[]> {
  const rows = await sql`select tag from user_tags where user_id = ${userId} and confirmed order by kind, tag`;
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
  const withFriends = rows.filter(r => (r.friend_ids as number[]).length > 0);
  const allTags = await Promise.all(withFriends.map(r => tagsFor(r.title as string)));
  return withFriends
    .map((r, i) => ({r, eventTags: allTags[i]}))
    .filter(({r, eventTags}) => eventTags.length > 0 || isFitnessText(`${r.title} ${r.settings?.fitness ? 'fitness' : ''}`))
    .map(({r, eventTags}) => {
      const going = (r.friend_ids as number[]).map(id => friends.find(f => f.id === id)).filter(Boolean) as Friend[];
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
  const friendTagRows = friendIds.length ? await sql`select user_id, tag, visibility, confirmed from user_tags where user_id = any(${friendIds}::int[])` : [];
  // only tags the friend shared with friends: only_me / muse_only / dismissed never surface in "You both tagged X"
  const friendTags = new Map(friends.map(f => [f.id, friendVisibleTags(friendTagRows.filter(r => r.user_id === f.id) as {tag: string; visibility: string; confirmed: boolean}[])]));
  const friendCards: DiscoverCard[] = [];
  const audit: PendingAudit[] = [];
  await Promise.all(friends.slice(0, 20).map(async f => {
    const [thisWeek, today] = await Promise.all([askCached(f.id, 'friends', 'workouts_this_week', `discover:${userId}`, audit), askCached(f.id, 'friends', 'completed_move_today', `discover:${userId}`, audit)]);
    const active = thisWeek.value === true || (typeof thisWeek.value === 'number' && thisWeek.value > 0);
    if (!active) return;
    const shared = overlap(tags, friendTags.get(f.id) ?? []);
    const what = today.value === true ? 'moved today' : 'worked out this week';
    friendCards.push(await build({id: `friend-${f.id}`, kind: 'friend', title: f.name, subtitle: `${first(f.name)} ${what}`, href: `/profile/${f.id}`, cta: 'Invite to a game', avatarUrl: f.avatar_url, tag: (friendTags.get(f.id) ?? []).find(t => tags.includes(t)), score: 10 + shared * 3 + (today.value === true ? 2 : 0), meta: {shared}}, shared ? `You both tagged ${(friendTags.get(f.id) ?? []).find(t => tags.includes(t))}.` : `${first(f.name)} shares workout check-ins with friends.`));
  }));
  await flushAudit(audit);
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
  const groupTags = await Promise.all(groups.map(g => tagsFor(g.name as string)));
  for (const [i, g] of groups.entries()) {
    const gTags = groupTags[i];
    const matched = gTags.filter(t => tags.includes(t));
    if (!matched.length && !g.has_rally && !gTags.length && !isFitnessText(g.name as string)) continue;
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
      return {id: `reel-${r.id}`, kind: 'reel' as const, title: (r.caption as string) || 'Workout reel', subtitle: [r.difficulty, ...rTags.slice(0, 2)].filter(Boolean).join(' · '), href: `/reels?reel=${r.id}#activities`, cta: 'Watch', imageUrl: r.poster_url as string | null, tag: matched[0] ?? rTags[0], why: `Suggested for ${label}.`, score: matched.length * 3 + Math.min(3, Number(r.plays) / 100), meta: {label}};
    })
    .sort((a, b) => b.score - a.score);
  if (reelCards.length) sections.push({id: 'learn', title: 'Suggested reels', cards: reelCards});

  // --- Start a game (Rally library; endpoints owned by C/D) ---
  const start: DiscoverCard[] = [
    await build({id: 'start-turf', kind: 'start', title: 'Turf', subtitle: 'Claim streets with friends on real runs and walks', href: '/activities?start=turf', cta: 'Start Turf', score: 3, meta: {template: 'turf'}}, 'Turf fits your Running tag and small-group style.'),
    await build({id: 'start-reel', kind: 'start', title: 'Quest from a Reel', subtitle: 'Turn any workout reel into a weekly boss fight', href: '/reels', cta: 'Pick a reel', score: 2, meta: {template: 'reel'}}, 'Reels you watch can become group quests.'),
    await build({id: 'start-sentence', kind: 'start', title: 'Quest from a sentence', subtitle: '"Run 3 km three times this week" → a game for your chat', href: '/activities?start=sentence', cta: 'Write one', score: 1, meta: {template: 'sentence'}}, 'Describe the game; Muse builds the rules.'),
    await build({id: 'start-yoga', kind: 'start', title: 'Mirror Yoga', subtitle: 'Hold the poses from a yoga Reel on camera. Best score wins.', href: '/activities?start=yoga', cta: 'Pick a flow', score: 2.5, meta: {template: 'yoga'}}, 'Your camera checks each pose.'),
    await build({id: 'start-dance', kind: 'start', title: 'Mirror Dance', subtitle: 'Hit the moves from a dance Reel on camera. Best score wins.', href: '/activities?start=dance', cta: 'Pick a dance', score: 2.5, meta: {template: 'dance'}}, 'Your camera checks each move.'),
    await build({id: 'start-swim', kind: 'start', title: 'Castle Crossing', subtitle: 'Swim a real crossing together, one logged swim at a time.', href: '/activities?start=swim', cta: 'Pick a crossing', score: 2, meta: {template: 'swim'}}, 'Every swim moves the chat across.'),
  ];
  sections.push({id: 'start', title: 'Start a game', cards: start});

  // Bandit + MMR re-rank inside each section (layout order stays fixed); the hand-written scores above are the prior.
  const {mine, all} = await armStats(userId);
  const seed = (userId * 2_654_435_761 + Date.now()) >>> 0;
  for (const [i, s] of sections.entries()) {
    if (s.id === 'first_move') continue;
    s.cards = rankCards(s.cards.map(c => ({id: c.id, type: c.kind, tag: c.tag, score: c.score, card: c})), mine, all, {seed: seed + i}).map(x => x.card);
    if (s.id === 'learn') s.cards = s.cards.slice(0, 6);
  }

  return {sections, tags, museOffline: offline, generatedAt: new Date().toISOString()};
}

/**
 * Click / view counts per (card_type, tag) from discover_events: this user's, and everyone's for cold start.
 * Dismisses count as views without a click. Empty maps (pure hand-score prior) when the table isn't there.
 * shortcut: aggregates 60 days of events on every load; materialize per-arm counts once the table is large.
 */
async function armStats(userId: number): Promise<{mine: ArmStats; all: ArmStats}> {
  const rows = await sql`
    select user_id = ${userId} as mine, card_type, tag, count(*) filter (where event <> 'click')::int as shown, count(*) filter (where event = 'click')::int as clicks
    from discover_events where created_at > now() - interval '60 days' group by 1, 2, 3`.catch(() => []);
  const mine: ArmStats = new Map();
  const all: ArmStats = new Map();
  for (const r of rows) {
    const key = armKey(r.card_type as string, r.tag as string | null);
    const add = (m: ArmStats) => {
      const a = m.get(key) ?? {impressions: 0, clicks: 0};
      m.set(key, {impressions: a.impressions + Number(r.shown), clicks: a.clicks + Number(r.clicks)});
    };
    add(all);
    if (r.mine) add(mine);
  }
  return {mine, all};
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
 * "A few months ahead": opted-in people who, ~offer.weeks ago, trained like the seeker does now (16-week MET-minute
 * series, past-state nearest neighbour) and progressed since; the 7-day snapshot (aheadFit) is the fallback without history.
 * Their side is read only through ask(…, 'mentor_match') (rounded, their policy, audit-logged as 'ahead:match' with no
 * seeker id); their vault is never read here. Opt-in records + goal tags still match when activity data is thin.
 * shortcut: 4 ask() calls per opted-in person per page load; cache or precompute once the pool is more than a few dozen.
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
  const [myKm, myDays, myLevel, myLoads] = await Promise.all([ask(seekerId, 'only_me', 'distance_last_7_days_km', 'ahead:self'), ask(seekerId, 'only_me', 'active_days_last_7_days', 'ahead:self'), ask(seekerId, 'only_me', 'level_4w', 'ahead:self'), ask(seekerId, 'only_me', 'load_weekly_16w', 'ahead:self')]);
  const myTier = tierOf(myLevel.value);
  const me: Level = {km: levelValue(myKm.value), days: levelValue(myDays.value)};
  const mySeries = loadSeries(myLoads.value);
  const out: MentorMatch[] = [];
  await Promise.all(offers.map(async o => {
    const bday = o.birthday ? new Date(o.birthday as string) : null;
    if (bday && !Number.isNaN(bday.getTime()) && Date.now() - bday.getTime() < 18 * 365.25 * 86_400_000) return;
    const metric = ((o.metric as string) ?? '').trim();
    const goals = METRIC_GOALS[metric] ?? [];
    const matched = goals.filter(g => tags.includes(g));
    // banded so a card can't be matched back to one person's exact numbers
    const from = bandValue(o.from_value as string);
    const to = bandValue(o.to_value as string);
    const record = metric ? (from && to ? `${metric}: ${from} → ${to}` : metric) : null;
    let fit: AheadFit | null = null;
    let traj: TrajectoryFit | null = null;
    let theirs = '';
    // 4-week tier one step above mine = the clearest "few months ahead" signal; last-7-days km/days can be one odd week
    let gap: number | null = null;
    const weeks = Number(o.weeks) || 12;
    if ((o.consent as {workouts?: boolean} | null)?.workouts) {
      const uid = o.user_id as number;
      const [km, days, lvl, loads] = await Promise.all([ask(uid, 'mentor_match', 'distance_last_7_days_km', 'ahead:match'), ask(uid, 'mentor_match', 'active_days_last_7_days', 'ahead:match'), ask(uid, 'mentor_match', 'level_4w', 'ahead:match'), ask(uid, 'mentor_match', 'load_weekly_16w', 'ahead:match')]);
      // their 4 weeks from ~offer.weeks ago vs my last 4; snapshot aheadFit only when either side lacks history
      const theirSeries = loadSeries(loads.value);
      traj = mySeries && theirSeries ? trajectoryFit(mySeries, theirSeries, weeks, myTier) : null;
      fit = traj ? null : aheadFit(me, {km: levelValue(km.value), days: levelValue(days.value)}, weeks, myTier);
      theirs = traj ? `Trained like you ${traj.lag} weeks ago` : fit?.metric === 'km' ? `Covers ${km.value} a week` : fit ? `Active ${days.value} days a week` : '';
      const theirTier = tierOf(lvl.value);
      if (myTier && theirTier) gap = TIER_RANK[theirTier] - TIER_RANK[myTier];
      if (gap === 1 && !theirs) theirs = `Trains at the "${theirTier}" level`;
    }
    if (!traj && !fit && !matched.length && gap !== 1) return;
    const mine = fit?.metric === 'km' ? `about ${Math.round(fit.me)} km` : fit ? `${Math.round(fit.me)} ${Math.round(fit.me) === 1 ? 'day' : 'days'}` : '';
    out.push({
      mentorId: o.user_id as number,
      title: theirs || (record as string),
      // growth to the nearest half (≈2.5×) so the card can't be read back to their exact load
      subtitle: traj ? `Their weekly training load is up about ${Math.max(1.5, Math.round(traj.growth * 2) / 2)}× since${record ? ` · ${record}` : ''}` : fit ? `You're at ${mine} now${record ? ` · ${record}` : ''}` : !matched.length ? `You're at "${myTier}" now` : `Got there in ${Number(o.weeks ?? 0)} weeks`,
      why: traj || fit || !matched.length ? `That's about where you could be in ${traj?.lag ?? weeks} weeks.` : `Their record matches your goal to ${matched[0].toLowerCase()}.`,
      goalTag: matched[0] ?? null,
      score: (traj ? traj.fit * 12 : fit ? fit.fit * 10 : 0) + matched.length * 3 + (record ? 1 : 0) + (gap === 1 ? 4 : gap === 2 ? 1 : gap != null && gap <= 0 ? -3 : 0),
      requestId: (o.request_id as number) ?? null,
      status: (o.request_status as string) ?? null,
      connect: (o.connect_status as string) ?? null,
    });
  }));
  // k-anonymity: with fewer than k matches a card could single someone out; keep only ones the seeker already contacted
  return (out.length >= MENTOR_K ? out : out.filter(m => m.requestId != null)).sort((a, b) => b.score - a.score);
}
