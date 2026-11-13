import {AUDIENCES, CATEGORIES, type Answer, type Audience, type Category, type ShareLevel} from '@/lib/activities/types';
import type {PolicyMatrix} from '@/lib/activities/policies';

export const CATEGORY_LABEL: Record<Category, string> = {
  workouts: 'Workouts',
  steps: 'Steps',
  heart: 'Heart rate & recovery',
  sleep: 'Sleep',
  body: 'Body',
  location: 'Location & routes',
};

export const CATEGORY_EXAMPLE: Record<Category, string> = {
  workouts: 'type, distance, duration, pace',
  steps: 'daily totals, active minutes',
  heart: 'avg HR, HRV, readiness, strain',
  sleep: 'duration, stages',
  body: 'weight, body fat',
  location: 'GPS tracks, start/end points',
};

export const AUDIENCE_LABEL: Record<Audience, string> = {
  only_me: 'Only me',
  game_participants: 'Games I join',
  friends: 'Friends',
  mentor_match: 'A few months ahead',
  public: 'Public',
};

export const LEVEL_LABEL: Record<ShareLevel, string> = {
  exact: 'Exact',
  rounded: 'Rounded',
  boolean: 'Yes / no',
  muse_only: 'Muse-only',
  none: 'Nothing',
};

export const LEVEL_HELP: Record<ShareLevel, string> = {
  exact: '5.21 km',
  rounded: '"about 5 km", "3-4 workouts"',
  boolean: '"completed a run today"',
  muse_only: 'used for your plan, never stated',
  none: 'not shared at all',
};

const AUD_SHORT: Record<Audience, string> = {only_me: 'you', game_participants: 'games', friends: 'friends', mentor_match: 'people a few months ahead', public: 'public'};

/** One deterministic line per category for the privacy step / Muse page (§4 step 4). */
export function categorySummary(matrix: PolicyMatrix, category: Category): string {
  const row = matrix[category];
  if (row.only_me === 'none') return 'Not imported. Never enters your Muse.';
  const parts: string[] = [];
  for (const a of AUDIENCES) {
    if (a === 'only_me') continue;
    const lvl = row[a];
    if (lvl === 'none') continue;
    parts.push(`${AUD_SHORT[a]}: ${LEVEL_LABEL[lvl].toLowerCase()}`);
  }
  if (!parts.length) return 'Only you. Your Muse never shares this with anyone.';
  if (parts.every(p => p.endsWith('muse-only'))) return 'Muse-only. Used for your own plan and handicap, never stated to anyone.';
  const hidden = AUDIENCES.filter(a => a !== 'only_me' && row[a] === 'none').map(a => AUD_SHORT[a]);
  return parts.join(', ') + (hidden.length ? `. Nothing to ${hidden.join(', ')}.` : '.');
}

export type MuseSummary = {headline: string; shares: string[]; secrets: string[]; nobody: string};

/** Plain-language "Meet your Muse" card, generated from the saved policies (§4 step 5). */
export function museSummary(matrix: PolicyMatrix, opts: {sources?: string[]; tags?: string[]} = {}): MuseSummary {
  const shares: string[] = [];
  const secrets: string[] = [];
  const nobody: string[] = [];
  for (const c of CATEGORIES) {
    const row = matrix[c];
    if (row.only_me === 'none') {
      nobody.push(CATEGORY_LABEL[c].toLowerCase() + ' (not imported)');
      continue;
    }
    const others = AUDIENCES.filter(a => a !== 'only_me');
    const visible = others.filter(a => row[a] === 'exact' || row[a] === 'rounded' || row[a] === 'boolean');
    if (visible.length) {
      shares.push(`${visible.map(a => AUDIENCE_LABEL[a]).join(' and ')} see ${describeLevels(row, visible, c)}.`);
    } else if (others.some(a => row[a] === 'muse_only')) {
      secrets.push(`${CATEGORY_LABEL[c]}: your Muse uses it for your plan and handicap, but never states it to anyone.`);
    } else {
      nobody.push(CATEGORY_LABEL[c].toLowerCase());
    }
  }
  if (matrix.location.only_me !== 'none') shares.push('Turf games see only the ground you claim inside the arena, never your route, and only while a game you accepted is running.');
  const headline = opts.sources?.length
    ? `Your Muse learns from ${opts.sources.join(', ')} and keeps the raw data in your vault.`
    : 'Your Muse keeps everything you log in a private vault. Nothing raw ever leaves it.';
  return {
    headline,
    shares,
    secrets,
    nobody: nobody.length ? `Nobody sees: ${nobody.join(', ')}.` : 'Everything above has at least one audience.',
  };
}

function describeLevels(row: Record<Audience, ShareLevel>, visible: Audience[], c: Category): string {
  const lvl = visible.map(a => row[a]);
  const best = lvl.includes('exact') ? 'exact' : lvl.includes('rounded') ? 'rounded' : 'boolean';
  if (c === 'workouts') return best === 'exact' ? 'your exact workouts' : best === 'rounded' ? 'workout type and rounded distance' : 'only whether you completed a move';
  if (c === 'steps') return best === 'exact' ? 'your exact steps' : best === 'rounded' ? 'steps rounded to the nearest thousand' : 'only whether you hit your step goal';
  if (c === 'heart') return best === 'exact' ? 'your exact heart rate' : best === 'rounded' ? 'your heart rate rounded to the tens' : 'only whether you trained hard';
  if (c === 'sleep') return best === 'exact' ? 'your exact sleep' : best === 'rounded' ? 'sleep rounded to the hour' : 'only whether you slept 7h+';
  if (c === 'body') return 'body metrics at ' + LEVEL_LABEL[best].toLowerCase() + ' precision';
  return 'claimed cells, never routes';
}

/** Plain-language rendering of an Answer for previews and the audit log (server-safe). */
export function describeAnswer(a: Answer): string {
  if (a.withheld) return a.level === 'muse_only' ? 'Withheld: Muse-only. Your Muse used it for your plan but says nothing.' : 'Withheld: not shared with this audience.';
  if (a.value === null) return 'No data in your vault yet for this question.';
  if (typeof a.value === 'boolean') return a.value ? 'Yes' : 'No';
  return String(a.value);
}
