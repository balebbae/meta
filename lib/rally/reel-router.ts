/**
 * "Challenge the GC" router: Muse Ember looks at the Reel (caption, tags, exercises) and decides which game it
 * becomes. dance / yoga -> Mirror Match, swim -> swim journey, run -> a paced Turf game, anything else -> the Rally boss fight.
 * Keyword rules (reel-kind.ts) decide when Muse is offline or unsure.
 */
import {sql} from '@/lib/db';
import {MODELS, museConfigured, museJson} from '@/lib/muse/client';
import {reelGameByText, type ReelGame} from '@/lib/rally/reel-kind';

export type ReelInfo = {
  id: number;
  caption: string;
  transcript: string;
  slug: string;
  tags: string[];
  exercises: {name: string; reps?: number | null; seconds?: number | null}[];
  durationSec: number | null;
  videoUrl: string;
};

export async function getReelInfo(reelId: number): Promise<ReelInfo | null> {
  const [r] = await sql`select id, caption, transcript, slug, tags, exercises, duration_sec, video_url from reels where id = ${reelId}`;
  if (!r) return null;
  return {
    id: Number(r.id),
    caption: String(r.caption ?? ''),
    transcript: String(r.transcript ?? ''),
    slug: String(r.slug ?? ''),
    tags: (r.tags as string[] | null) ?? [],
    exercises: Array.isArray(r.exercises) ? (r.exercises as ReelInfo['exercises']) : [],
    durationSec: r.duration_sec == null ? null : Number(r.duration_sec),
    videoUrl: String(r.video_url),
  };
}

const describe = (r: ReelInfo) => `${r.caption} ${r.slug.replace(/-/g, ' ')} ${r.tags.join(' ')} ${r.exercises.map(e => e.name).join(' ')}`;

const SCHEMA = {
  type: 'object',
  properties: {game: {type: 'string', enum: ['dance', 'yoga', 'swim', 'run', 'workout']}},
  required: ['game'],
  additionalProperties: false,
};

/** Ember picks the game; names are fixed (Mirror Yoga, Mirror Dance, Castle Crossing), so no title is asked for. */
export async function classifyReel(r: ReelInfo): Promise<{game: ReelGame; museUsed: boolean}> {
  const backup = reelGameByText(describe(r));
  if (!museConfigured()) return {game: backup, museUsed: false};
  try {
    const out = await museJson<{game: ReelGame}>({
      model: MODELS.ember,
      schemaName: 'reel_game',
      schema: SCHEMA,
      effort: 'minimal',
      input: `A friend sent this fitness Reel to their group chat. Decide which game it should become.
dance = choreography or a dance trend people copy move by move. yoga = yoga, stretching or a mobility flow of poses. swim = swimming. run = running or jogging outside (easy runs, tempo, intervals, a 5k). workout = anything else (strength, HIIT, core, treadmill circuits).
Reel caption: "${r.caption.slice(0, 300)}". Tags: ${r.tags.join(', ') || 'none'}. Exercises: ${r.exercises.map(e => e.name).join(', ') || 'none'}.`,
    });
    const game = (['dance', 'yoga', 'swim', 'run', 'workout'] as const).includes(out.game) ? out.game : backup;
    return {game, museUsed: true};
  } catch {
    return {game: backup, museUsed: false};
  }
}
