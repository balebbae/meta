// Seeds the demo Reel library (spec §16.2). Usage: node --env-file=.env.local scripts/seed-reels.mjs [--limit N] [--no-db]
//
// 1. Pixabay Videos API (PIXABAY_API_KEY) -> ~30 workout clips, portrait preferred. Without a key the
//    checked-in db/reels-fixture.json is used, so nothing at runtime ever depends on the key.
// 2. Tagging: 4 frames (10/35/60/85 %) extracted with ffmpeg + the slug -> Muse Ember vision (strict JSON
//    schema, max_output_tokens 2500 because reasoning tokens count against it); confidence < 0.6 retries with Spark; is_fitness=false drops the clip. A text-only Spark call
//    writes caption + transcript (synthetic=true). Without MODEL_API_KEY tags/exercises are derived from
//    the search query (confidence 0.5, synthetic=true) so the demo still works.
// 3. Upserts into `reels` on pexels_id (holds the Pixabay id) and rewrites db/seed-reels.sql for db:setup.
import {execFile} from 'node:child_process';
import {mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {promisify} from 'node:util';
import {neon} from '@neondatabase/serverless';
import OpenAI from 'openai';

const run = promisify(execFile);
const ROOT = new URL('../', import.meta.url);
const FIXTURE = new URL('db/reels-fixture.json', ROOT);
const SEED_SQL = new URL('db/seed-reels.sql', ROOT);
const args = process.argv.slice(2);
const LIMIT = Number(args[args.indexOf('--limit') + 1]) || 32;
const NO_DB = args.includes('--no-db');
const UA = {'User-Agent': 'meta-reels-seed/1.0 (+https://github.com/balebbae/meta)'};

// ---- 1. Source clips -----------------------------------------------------------------------------

/** Search terms with a fallback alias (Pixabay has no hits for some), plus the deterministic workout each maps to. */
const QUERIES = [
  {q: 'push ups', alt: 'pushup', exercises: [{name: 'Push-ups', reps: 12}], tags: ['push-ups', 'upper body', 'bodyweight', 'strength'], difficulty: 'medium', equipment: []},
  {q: 'squats', alt: 'squat workout', exercises: [{name: 'Squats', reps: 15}], tags: ['squats', 'legs', 'bodyweight', 'strength'], difficulty: 'easy', equipment: []},
  {q: 'plank', alt: 'plank exercise', exercises: [{name: 'Plank', seconds: 45}], tags: ['plank', 'core', 'bodyweight'], difficulty: 'easy', equipment: []},
  {q: 'burpees', alt: 'burpee', exercises: [{name: 'Burpees', reps: 10}], tags: ['burpees', 'full body', 'cardio', 'HIIT'], difficulty: 'hard', equipment: []},
  {q: 'lunges', alt: 'lunge exercise', exercises: [{name: 'Lunges', reps: 12}], tags: ['lunges', 'legs', 'bodyweight'], difficulty: 'easy', equipment: []},
  {q: 'jump rope', alt: 'skipping rope', exercises: [{name: 'Jump rope', seconds: 60}], tags: ['jump rope', 'cardio', 'coordination'], difficulty: 'medium', equipment: ['jump rope']},
  {q: 'kettlebell', alt: 'kettlebell swing', exercises: [{name: 'Kettlebell swings', reps: 15}], tags: ['kettlebell', 'strength', 'posterior chain'], difficulty: 'medium', equipment: ['kettlebell']},
  {q: 'yoga', alt: 'yoga flow', exercises: [{name: 'Downward dog', seconds: 30}, {name: 'Warrior II', seconds: 30}], tags: ['yoga', 'mobility', 'flow', 'chill'], difficulty: 'easy', equipment: ['yoga mat']},
  {q: 'running', alt: 'jogging', exercises: [{name: 'Easy run', seconds: 600}], tags: ['running', 'cardio', 'outdoors'], difficulty: 'medium', equipment: []},
  {q: 'mountain climbers', alt: 'mountain climber exercise', exercises: [{name: 'Mountain climbers', seconds: 30}], tags: ['mountain climbers', 'core', 'cardio', 'HIIT'], difficulty: 'medium', equipment: []},
  {q: 'dumbbell workout', alt: 'dumbbells', exercises: [{name: 'Dumbbell curls', reps: 12}, {name: 'Shoulder press', reps: 10}], tags: ['dumbbells', 'strength', 'upper body'], difficulty: 'medium', equipment: ['dumbbells']},
  {q: 'hiit', alt: 'interval training', exercises: [{name: 'High knees', seconds: 30}, {name: 'Jump squats', reps: 10}, {name: 'Burpees', reps: 8}], tags: ['HIIT', 'cardio', 'full body'], difficulty: 'hard', equipment: []},
  {q: 'stretching', alt: 'stretch exercise', exercises: [{name: 'Hamstring stretch', seconds: 30}, {name: 'Hip flexor stretch', seconds: 30}], tags: ['stretching', 'mobility', 'recovery', 'chill'], difficulty: 'easy', equipment: []},
  {q: 'abs workout', alt: 'sit ups', exercises: [{name: 'Sit-ups', reps: 15}, {name: 'Bicycle crunches', reps: 20}], tags: ['abs', 'core', 'bodyweight'], difficulty: 'medium', equipment: []},
  {q: 'boxing training', alt: 'boxing workout', exercises: [{name: 'Shadow boxing', seconds: 60}], tags: ['boxing', 'cardio', 'martial arts'], difficulty: 'medium', equipment: []},
  {q: 'pull ups', alt: 'pullup', exercises: [{name: 'Pull-ups', reps: 8}], tags: ['pull-ups', 'back', 'upper body', 'strength'], difficulty: 'hard', equipment: ['pull-up bar']},
  {q: 'jumping jacks', alt: 'star jumps', exercises: [{name: 'Jumping jacks', seconds: 45}], tags: ['jumping jacks', 'cardio', 'warm-up'], difficulty: 'easy', equipment: []},
];
/** Pixabay search is fuzzy ("plank" returns carpentry), so a clip must carry a strong fitness tag AND its query term. */
const FITNESS_WORDS = /workout|fitness|exercise|gym|training|athlete|yoga|crossfit|bodyweight|cardio|hiit|pilates|stretch|jogging|runner|kettlebell|dumbbell|burpee|push.?up|squat/i;
const AVOID = /\b(cat|dog|puppy|kitten|bird|motocross|motorcycle|skate|carpent|timber|wood|lake|snow|drone|aerial|city|car|food|coffee|baby|horse|ship|boat|climbing|rock)\b/i;
const termRe = spec => new RegExp(`${spec.q.replace(/s$/, '')}|${spec.alt.replace(/s$/, '')}`, 'i');

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

async function pixabay(q) {
  const key = process.env.PIXABAY_API_KEY;
  const url = `https://pixabay.com/api/videos/?key=${key}&q=${encodeURIComponent(q)}&video_type=film&per_page=100&safesearch=true&order=popular`;
  const res = await fetch(url, {headers: UA});
  if (!res.ok) throw new Error(`pixabay ${res.status} for ${q}`);
  return (await res.json()).hits ?? [];
}

/** Picks the smallest file that is still at least 540p (small), else tiny. */
function pickFile(hit) {
  const v = hit.videos;
  const f = v.small?.url && v.small.size < 12_000_000 ? v.small : v.tiny?.url ? v.tiny : v.medium;
  return f;
}

function toClip(hit, query) {
  const f = pickFile(hit);
  const tags = String(hit.tags ?? '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);
  return {
    pexels_id: hit.id,
    slug: slugify(hit.name || tags.slice(0, 3).join(' ') || query),
    query,
    source_url: hit.pageURL,
    video_url: f.url,
    poster_url: f.thumbnail,
    duration: hit.duration,
    width: f.width,
    height: f.height,
    creator_name: hit.user,
    creator_url: hit.userURL,
    source_tags: tags,
  };
}

async function fetchClips() {
  const seen = new Set();
  const out = [];
  const perQuery = Math.max(2, Math.ceil(LIMIT / QUERIES.length));
  for (const spec of QUERIES) {
    let hits = await pixabay(spec.q);
    if (hits.length < 3) hits = hits.concat(await pixabay(spec.alt));
    const scored = hits
      .filter(h => h.isGRated !== false && !h.isAiGenerated)
      .filter(h => FITNESS_WORDS.test(h.tags) && !AVOID.test(h.tags))
      .filter(h => h.duration >= 5 && h.duration <= 90)
      .map(h => {
        const portrait = h.videos.medium.height > h.videos.medium.width;
        return {h, score: (portrait ? 100 : 0) + (termRe(spec).test(h.tags) ? 50 : 0) + Math.min(40, Math.log10(1 + (h.likes ?? 0)) * 10)};
      })
      .sort((a, b) => b.score - a.score);
    let n = 0;
    for (const {h} of scored) {
      if (n >= perQuery) break;
      if (seen.has(h.id)) continue;
      seen.add(h.id);
      out.push(toClip(h, spec.q));
      n++;
    }
    console.log(`${spec.q}: ${hits.length} hits -> ${n} clips`);
  }
  return out.slice(0, LIMIT);
}

// ---- 2. Tagging ----------------------------------------------------------------------------------

const MODELS = {ember: 'muse-ember-1.0', spark: 'muse-spark-1.3'};
const museConfigured = () => Boolean(process.env.MODEL_API_KEY?.trim());
const muse = museConfigured() ? new OpenAI({apiKey: process.env.MODEL_API_KEY.trim(), baseURL: 'https://api.meta.ai/v1'}) : null;

const TAG_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['is_fitness', 'exercises', 'difficulty', 'equipment', 'setting', 'tags', 'confidence'],
  properties: {
    is_fitness: {type: 'boolean'},
    exercises: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'reps', 'seconds'],
        properties: {name: {type: 'string'}, reps: {type: ['integer', 'null']}, seconds: {type: ['integer', 'null']}},
      },
    },
    difficulty: {type: 'string', enum: ['easy', 'medium', 'hard']},
    equipment: {type: 'array', items: {type: 'string'}},
    setting: {type: 'string'},
    tags: {type: 'array', items: {type: 'string'}},
    confidence: {type: 'number'},
  },
};
const CAPTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['caption', 'transcript'],
  properties: {caption: {type: 'string'}, transcript: {type: 'string'}},
};

