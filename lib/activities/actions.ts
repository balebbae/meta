import {sql} from '@/lib/db';
import {museContext} from '@/lib/activities/answers';
import {getUserTags, isFitnessText, tagsForText} from '@/lib/activities/discover';
import {cleanActions, fallbackActions, MAX_PER_KIND, type ActionKind, type Candidate, type CleanAction, type RawAction} from '@/lib/activities/action-rules';
import {MODELS, museConfigured, museJson} from '@/lib/muse/client';

/**
 * Muse action items: the owner's Muse turns their own activity context into things to do next
 * (register for an event, buy gear). Private to the owner: only museContext() aggregates, their tags
 * and a city (or coarse coordinates) are sent to Muse; raw vault events never leave the server.
 * Register/Buy are simulated in-app: nothing is paid and no organizer or store is contacted.
 */
export type MuseAction = {id: number; kind: ActionKind; title: string; detail: string; why: string; price: string | null; url: string | null; imageUrl: string | null; startsAt: string | null; status: 'suggested' | 'done'; confirmation: string | null};
export type MuseActionsPayload = {actions: MuseAction[]; stale: boolean; needsLocation: boolean; museOffline: boolean};

const DAY_MS = 86_400_000;

function mapAction(r: Record<string, unknown>): MuseAction {
  return {id: Number(r.id), kind: r.kind as ActionKind, title: String(r.title), detail: String(r.detail ?? ''), why: String(r.why ?? ''), price: (r.price as string | null) ?? null, url: (r.url as string | null) ?? null, imageUrl: (r.image_url as string | null) ?? null, startsAt: r.starts_at ? new Date(r.starts_at as string).toISOString() : null, status: r.status as 'suggested' | 'done', confirmation: (r.confirmation as string | null) ?? null};
}

async function city(userId: number): Promise<string | null> {
  const [row] = await sql`select current_city from user_details where user_id = ${userId}`;
  return (row?.current_city as string | null)?.trim() || null;
}

export async function listActions(userId: number): Promise<MuseActionsPayload> {
  const [rows, [profile], where] = await Promise.all([
    sql`select * from muse_actions where user_id = ${userId} and ((status = 'done' and acted_at > now() - interval '30 days') or (status = 'suggested' and (starts_at is null or starts_at > now())))
        order by (status = 'done'), kind desc, id`,
    sql`select muse_actions_at from activity_profiles where user_id = ${userId}`,
    city(userId),
  ]);
  const at = profile?.muse_actions_at ? new Date(profile.muse_actions_at as string).getTime() : 0;
  return {actions: rows.map(mapAction), stale: Date.now() - at > DAY_MS, needsLocation: !where, museOffline: !museConfigured()};
}

const usd = (cents: number) => (cents ? `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}` : 'Free');

/** In-app things Muse may pick: upcoming events the user is not going to yet, and Marketplace gear. */
export async function localCandidates(userId: number, tags: string[]): Promise<Candidate[]> {
  const [events, listings] = await Promise.all([
    sql`select e.id, e.title, e.location, e.cover_url, e.starts_at, e.settings from events e
        where e.starts_at > now() and e.starts_at < now() + interval '90 days'
          and not exists (select 1 from event_rsvps r where r.event_id = e.id and r.user_id = ${userId} and r.status = 'going')
        order by e.starts_at asc limit 60`,
    sql`select id, title, category, condition, location, price_cents, image_url from marketplace_listings
        where seller_id <> ${userId} order by created_at desc limit 80`,
  ]);
  const mine = (text: string) => tagsForText(text).some(t => tags.includes(t));
  const pick = <T,>(rows: T[], text: (r: T) => string, fits: (r: T) => boolean) => [...rows.filter(r => mine(text(r))), ...rows.filter(r => !mine(text(r)) && fits(r))].slice(0, MAX_PER_KIND * 2);
  return [
    ...pick(events, e => e.title as string, e => !!(e.settings as {fitness?: boolean} | null)?.fitness || isFitnessText(e.title as string)).map((e): Candidate => {
      const startsAt = new Date(e.starts_at as string);
      return {candidateId: `event:${e.id}`, kind: 'event', title: e.title as string, detail: `${startsAt.toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'})} · ${e.location}`, price: 'Free', url: `/events?id=${e.id}`, imageUrl: (e.cover_url as string) ?? null, startsAt: startsAt.toISOString(), eventId: Number(e.id), listingId: null};
    }),
    ...pick(listings, l => l.title as string, l => l.category === 'Sporting Goods').map((l): Candidate => ({candidateId: `listing:${l.id}`, kind: 'buy', title: l.title as string, detail: `${String(l.condition).replace(/_/g, ' ')} · ${l.location} · Marketplace`, price: usd(Number(l.price_cents)), url: `/marketplace/item/${l.id}`, imageUrl: (l.image_url as string) ?? null, startsAt: null, eventId: null, listingId: Number(l.id)})),
  ];
}

const str = {type: 'string'} as const;
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['items'],
  properties: {
    items: {
      type: 'array',
      items: {type: 'object', additionalProperties: false, required: ['kind', 'title', 'detail', 'price', 'url', 'startsAt', 'why', 'candidateId'], properties: {kind: {type: 'string', enum: ['event', 'buy']}, title: str, detail: str, price: str, url: str, startsAt: str, why: str, candidateId: str}},
    },
  },
};

