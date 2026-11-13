/**
 * Small-group privacy helpers (plan §5a). Pure (no DB) so they're testable with node --test.
 */

/** Tag visibilities a friend may see; only_me / muse_only never leave the owner. */
export const FRIEND_VISIBLE = ['public', 'friends'];

/** A friend's tags as Discover may use them: confirmed and shared with friends. */
export function friendVisibleTags(rows: {tag: string; visibility: string; confirmed: boolean}[]): string[] {
  return rows.filter(r => r.confirmed && FRIEND_VISIBLE.includes(r.visibility)).map(r => r.tag);
}

/**
 * Mentor cards only appear when at least this many people match, so one card can't single someone out.
 * 3 suits the demo's small seeded pool (6 mentors); raise it (e.g. to 5) once the real pool is larger.
 */
export const MENTOR_K = 3;

/**
 * Coarsen a free-text record value ("29:10", "135 lb", "4") into a band ("28–30 min", "100–150 lb", "4–6").
 * Returns null when there is no number to band, so the raw text is never shown.
 */
export function bandValue(raw: string | null | undefined): string | null {
  const s = String(raw ?? '').trim();
  const time = s.match(/^(?:(\d+):)?(\d{1,2}):(\d{2})\b/);
  if (time) {
    const min = Number(time[1] ?? 0) * 60 + Number(time[2]) + Number(time[3]) / 60;
    const step = min < 60 ? 2 : 10;
    const lo = Math.floor(min / step) * step;
    return `${lo}–${lo + step} min`;
  }
  const num = s.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  if (!num) return null;
  const x = Number(num[1]);
  const step = x < 10 ? 2 : 10 ** Math.floor(Math.log10(x)) / 2;
  const lo = Math.floor(x / step) * step;
  const unit = num[2].trim().slice(0, 12);
  return `${lo}–${lo + step}${unit ? ` ${unit}` : ''}`;
}

const XP_BANDS = [1, 25, 50, 100, 250, 500, 1000];

/** Leaderboard XP for someone other than the viewer: a band, not the exact total. */
export function xpBand(xp: number): string {
  if (xp <= 0) return '0';
  const i = XP_BANDS.findLastIndex(b => xp >= b);
  return i === XP_BANDS.length - 1 ? `${XP_BANDS[i]}+` : `${XP_BANDS[i]}–${XP_BANDS[i + 1] - 1}`;
}