const TAG_RULES = `You tag short workout clips for a fitness app. Describe only what is visible in the frames. Name the exercises being performed and estimate a normal single set for an average adult: 8-20 reps for rep-based moves, 20-60 seconds for holds or cardio bursts (use reps OR seconds, never both; set the other to null). List only equipment that is visible. Never comment on the person's body, looks, age, weight or health. tags: 3-8 short lowercase tags (muscle group, movement, style). setting: one or two words (gym, home, outdoors, studio). confidence: 0-1, how sure you are about the exercises. is_fitness=false when the clip is not someone exercising.`;

async function extractFrames(clip, dir) {
  const file = join(dir, `${clip.pexels_id}.mp4`);
  const res = await fetch(clip.video_url, {headers: UA});
  if (!res.ok) throw new Error(`download ${res.status}`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  const frames = [];
  for (const pct of [0.1, 0.35, 0.6, 0.85]) {
    const out = join(dir, `${clip.pexels_id}-${pct}.jpg`);
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String((clip.duration * pct).toFixed(2)), '-i', file, '-frames:v', '1', '-vf', 'scale=512:-2', '-q:v', '5', out]);
    frames.push(`data:image/jpeg;base64,${readFileSync(out).toString('base64')}`);
  }
  return frames;
}

async function museTag(model, clip, frames) {
  const response = await muse.responses.create({
    model,
    reasoning: {effort: 'low'},
    max_output_tokens: 2500,
    input: [
      {
        role: 'user',
        content: [
          {type: 'input_text', text: `${TAG_RULES}\n\nClip slug: "${clip.slug}". Search query it was found with: "${clip.query}". Four evenly spaced frames follow.`},
          ...frames.map(url => ({type: 'input_image', image_url: url, detail: 'low'})),
        ],
      },
    ],
    text: {format: {type: 'json_schema', name: 'reel_tags', schema: TAG_SCHEMA, strict: true}},
  });
  if (!response.output_text) throw new Error('empty Muse response');
  return JSON.parse(response.output_text);
}

