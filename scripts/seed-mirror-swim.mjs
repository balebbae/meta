// Adds a few dance and swimming Reels from Pixabay so "Challenge the GC" can start Mirror Match and swim crossings.
// Usage: node --env-file=.env.local scripts/seed-mirror-swim.mjs   (run `pnpm db:setup` first for the new tables)
// Yoga uses the existing yoga/stretching Reels. Safe to re-run: rows are skipped by Pixabay id.
import {neon} from '@neondatabase/serverless';

if (!process.env.DATABASE_URL || !process.env.PIXABAY_API_KEY) throw new Error('DATABASE_URL and PIXABAY_API_KEY are required');
const sql = neon(process.env.DATABASE_URL);

const WANT = [
  {q: 'dance', setting: 'studio', tags: ['dance', 'choreography', 'cardio'], exercises: [{name: 'Dance combo', seconds: 15}], caption: 'Learn this dance combo with your crew #dance #choreo', n: 3},
  {q: 'swimming pool', setting: 'pool', tags: ['swimming', 'pool', 'cardio'], exercises: [{name: 'Freestyle laps', seconds: 600}], caption: 'Freestyle laps: who can swim the most this week? #swim', n: 2},
];

for (const w of WANT) {
  const res = await fetch(`https://pixabay.com/api/videos/?key=${process.env.PIXABAY_API_KEY}&q=${encodeURIComponent(w.q)}&video_type=film&per_page=50&safesearch=true&order=popular`);
  if (!res.ok) throw new Error(`pixabay ${res.status}`);
  const portrait = h => (h.videos.medium.height > h.videos.medium.width ? 1 : 0);
  const hits = ((await res.json()).hits ?? []).filter(h => !h.isAiGenerated && h.duration >= 8 && h.duration <= 40).sort((a, b) => portrait(b) - portrait(a));
  let added = 0;
  for (const h of hits) {
    if (added >= w.n) break;
    const f = h.videos.small?.url ? h.videos.small : h.videos.tiny;
    const rows = await sql`
      insert into reels (pexels_id, video_url, poster_url, duration_sec, width, height, creator_name, creator_url, source_url, slug, caption, transcript, synthetic, is_fitness, exercises, difficulty, equipment, setting, tags, confidence)
      values (${h.id}, ${f.url}, ${f.thumbnail}, ${h.duration}, ${f.width}, ${f.height}, ${h.user}, ${h.userURL}, ${h.pageURL}, ${w.q.replace(/\s+/g, '-')}, ${w.caption}, '', true, true, ${JSON.stringify(w.exercises)}::jsonb, 'easy', '{}'::text[], ${w.setting}, ${w.tags}::text[], 0.8)
      on conflict (pexels_id) do nothing returning id`;
    if (rows.length) {
      added++;
      console.log(`${w.q}: reel ${rows[0].id} (${f.width}x${f.height}, ${h.duration}s)`);
    }
  }
}