async function askMuse(context: unknown, where: string | null, candidates: Candidate[]): Promise<RawAction[]> {
  const out = await museJson<{items: RawAction[]}>({
    model: MODELS.spark,
    effort: 'low',
    schemaName: 'muse_actions',
    schema: SCHEMA,
    tools: where ? [{type: 'web_search'}] : undefined,
    input: `You are this person's private Muse on Facebook Activities. Suggest what they should do next: up to ${MAX_PER_KIND} events to register for and up to ${MAX_PER_KIND} things worth buying, picked for what they actually do.
Today is ${new Date().toISOString().slice(0, 10)}. Their context (aggregates only): ${JSON.stringify(context)}.
${where ? `They are in or near ${where}. Use web search to find real upcoming events near them in the next 4 months (for a runner: a 5k, 10k or half marathon that fits their weekly distance) and real gear for their main activity.` : 'You have no location and no web search, so choose only from the candidates.'}
In-app candidates you may also pick (prefer one when it fits as well as a web find): ${JSON.stringify(candidates.map(c => ({candidateId: c.candidateId, kind: c.kind, title: c.title, detail: c.detail, price: c.price})))}.
Rules for each item:
- candidateId: the candidate's id when you pick one, otherwise "".
- For web finds: url is the https registration or product page you actually opened or saw in results, never a guess. title is the event or product name. detail is one line (date and place, or what it is). price is one amount as shown on the page for the option you suggest (like "$55"), or "" if unknown. startsAt is the event start as an ISO date, "" for products.
- why: one friendly sentence (max 18 words) tying it to their activity, like "You ran three times this week and this half is five weeks out."
- Never mention weight, bodies, health or performance judgements. Do not assume gender, age or sizes; prefer unisex gear.
- Fit their measured level (level_detail, computed from their synced workouts; it beats the self-reported activeDays): a "new" or "building" runner gets a 5k or a beginner group, not a half marathon; gear matches the activity they actually do most.
- If easy_week is true, nothing hard this week: events at least 2 weeks out, and recovery-friendly gear is fine. Never say why.
- Return fewer items rather than weak ones.`,
  });
  return out.items ?? [];
}

/**
 * Regenerates suggestions (about 30 s with web search). Claims a one-minute slot first so double clicks
 * and parallel tabs do not start a second paid Muse call.
 */
export async function refreshActions(userId: number, near?: {lat: number; lng: number}): Promise<MuseActionsPayload> {
  const claimed = await sql`
    insert into activity_profiles (user_id, muse_actions_at) values (${userId}, now())
    on conflict (user_id) do update set muse_actions_at = now()
    where activity_profiles.muse_actions_at is null or activity_profiles.muse_actions_at < now() - interval '1 minute'
    returning user_id`;
  if (!claimed[0]) return listActions(userId);
  const [context, tags, [profile], home] = await Promise.all([museContext(userId), getUserTags(userId), sql`select primary_goal, weekly_active_days from activity_profiles where user_id = ${userId}`, city(userId)]);
  // Coordinates are rounded to 0.1° (about 11 km) before they go anywhere.
  const where = home ?? (near ? `latitude ${near.lat.toFixed(1)}, longitude ${near.lng.toFixed(1)}` : null);
  const candidates = await localCandidates(userId, tags);
  let items: CleanAction[] | null = null;
  if (museConfigured()) {
    try {
      items = cleanActions(await askMuse({...context, tags, goal: profile?.primary_goal ?? null, activeDays: profile?.weekly_active_days ?? null}, where, candidates), candidates);
    } catch (err) {
      console.error('muse actions failed', err);
    }
  }
  const museOffline = items === null;
  items ??= fallbackActions(candidates);
  for (const a of items) {
    await sql`insert into muse_actions (user_id, kind, title, detail, why, price, url, image_url, starts_at, event_id, listing_id, dedupe_key)
      values (${userId}, ${a.kind}, ${a.title}, ${a.detail}, ${a.why}, ${a.price}, ${a.url}, ${a.imageUrl}, ${a.startsAt}, ${a.eventId}, ${a.listingId}, ${a.dedupeKey})
      on conflict (user_id, dedupe_key) do update set title = excluded.title, detail = excluded.detail, why = excluded.why, price = excluded.price, url = excluded.url, starts_at = excluded.starts_at
      where muse_actions.status = 'suggested'`;
  }
  // Replace older untouched suggestions; done and dismissed rows stay so they are never suggested again.
  if (items.length) await sql`delete from muse_actions where user_id = ${userId} and status = 'suggested' and dedupe_key <> all(${items.map(a => a.dedupeKey)}::text[])`;
  return {...(await listActions(userId)), museOffline};
}

/**
 * Register / Buy (simulated) or "Not now". Idempotent: only a 'suggested' row changes, so a repeated
 * click returns the first confirmation instead of registering twice.
 */
export async function actOnAction(userId: number, id: number, action: 'do' | 'dismiss'): Promise<MuseAction | null> {
  const confirmation = action === 'do' ? `MUSE-${crypto.randomUUID().slice(0, 6).toUpperCase()}` : null;
  const [changed] = await sql`
    update muse_actions set status = ${action === 'do' ? 'done' : 'dismissed'}, confirmation = ${confirmation}, acted_at = now()
    where id = ${id} and user_id = ${userId} and status = 'suggested' returning *`;
  if (!changed) {
    const [existing] = await sql`select * from muse_actions where id = ${id} and user_id = ${userId}`;
    return existing ? mapAction(existing) : null;
  }
  if (action === 'do' && changed.event_id) {
    const inserted = await sql`
      insert into event_rsvps (event_id, user_id, status) values (${changed.event_id}, ${userId}, 'going')
      on conflict (event_id, user_id) do update set status = 'going'
      returning (xmax = 0) as is_new`;
    if (inserted[0]?.is_new) await sql`update events set interested_count = interested_count + 1 where id = ${changed.event_id}`;
  }
  return mapAction(changed);
}