async function museCaption(clip, tagging) {
  const response = await muse.responses.create({
    model: MODELS.spark,
    reasoning: {effort: 'low'},
    max_output_tokens: 2000,
    input: `Write for a fitness Reel. Exercises: ${JSON.stringify(tagging.exercises)}. Tags: ${tagging.tags.join(', ')}. Difficulty: ${tagging.difficulty}. Equipment: ${tagging.equipment.join(', ') || 'none'}. Setting: ${tagging.setting}.
caption: one upbeat sentence (max 120 characters) a creator would post, plus 2-3 hashtags. transcript: 3-5 short spoken lines a trainer would say while demonstrating (form cues, breathing, count). Never mention anyone's body, weight, looks, age or health.`,
    text: {format: {type: 'json_schema', name: 'reel_caption', schema: CAPTION_SCHEMA, strict: true}},
  });
  if (!response.output_text) throw new Error('empty Muse response');
  return JSON.parse(response.output_text);
}

function fallbackTagging(clip) {
  const own = clip.source_tags.join(', ');
  const spec = QUERIES.find(s => termRe(s).test(own)) ?? QUERIES.find(s => s.q === clip.query) ?? QUERIES[0];
  const extra = clip.source_tags.filter(t => FITNESS_WORDS.test(t) && t.length <= 20).slice(0, 3);
  return {
    is_fitness: true,
    exercises: spec.exercises.map(e => ({name: e.name, reps: e.reps ?? null, seconds: e.seconds ?? null})),
    difficulty: spec.difficulty,
    equipment: spec.equipment,
    setting: /outdoor|beach|park|street|nature|forest/i.test(clip.source_tags.join(' ')) ? 'outdoors' : /gym/i.test(clip.source_tags.join(' ')) ? 'gym' : 'home',
    tags: Array.from(new Set([...spec.tags, ...extra].map(t => t.toLowerCase()))),
    confidence: 0.5,
  };
}

