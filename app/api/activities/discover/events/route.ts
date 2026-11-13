import {NextResponse} from 'next/server';
import {badRequest, readJson, withUser} from '@/lib/api';
import {sql} from '@/lib/db';
import type {DiscoverCard} from '@/lib/activities/discover';

const KINDS: DiscoverCard['kind'][] = ['invite', 'game', 'event', 'start', 'friend', 'group', 'mentor', 'reel'];
const EVENTS = ['impression', 'click', 'dismiss'];
type Ev = {cardId: string; cardType: string; tag: string | null; event: string};

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 400;
// shortcut: per-instance counter, so on serverless the real cap is MAX_PER_WINDOW x warm instances; move to a shared store if abused.
const recent = new Map<number, {n: number; at: number}>();

/** POST {events: [{cardId, cardType, tag, event}]}: Discover impressions (batched per load), clicks, dismisses. */
export async function POST(req: Request) {
  return withUser(async user => {
    const body = await readJson<{events?: unknown}>(req);
    const raw = Array.isArray(body?.events) ? (body.events as Partial<Ev>[]) : [];
    if (!raw.length || raw.length > 100) return badRequest('events: 1-100 items');
    const events = raw.filter(
      (e): e is Ev =>
        typeof e?.cardId === 'string' && e.cardId.length <= 80 && KINDS.includes(e.cardType as DiscoverCard['kind']) && EVENTS.includes(e.event as string) && (e.tag == null || (typeof e.tag === 'string' && e.tag.length <= 40)),
    );
    if (!events.length) return badRequest('No valid events');
    const now = Date.now();
    const r = recent.get(user.id);
    const n = r && now - r.at < WINDOW_MS ? r.n : 0;
    if (n + events.length > MAX_PER_WINDOW) return NextResponse.json({ok: true, ignored: events.length}, {status: 429});
    recent.set(user.id, {n: n + events.length, at: n ? r!.at : now});
    await sql`insert into discover_events (user_id, card_id, card_type, tag, event)
      select ${user.id}, * from unnest(${events.map(e => e.cardId)}::text[], ${events.map(e => e.cardType)}::text[], ${events.map(e => e.tag ?? null)}::text[], ${events.map(e => e.event)}::text[])`.catch(err => console.error('[discover] events not logged', err instanceof Error ? err.message : err));
    return NextResponse.json({ok: true, logged: events.length});
  });
}
