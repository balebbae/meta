import {sql} from '@/lib/db';

export type ReelExercise = {name: string; reps?: number | null; seconds?: number | null};

/** A clip from the demo Reel library (spec §16.2). `pexelsId` holds the Pixabay id. */
export type Reel = {
  id: number;
  pexelsId: number | null;
  videoUrl: string;
  posterUrl: string | null;
  durationSec: number | null;
  width: number | null;
  height: number | null;
  creatorName: string | null;
  creatorUrl: string | null;
  sourceUrl: string | null;
  slug: string | null;
  caption: string | null;
  transcript: string | null;
  synthetic: boolean;
  exercises: ReelExercise[];
  difficulty: 'easy' | 'medium' | 'hard' | null;
  equipment: string[];
  setting: string | null;
  tags: string[];
  confidence: number | null;
  plays: number;
  /** Quests started from this Reel ("played by N squads"); shown only when > 0. */
  squads: number;
  attribution: string;
};

const SELECT = () => sql`
  select r.id, r.pexels_id, r.video_url, r.poster_url, r.duration_sec, r.width, r.height, r.creator_name, r.creator_url, r.source_url, r.slug,
         r.caption, r.transcript, r.synthetic, r.exercises, r.difficulty, r.equipment, r.setting, r.tags, r.confidence, r.plays, r.created_at,
         (select count(*)::int from quests q where q.reel_id = r.id) as squads
  from reels r`;

function mapReel(r: Record<string, unknown>): Reel {
  const creator = (r.creator_name as string | null) ?? null;
  return {
    id: Number(r.id),
    pexelsId: r.pexels_id == null ? null : Number(r.pexels_id),
    videoUrl: String(r.video_url),
    posterUrl: (r.poster_url as string | null) ?? null,
    durationSec: r.duration_sec == null ? null : Number(r.duration_sec),
    width: r.width == null ? null : Number(r.width),
    height: r.height == null ? null : Number(r.height),
    creatorName: creator,
    creatorUrl: (r.creator_url as string | null) ?? null,
    sourceUrl: (r.source_url as string | null) ?? null,
    slug: (r.slug as string | null) ?? null,
    caption: (r.caption as string | null) ?? null,
    transcript: (r.transcript as string | null) ?? null,
    synthetic: Boolean(r.synthetic),
    exercises: Array.isArray(r.exercises) ? (r.exercises as ReelExercise[]) : [],
    difficulty: (r.difficulty as Reel['difficulty']) ?? null,
    equipment: (r.equipment as string[] | null) ?? [],
    setting: (r.setting as string | null) ?? null,
    tags: (r.tags as string[] | null) ?? [],
    confidence: r.confidence == null ? null : Number(r.confidence),
    plays: Number(r.plays ?? 0),
    squads: Number(r.squads ?? 0),
    attribution: creator ? `Video by ${creator} on Pixabay` : 'Video on Pixabay',
  };
}

export type ListReelsOptions = {tag?: string; after?: number; limit?: number};

/** Newest-first page of fitness Reels. `after` is the last id of the previous page (keyset). */
export async function listReels(opts: ListReelsOptions = {}): Promise<Reel[]> {
  const limit = Math.min(50, Math.max(1, opts.limit ?? 20));
  const tag = opts.tag?.trim().toLowerCase();
  const rows = tag
    ? opts.after
      ? await sql`${SELECT()} where r.is_fitness and r.id < ${opts.after} and exists (select 1 from unnest(r.tags) t where lower(t) = ${tag}) order by r.id desc limit ${limit}`
      : await sql`${SELECT()} where r.is_fitness and exists (select 1 from unnest(r.tags) t where lower(t) = ${tag}) order by r.id desc limit ${limit}`
    : opts.after
      ? await sql`${SELECT()} where r.is_fitness and r.id < ${opts.after} order by r.id desc limit ${limit}`
      : await sql`${SELECT()} where r.is_fitness order by r.id desc limit ${limit}`;
  return rows.map(mapReel);
}

export async function getReel(id: number): Promise<Reel | null> {
  const rows = await sql`${SELECT()} where r.id = ${id}`;
  return rows[0] ? mapReel(rows[0]) : null;
}


export async function recordPlay(id: number): Promise<number | null> {
  const rows = await sql`update reels set plays = plays + 1 where id = ${id} returning plays`;
  return rows[0] ? Number(rows[0].plays) : null;
}

// ---- General "For you" Reels (feed_reels) ------------------------------------------------------
// Same shape as a fitness Reel so one viewer renders both; the fitness-only fields stay empty.

const FEED_SELECT = () => sql`
  select id, pixabay_id, video_url, poster_url, duration_sec, width, height, creator_name, creator_url, source_url, caption, tags, plays
  from feed_reels`;

function mapFeedReel(r: Record<string, unknown>): Reel {
  return mapReel({...r, pexels_id: r.pixabay_id, slug: null, transcript: null, synthetic: false, exercises: [], difficulty: null, equipment: [], setting: null, confidence: null, squads: 0});
}

/** Newest-first page of general Reels; [] when the table isn't there yet so /reels still renders. */
export async function listFeedReels(opts: {after?: number; limit?: number} = {}): Promise<Reel[]> {
  const limit = Math.min(50, Math.max(1, opts.limit ?? 20));
  try {
    const rows = opts.after ? await sql`${FEED_SELECT()} where id < ${opts.after} order by id desc limit ${limit}` : await sql`${FEED_SELECT()} order by id desc limit ${limit}`;
    return rows.map(mapFeedReel);
  } catch (err) {
    console.error('[reels] feed_reels unavailable', err instanceof Error ? err.message : err);
    return [];
  }
}

export async function getFeedReel(id: number): Promise<Reel | null> {
  const rows = await sql`${FEED_SELECT()} where id = ${id}`.catch(() => []);
  return rows[0] ? mapFeedReel(rows[0]) : null;
}

export async function recordFeedPlay(id: number): Promise<void> {
  await sql`update feed_reels set plays = plays + 1 where id = ${id}`;
}