const fmtSet = e => (e.reps ? `${e.reps} ${e.name.toLowerCase()}` : `${e.seconds >= 120 ? Math.round(e.seconds / 60) + ' min' : e.seconds + ' s'} ${e.name.toLowerCase()}`);

function fallbackCaption(tagging) {
  const sets = tagging.exercises.map(fmtSet).join(', ');
  const gear = tagging.equipment.length ? `Grab ${tagging.equipment.join(' and ')}.` : 'No equipment needed.';
  const hashtags = tagging.tags.slice(0, 3).map(t => '#' + t.replace(/[^a-z0-9]/gi, '')).join(' ');
  return {
    caption: `One set, right now: ${sets}. ${gear} ${hashtags}`,
    transcript: `Okay, let's go. ${sets.charAt(0).toUpperCase() + sets.slice(1)}. Set up, brace your core, breathe out on the effort. Keep the pace steady, last few, and done. Tag your group chat and make them match it.`,
  };
}

async function tagClip(clip, dir) {
  if (!muse) return {...fallbackTagging(clip), ...fallbackCaption(fallbackTagging(clip)), synthetic: true, tagged_by: 'fallback'};
  try {
    const frames = await extractFrames(clip, dir);
    let tagging = await museTag(MODELS.ember, clip, frames);
    let by = 'ember';
    if (tagging.confidence < 0.6) {
      tagging = await museTag(MODELS.spark, clip, frames);
      by = 'spark';
    }
    if (!tagging.is_fitness) return null;
    tagging.exercises = tagging.exercises.map(e => ({name: e.name, reps: e.reps ? Math.min(20, Math.max(8, e.reps)) : null, seconds: e.seconds ? Math.min(600, Math.max(20, e.seconds)) : null}));
    const text = await museCaption(clip, tagging);
    return {...tagging, ...text, synthetic: true, tagged_by: by};
  } catch (err) {
    console.warn(`  muse failed for ${clip.slug}: ${err.message}; using fallback`);
    const t = fallbackTagging(clip);
    return {...t, ...fallbackCaption(t), synthetic: true, tagged_by: 'fallback'};
  }
}

// ---- 3. Persist ----------------------------------------------------------------------------------

const q = s => (s == null ? 'null' : `'${String(s).replace(/'/g, "''")}'`);
const arr = a => `array[${a.map(q).join(', ')}]::text[]`;
const COLS = 'pexels_id, video_url, poster_url, duration_sec, width, height, creator_name, creator_url, source_url, slug, caption, transcript, synthetic, is_fitness, exercises, difficulty, equipment, setting, tags, confidence';

