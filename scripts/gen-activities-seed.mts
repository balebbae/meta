// Generates the idempotent Activities seed block (profiles, tags, demo-week vault events for users 1-6, 16-week history for the mentor demo).
// Run: node scripts/gen-activities-seed.mts >> db/seed.sql   (uses the same generator as the mock connector)
import {readFileSync, writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const src = readFileSync(new URL('../lib/activities/demo-week.ts', import.meta.url), 'utf8').replace(/import type .*\n/, '');
const tmp = new URL('../.demo-week.tmp.mts', import.meta.url);
writeFileSync(tmp, src);
const {generateDemoWeek, generateDemoHistory} = await import(pathToFileURL(tmp.pathname).href);
const now = new Date();
const q = (s: unknown) => (s == null ? 'null' : `'${String(s).replace(/'/g, "''")}'`);
const rel = (iso: string | undefined) => (iso ? `now() - interval '${Math.round((now.getTime() - new Date(iso).getTime()) / 60000)} minutes'` : 'null');
const out: string[] = ['', '-- ---- Activities (scope A): profiles, tags, demo week of vault events for users 1-6 (idempotent) ----'];
const profiles = [
  [1, '3-4', 'Be consistent', '{Mornings,Weekends}', 'friends'],
  [2, '5+', 'Train for an event', '{Mornings}', 'match'],
  [3, '1-2', 'Get started', '{Evenings}', 'friends'],
  [4, '3-4', 'Get stronger', '{Lunch,Evenings}', 'group'],
  [5, '1-2', 'Lose the phone and go outside', '{Weekends}', 'friends'],
  [6, '3-4', 'Get faster', '{Mornings,Evenings}', 'solo'],
];
out.push(`insert into activity_profiles (user_id, weekly_active_days, primary_goal, schedule, with_whom, onboarding_step)\nvalues ${profiles.map(p => `(${p[0]}, ${q(p[1])}, ${q(p[2])}, ${q(p[3])}::text[], ${q(p[4])}, 'done')`).join(',\n       ')}\non conflict (user_id) do nothing;`);
const tags: [number, string, string, string][] = [
  [1, 'Running', 'activity', 'friends'], [1, 'Lifting', 'activity', 'friends'], [1, 'Be consistent', 'goal', 'friends'], [1, 'Mornings', 'style', 'friends'], [1, 'Small group', 'style', 'friends'],
  [2, 'Running', 'activity', 'friends'], [2, 'Cycling', 'activity', 'friends'], [2, 'Train for an event', 'goal', 'friends'], [2, 'Competitive', 'style', 'friends'],
  [3, 'Walking', 'activity', 'friends'], [3, 'Yoga', 'activity', 'friends'], [3, 'Get started', 'goal', 'friends'], [3, 'Chill', 'style', 'friends'], [3, 'Bad knee, low impact', 'constraint', 'muse_only'],
  [4, 'Lifting', 'activity', 'friends'], [4, 'HIIT', 'activity', 'friends'], [4, 'Get stronger', 'goal', 'friends'], [4, 'Big group', 'style', 'friends'],
  [5, 'Hiking', 'activity', 'friends'], [5, 'Walking', 'activity', 'friends'], [5, 'Lose the phone and go outside', 'goal', 'friends'], [5, 'Weekends', 'style', 'friends'],
  [6, 'Running', 'activity', 'friends'], [6, 'Swimming', 'activity', 'friends'], [6, 'Get faster', 'goal', 'friends'], [6, 'Solo', 'style', 'friends'],
];
out.push(`insert into user_tags (user_id, tag, kind, origin, visibility, confirmed)\nvalues ${tags.map(t => `(${t[0]}, ${q(t[1])}, ${q(t[2])}, 'selected', ${q(t[3])}, true)`).join(',\n       ')}\non conflict (user_id, kind, tag) do nothing;`);
out.push(`-- Caleb (user 1): heart rate is Muse-only for every other audience so the live redaction demo (§14) works out of the box.\ninsert into share_policies (user_id, category, audience, level)\nvalues (1, 'heart', 'game_participants', 'muse_only'), (1, 'heart', 'friends', 'muse_only'), (1, 'heart', 'mentor_match', 'muse_only'), (1, 'heart', 'public', 'none'), (1, 'heart', 'only_me', 'exact')\non conflict (user_id, category, audience) do nothing;`);
out.push(`insert into connections (user_id, source, status, tokens, connected_at)\nvalues ${[1, 2, 3, 4, 5, 6].map(u => `(${u}, 'mock', 'connected', '{"device":"Demo watch","seeded":true}'::jsonb, now())`).join(', ')}\non conflict (user_id, source) do nothing;`);
function insertEvents(u: number, events: any[]) {
  const rows = events.map((e: any) => `(${u}, 'mock', ${q(e.externalId)}, ${q(e.kind)}, ${rel(e.startedAt)}, ${rel(e.endedAt)}, ${e.distanceKm ?? 'null::numeric'}, ${e.durationMin ?? 'null::numeric'}, ${e.steps ?? 'null::int'}, ${e.avgHr ?? 'null::int'}, 'device', 'normal')`);
  out.push(`insert into vault_events (user_id, source, external_id, kind, started_at, ended_at, distance_km, duration_min, steps, avg_hr, trust, display_scope)\nselect v.* from (values\n  ${rows.join(',\n  ')}\n) as v(user_id, source, external_id, kind, started_at, ended_at, distance_km, duration_min, steps, avg_hr, trust, display_scope)\nwhere not exists (select 1 from vault_events e where e.user_id = v.user_id and e.source = v.source and e.external_id = v.external_id);`);
}
for (let u = 1; u <= 6; u++) insertEvents(u, generateDemoWeek(u, 'mock', now));
out.push('-- ---- "A few months ahead": 15 more weeks of synthetic workout history for the seeker (1) and mentors (idempotent) ----');
for (let u = 1; u <= 12; u++) if (generateDemoHistory(u, 'mock', now).length) insertEvents(u, generateDemoHistory(u, 'mock', now));
process.stdout.write(out.join('\n\n') + '\n');
