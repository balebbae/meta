/**
 * Vault record linkage (plan 5f): is a newly stored workout the same outing as one already in the vault, and how are
 * the copies merged. Pure, no DB; vault.ts does the writes. Tests: vault-link.test.ts.
 */
import {TRUST_RANK, type EventKind, type RawEvent} from './types.ts';

export type LinkEvent = Pick<RawEvent, 'kind' | 'startedAt' | 'endedAt' | 'distanceKm' | 'durationMin' | 'steps' | 'avgHr' | 'trust'> & {id: number};
export type MergeFields = Partial<Pick<RawEvent, 'distanceKm' | 'durationMin' | 'steps' | 'avgHr'>>;

/** Score at or above which two events are the same outing. */
export const LINK_MIN = 0.7;
const ON_FOOT = new Set<EventKind>(['walk', 'run', 'other']);
const FIELDS = ['distanceKm', 'durationMin', 'steps', 'avgHr'] as const;

/** Same kind, or both on foot / unlabelled: a watch's "walk" is often a phone's "run" or a manual "other". */
export const compatibleKinds = (a: EventKind, b: EventKind) => a === b || (ON_FOOT.has(a) && ON_FOOT.has(b));

function span(e: LinkEvent): [number, number] {
  const s = new Date(e.startedAt).getTime();
  return [s, e.endedAt ? new Date(e.endedAt).getTime() : s + (e.durationMin ?? 30) * 60_000];
}

/** smaller / larger, or 1 when either side is unknown (missing data neither confirms nor rules out a match). */
const similar = (x?: number, y?: number) => (x && y ? Math.min(x, y) / Math.max(x, y) : 1);

/**
 * 0..1: time overlap (share of the shorter event) x duration similarity x distance similarity.
 * 0 for incompatible kinds or less than half overlap.
 */
export function linkScore(a: LinkEvent, b: LinkEvent): number {
  if (!compatibleKinds(a.kind, b.kind)) return 0;
  const [as, ae] = span(a);
  const [bs, be] = span(b);
  const overlap = Math.max(0, Math.min(ae, be) - Math.max(as, bs)) / Math.max(1, Math.min(ae - as, be - bs));
  if (overlap < 0.5) return 0;
  return overlap * similar(ae - as, be - bs) * similar(a.distanceKm, b.distanceKm);
}

/**
 * Which linked copy stays primary and which fields it takes from the others. The highest trust wins (existing rows win
 * ties, so re-syncs don't flip the primary). The primary keeps every value it has and only fills gaps, and only from
 * copies of at least its own trust, so a lower-trust number never ends up under a higher-trust label.
 */
export function planMerge(added: LinkEvent, existing: LinkEvent[]): {primary: LinkEvent; duplicates: LinkEvent[]; patch: MergeFields} {
  const group = [...existing.filter(c => c.id !== added.id && linkScore(added, c) >= LINK_MIN), added];
  const primary = group.reduce((best, c) => (TRUST_RANK[c.trust] > TRUST_RANK[best.trust] ? c : best));
  const duplicates = group.filter(c => c !== primary);
  const patch: MergeFields = {};
  for (const d of [...duplicates].sort((x, y) => TRUST_RANK[y.trust] - TRUST_RANK[x.trust])) {
    if (TRUST_RANK[d.trust] < TRUST_RANK[primary.trust]) break;
    for (const f of FIELDS) if (primary[f] == null && patch[f] == null && d[f] != null) patch[f] = d[f];
  }
  return {primary, duplicates, patch};
}