function rowValues(r) {
  return [
    r.pexels_id,
    q(r.video_url),
    q(r.poster_url),
    r.duration ?? 'null',
    r.width ?? 'null',
    r.height ?? 'null',
    q(r.creator_name),
    q(r.creator_url),
    q(r.source_url),
    q(r.slug),
    q(r.caption),
    q(r.transcript),
    'true',
    'true',
    `${q(JSON.stringify(r.exercises))}::jsonb`,
    q(r.difficulty),
    r.equipment.length ? arr(r.equipment) : `'{}'::text[]`,
    q(r.setting),
    r.tags.length ? arr(r.tags) : `'{}'::text[]`,
    r.confidence,
  ].join(', ');
}

function writeSeedSql(rows) {
  const header = `-- Generated by scripts/seed-reels.mjs (${new Date().toISOString().slice(0, 10)}). Demo Reel library: Pixabay clips (credit "Video by <user> on Pixabay").\n-- Idempotent: each row is inserted only when its pexels_id (Pixabay id) is missing. One statement per line pair; db-setup splits on ";\\n".\n\n`;
  const body = rows.map(r => `insert into reels (${COLS})\nselect ${rowValues(r)}\nwhere not exists (select 1 from reels where pexels_id = ${r.pexels_id});\n`).join('\n');
  writeFileSync(SEED_SQL, header + body);
}

async function upsert(sql, rows) {
  for (const r of rows) {
    await sql`
      insert into reels (pexels_id, video_url, poster_url, duration_sec, width, height, creator_name, creator_url, source_url, slug, caption, transcript, synthetic, is_fitness, exercises, difficulty, equipment, setting, tags, confidence)
      values (${r.pexels_id}, ${r.video_url}, ${r.poster_url}, ${r.duration}, ${r.width}, ${r.height}, ${r.creator_name}, ${r.creator_url}, ${r.source_url}, ${r.slug}, ${r.caption}, ${r.transcript}, true, true, ${JSON.stringify(r.exercises)}::jsonb, ${r.difficulty}, ${r.equipment}::text[], ${r.setting}, ${r.tags}::text[], ${r.confidence})
      on conflict (pexels_id) do update set
        video_url = excluded.video_url, poster_url = excluded.poster_url, duration_sec = excluded.duration_sec, width = excluded.width, height = excluded.height,
        creator_name = excluded.creator_name, creator_url = excluded.creator_url, source_url = excluded.source_url, slug = excluded.slug,
        caption = excluded.caption, transcript = excluded.transcript, synthetic = excluded.synthetic, is_fitness = excluded.is_fitness, exercises = excluded.exercises,
        difficulty = excluded.difficulty, equipment = excluded.equipment, setting = excluded.setting, tags = excluded.tags, confidence = excluded.confidence`;
  }
}

// ---- main ----------------------------------------------------------------------------------------

let clips;
if (process.env.PIXABAY_API_KEY) {
  clips = await fetchClips();
  writeFileSync(FIXTURE, JSON.stringify(clips, null, 1) + '\n');
  console.log(`fetched ${clips.length} clips from Pixabay; fixture updated`);
} else {
  if (!existsSync(FIXTURE)) throw new Error('PIXABAY_API_KEY is not set and db/reels-fixture.json is missing');
  clips = JSON.parse(readFileSync(FIXTURE, 'utf8')).slice(0, LIMIT);
  console.log(`PIXABAY_API_KEY not set; using ${clips.length} clips from db/reels-fixture.json`);
}
console.log(museConfigured() ? 'MODEL_API_KEY set: tagging with Muse Ember/Spark' : 'MODEL_API_KEY not set: deterministic tags (confidence 0.5)');

const dir = mkdtempSync(join(tmpdir(), 'reels-'));
const rows = [];
try {
  for (const clip of clips) {
    const t = await tagClip(clip, dir);
    if (!t) {
      console.log(`  dropped ${clip.slug} (not fitness)`);
      continue;
    }
    rows.push({...clip, ...t});
    console.log(`  ${clip.slug}: ${t.exercises.map(fmtSet).join(', ')} [${t.difficulty}, ${t.tagged_by}, conf ${t.confidence}]`);
  }
} finally {
  rmSync(dir, {recursive: true, force: true});
}

writeSeedSql(rows);
console.log(`wrote db/seed-reels.sql (${rows.length} rows)`);
if (!NO_DB) {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  await upsert(neon(process.env.DATABASE_URL), rows);
  console.log(`upserted ${rows.length} reels`);
}
