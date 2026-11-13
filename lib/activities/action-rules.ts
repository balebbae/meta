/** Pure rules for Muse action items (no DB, no network) so they can run under `node --test`. */

export type ActionKind = 'event' | 'buy';

/** What Muse returns per item. candidateId is '' for things it found on the web. */
export type RawAction = {kind: string; title: string; detail: string; price: string; url: string; startsAt: string; why: string; candidateId: string};

/** An in-app event or Marketplace listing Muse may pick, referenced as `event:12` / `listing:5`. */
export type Candidate = {candidateId: string; kind: ActionKind; title: string; detail: string; price: string | null; url: string; imageUrl: string | null; startsAt: string | null; eventId: number | null; listingId: number | null};

export type CleanAction = {kind: ActionKind; title: string; detail: string; why: string; price: string | null; url: string; imageUrl: string | null; startsAt: string | null; eventId: number | null; listingId: number | null; dedupeKey: string};

export const MAX_PER_KIND = 3;

const clip = (s: unknown, max: number) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, max) : '');

/** Pages list several prices ("$180 half, $200 full"); keep the first amount so the card and receipt stay short. */
function onePrice(raw: unknown): string | null {
  const text = clip(raw, 80);
  return /\$\d[\d,]*(\.\d\d)?/.exec(text)?.[0].replace(/\.00$/, '') ?? (/\bfree\b/i.test(text) ? 'Free' : null);
}

const TRACKING = /^(utm_|cm_|irclickid$|irgwc$|afsrc$|gclid$|fbclid$|msclkid$)/i;

/** Only https pages; the fragment and ad-tracking parameters are dropped. Anything else (javascript:, http:, relative) is rejected. */
export function safeUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== 'https:' || !u.hostname.includes('.')) return null;
    u.hash = '';
    for (const key of [...u.searchParams.keys()]) if (TRACKING.test(key)) u.searchParams.delete(key);
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Model output is untrusted: keep only items that are either one of our own candidates (ids, links and
 * images then come from our rows, not from the model) or a web find with an https link and, for events,
 * a date that is not in the past. Deduped, at most MAX_PER_KIND of each kind.
 */
export function cleanActions(raw: RawAction[], candidates: Candidate[], now: Date = new Date()): CleanAction[] {
  const byId = new Map(candidates.map(c => [c.candidateId, c]));
  const seen = new Set<string>();
  const count: Record<ActionKind, number> = {event: 0, buy: 0};
  const out: CleanAction[] = [];
  for (const r of Array.isArray(raw) ? raw : []) {
    if (r?.kind !== 'event' && r?.kind !== 'buy') continue;
    const kind: ActionKind = r.kind;
    const why = clip(r.why, 200);
    let item: CleanAction;
    const cid = clip(r.candidateId, 40);
    if (cid) {
      const c = byId.get(cid);
      if (!c || c.kind !== kind) continue;
      item = {kind, title: c.title, detail: c.detail, why, price: c.price, url: c.url, imageUrl: c.imageUrl, startsAt: c.startsAt, eventId: c.eventId, listingId: c.listingId, dedupeKey: cid};
    } else {
      const title = clip(r.title, 120);
      const url = safeUrl(typeof r.url === 'string' ? r.url : '');
      if (!title || !url) continue;
      // A bare date is read as noon UTC so it shows as the same calendar day in the Americas and Europe.
      const when = r.startsAt ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(r.startsAt) ? `${r.startsAt}T12:00:00Z` : r.startsAt) : null;
      const startsAt = when && !Number.isNaN(when.getTime()) ? when : null;
      if (kind === 'event' && startsAt && startsAt.getTime() < now.getTime()) continue;
      const u = new URL(url);
      item = {kind, title, detail: clip(r.detail, 240), why, price: onePrice(r.price), url, imageUrl: null, startsAt: kind === 'event' && startsAt ? startsAt.toISOString() : null, eventId: null, listingId: null, dedupeKey: `${kind}:${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/$/, '')}`.toLowerCase()};
    }
    if (seen.has(item.dedupeKey) || count[kind] >= MAX_PER_KIND) continue;
    seen.add(item.dedupeKey);
    count[kind]++;
    out.push(item);
  }
  return out;
}

/** Muse offline: the same candidates, with a template reason. */
export function fallbackActions(candidates: Candidate[]): CleanAction[] {
  const raw = candidates.map(c => ({kind: c.kind, title: '', detail: '', price: '', url: '', startsAt: '', candidateId: c.candidateId, why: c.kind === 'event' ? 'Coming up soon, and it fits what you do.' : 'Gear that fits what you do.'}));
  return cleanActions(raw, candidates);
}
