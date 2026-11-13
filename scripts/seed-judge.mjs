// Seeds (or resets) the judges' demo account and its three-friend crew without touching anyone else's data.
// Usage: pnpm db:seed-judge   (needs Node >= 22.18 for the .ts imports; run `pnpm db:setup` first)
// Then sign up once at /auth with JUDGE_EMAIL: ensureUserRow links the SuperTokens login to this row by email.
// Safe to re-run between judging slots: it wipes and rebuilds only these four users' rows.
import {neon} from '@neondatabase/serverless';
import {gridDisk, latLngToCell} from 'h3-js';
import {generateDemoWeek} from '../lib/activities/demo-week.ts';
import {colorAt} from '../lib/turf/colors.ts';
import {TURF_RES} from '../lib/turf/engine.ts';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const sql = neon(process.env.DATABASE_URL);
const JUDGE_EMAIL = process.env.JUDGE_EMAIL ?? 'judge@demo.com';
const DAY = 86_400_000;
const now = Date.now();
const ago = (days, hours = 0) => new Date(now - days * DAY - hours * 3_600_000).toISOString();

const PEOPLE = [
  {key: 'judge', name: 'Jordan Rivera', email: JUDGE_EMAIL, img: 68, bio: 'Hackathon judge. Trying to run my first 5K before New Year.'},
  {key: 'maya', name: 'Maya Chen', email: 'maya.crew@example.com', img: 44, bio: 'Morning runner, weekend climber.'},
  {key: 'leo', name: 'Leo Martinez', email: 'leo.crew@example.com', img: 15, bio: 'Lifting four days a week. Tacos after.'},
  {key: 'ava', name: 'Ava Thompson', email: 'ava.crew@example.com', img: 49, bio: 'Yoga + long walks on the Katy Trail.'},
];

const u = {};
for (const p of PEOPLE) {
  const [row] = await sql`
    insert into users (name, email, avatar_url, cover_url, bio, is_online)
    values (${p.name}, ${p.email}, ${`https://i.pravatar.cc/300?img=${p.img}`}, 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=1200&h=450&fit=crop&q=80', ${p.bio}, true)
    on conflict (email) do update set name = excluded.name, avatar_url = excluded.avatar_url, cover_url = excluded.cover_url, bio = excluded.bio
    returning id`;
  u[p.key] = Number(row.id);
}
const ids = Object.values(u);
const crew = [u.maya, u.leo, u.ava];

// ---- reset: every row that points at these four users (the users rows and the judge's login stay) ----
const fks = await sql`
  select tc.table_name t, kcu.column_name c from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu using (constraint_schema, constraint_name)
  join information_schema.constraint_column_usage ccu using (constraint_schema, constraint_name)
  where tc.constraint_type = 'FOREIGN KEY' and ccu.table_name = 'users' and ccu.column_name = 'id' and tc.table_name <> 'users'`;
// Some of these rows reference each other (quest_moves -> vault_events, games -> conversations), so retry until every delete lands.
let pending = fks;
for (let pass = 0; pending.length && pass < 6; pass++) {
  const failed = [];
  for (const fk of pending) {
    try {
      await sql.query(`delete from ${fk.t} where ${fk.c} = any($1::int[])`, [ids]);
    } catch {
      failed.push(fk);
    }
  }
  pending = failed;
}
if (pending.length) throw new Error(`could not reset: ${pending.map(f => `${f.t}.${f.c}`).join(', ')}`);

// ---- profile, friends, onboarding answers, privacy rules, device ----
await sql`insert into user_details (user_id, work, work_title, education, current_city, hometown) values (${u.judge}, 'Meta', 'Hackathon judge', 'The University of Texas at Dallas', 'Dallas, Texas', 'Austin, Texas') on conflict (user_id) do update set current_city = excluded.current_city`;
for (const [a, b] of [[u.judge, u.maya], [u.judge, u.leo], [u.judge, u.ava], [u.maya, u.leo], [u.maya, u.ava], [u.leo, u.ava]]) {
  await sql`insert into friendships (user_id, friend_id, status, created_at) values (${a}, ${b}, 'accepted', ${ago(40)}), (${b}, ${a}, 'accepted', ${ago(40)})`;
}
const profiles = [
  [u.judge, '3-4', 'Train for an event', ['Mornings', 'Weekends'], 'friends', 'Go easy on my left knee.'],
  [u.maya, '5+', 'Get faster', ['Mornings'], 'group', null],
  [u.leo, '3-4', 'Get stronger', ['Lunch', 'Evenings'], 'friends', null],
  [u.ava, '1-2', 'Be consistent', ['Weekends'], 'friends', null],
];
for (const [id, days, goal, schedule, withWhom, note] of profiles) {
  await sql`insert into activity_profiles (user_id, weekly_active_days, primary_goal, schedule, with_whom, go_easy_note, interest_suggestions_enabled, onboarding_step)
            values (${id}, ${days}, ${goal}, ${schedule}::text[], ${withWhom}, ${note}, true, 'done')`;
}
const tags = [
  [u.judge, 'Running', 'activity'], [u.judge, 'Walking', 'activity'], [u.judge, 'Yoga', 'activity'], [u.judge, 'Train for an event', 'goal'], [u.judge, 'Mornings', 'style'], [u.judge, 'Small group', 'style'],
  [u.maya, 'Running', 'activity'], [u.maya, 'Climbing', 'activity'], [u.maya, 'Get faster', 'goal'], [u.maya, 'Competitive', 'style'],
  [u.leo, 'Lifting', 'activity'], [u.leo, 'HIIT', 'activity'], [u.leo, 'Get stronger', 'goal'],
  [u.ava, 'Yoga', 'activity'], [u.ava, 'Walking', 'activity'], [u.ava, 'Be consistent', 'goal'], [u.ava, 'Chill', 'style'],
];
for (const [id, tag, kind] of tags) await sql`insert into user_tags (user_id, tag, kind, origin, visibility, confirmed) values (${id}, ${tag}, ${kind}, 'selected', 'friends', true) on conflict do nothing`;
await sql`insert into user_tags (user_id, tag, kind, origin, visibility, confirmed) values (${u.judge}, 'Bad knee, low impact', 'constraint', 'selected', 'muse_only', true) on conflict do nothing`;
// Heart rate: exact for me, Muse-only for everyone else, so the redaction demo works without touching settings.
for (const [audience, level] of [['game_participants', 'muse_only'], ['friends', 'muse_only'], ['mentor_match', 'muse_only'], ['public', 'none'], ['only_me', 'exact']]) {
  await sql`insert into share_policies (user_id, category, audience, level) values (${u.judge}, 'heart', ${audience}, ${level}) on conflict (user_id, category, audience) do update set level = excluded.level`;
}
for (const id of ids) {
  await sql`insert into connections (user_id, source, status, tokens, connected_at) values (${id}, 'mock', 'connected', '{"device":"Demo watch","seeded":true}'::jsonb, ${ago(30)}) on conflict (user_id, source) do nothing`;
  for (const e of generateDemoWeek(id, 'mock', new Date(now))) {
    await sql`insert into vault_events (user_id, source, external_id, kind, started_at, ended_at, distance_km, duration_min, steps, avg_hr, trust, display_scope)
              values (${id}, 'mock', ${e.externalId}, ${e.kind}, ${e.startedAt}, ${e.endedAt ?? null}, ${e.distanceKm ?? null}, ${e.durationMin ?? null}, ${e.steps ?? null}, ${e.avgHr ?? null}, 'device', 'normal')
              on conflict do nothing`;
  }
}

// ---- the crew's group chat ----
const [conv] = await sql`insert into conversations (is_group, name, created_by, created_at, updated_at) values (true, 'Weekend Run Club', ${u.judge}, ${ago(21)}, ${ago(0, 1)}) returning id`;
const convId = Number(conv.id);
for (const id of ids) await sql`insert into conversation_members (conversation_id, user_id, role, joined_at) values (${convId}, ${id}, ${id === u.judge ? 'admin' : 'member'}, ${ago(21)})`;
const say = (sender, body, at, kind = 'text', payload = null) =>
  sql`insert into messages (conversation_id, sender_id, body, created_at, kind, payload) values (${convId}, ${sender}, ${body}, ${at}, ${kind}, ${payload ? JSON.stringify(payload) : null}::jsonb) returning id`;

await say(u.maya, 'Katy Trail Saturday 8am? I can do 5k, happy to go slower', ago(3, 20));
await say(u.ava, 'In! Walking the first mile though', ago(3, 19));
await say(u.leo, 'Only if we get tacos after', ago(3, 19));
await say(u.judge, 'Deal. Let\'s make it a game this week', ago(3, 18));

// ---- a live boss quest, two days in ----
const startsAt = ago(2, 2);
const endsAt = new Date(now + 5 * DAY).toISOString();
const spec = {
  template: 'boss',
  title: 'Taco Trail Troll',
  story: 'A Troll has parked himself on the Katy Trail and is eating everyone\'s post-run tacos. Wear him down with a week of moves before Saturday brunch.',
  source: {kind: 'sentence', text: 'Run, walk or lift together this week before our Saturday run'},
  startsAt,
  endsAt,
  boss: {name: 'Taco Trail Troll', hp: 1500},
  levels: [
    {day: 1, name: 'Trailhead Warm-up', exercises: [{name: 'Brisk walk', seconds: 600}]},
    {day: 2, name: 'Bridge Underpass', exercises: [{name: 'Bodyweight squats', reps: 20}, {name: 'Plank', seconds: 45}]},
    {day: 3, name: 'Mockingbird Hill', exercises: [{name: 'Easy run', seconds: 900}]},
    {day: 4, name: 'Victory Park Steps', exercises: [{name: 'Step-ups', reps: 20}, {name: 'Lunges', reps: 16}]},
    {day: 5, name: 'Taco Stand Showdown', exercises: [{name: 'Group 5k', seconds: 1800}]},
  ],
  handicaps: [
    {userId: u.judge, targetScale: 0.8, damageScale: 1.2, note: 'Scaled to your recent weeks'},
    {userId: u.maya, targetScale: 1.3, damageScale: 0.8, note: 'Scaled to your recent weeks'},
    {userId: u.leo, targetScale: 1, damageScale: 1, note: 'Scaled to your recent weeks'},
    {userId: u.ava, targetScale: 0.8, damageScale: 1.2, note: 'Scaled to your recent weeks'},
  ],
  dares: [
    {id: 'sunrise', text: 'Catch a sunrise mile and send the sky photo', bonus: 20, needsProof: true},
    {id: 'bring-friend', text: 'Bring someone new to Saturday\'s run', bonus: 25, needsProof: true},
    {id: 'comeback', text: 'Everyone logs a move today for team spirit', bonus: 15, needsProof: false},
  ],
  rewards: [{tier: 'gear', label: 'Troll-slayer headband for your avatar'}, {tier: 'equipment', label: 'Running gear picks on Marketplace', equipmentTags: ['running shoes']}],
};
const moves = [
  [u.maya, 180, 'Easy 5k before work', ago(2, 1)],
  [u.leo, 140, 'Leg day: squats and lunges', ago(1, 20)],
  [u.ava, 90, '40 min walk around White Rock', ago(1, 6)],
  [u.maya, 160, 'Hill repeats', ago(0, 9)],
];
const damageDone = moves.reduce((s, m) => s + m[1], 0);
const [quest] = await sql`
  insert into quests (title, description, xp_reward, goal_type, goal_count, week_start, muse_meta, template, spec, conversation_id, created_by, status, starts_at, ends_at, boss_hp, boss_hp_left, created_at)
  values (${spec.title}, ${spec.story}, 100, 'rally', ${spec.levels.length}, ${startsAt.slice(0, 10)}, ${JSON.stringify({museUsed: true, bossKind: 'beast', buffed: false})}::jsonb, 'boss', ${JSON.stringify(spec)}::jsonb, ${convId}, ${u.judge}, 'active', ${startsAt}, ${endsAt}, 1500, ${1500 - damageDone}, ${startsAt})
  returning id`;
const questId = Number(quest.id);
await say(u.judge, `Jordan started ${spec.title}`, startsAt, 'quest_card', {questId, title: spec.title, template: 'boss', bossName: spec.boss.name, bossHp: 1500});
for (const id of ids) await sql`insert into quest_progress (quest_id, user_id, status, progress) values (${questId}, ${id}, 'active', '{}'::jsonb)`;
let hp = 1500;
for (const [id, damage, note, at] of moves) {
  hp -= damage;
  const name = PEOPLE.find(p => u[p.key] === id).name.split(' ')[0];
  await sql`insert into quest_moves (quest_id, user_id, kind, damage, note, created_at) values (${questId}, ${id}, 'move', ${damage}, ${note}, ${at})`;
  await sql`update quest_progress set progress = ${JSON.stringify({lastMoveAt: at, level: 1})}::jsonb where quest_id = ${questId} and user_id = ${id}`;
  const text = `${name} hits the Troll for ${damage}. ${hp}/1500 HP left and he is guarding the tacos.`;
  await say(id, text, at, 'rally_game', {questId, event: 'move', userId: id, text, damage, hpLeft: hp});
}

// ---- a live Turf game on the Katy Trail ----
const center = {lat: 32.8125, lng: -96.7985};
const settings = {center, radiusKm: 1.5, lengthDays: 7, arenaLabel: 'Katy Trail', startsAt: null};
const turfEnds = new Date(now + 4 * DAY).toISOString();
const [game] = await sql`insert into games (conversation_id, game_type, settings, status, host_id, starts_at, ends_at, created_at) values (${convId}, 'turf', ${JSON.stringify(settings)}::jsonb, 'live', ${u.judge}, ${ago(3)}, ${turfEnds}, ${ago(3)}) returning id`;
const gameId = Number(game.id);
for (const [i, id] of ids.entries()) {
  await sql`insert into game_invites (game_id, user_id, invited_by, status, color, location_consent_at, responded_at) values (${gameId}, ${id}, ${u.judge}, 'accepted', ${colorAt(i)}, ${ago(3)}, ${ago(3)})`;
}
await say(u.judge, 'Jordan invited you to Turf: Katy Trail', ago(3), 'rally_invite', {gameId, gameType: 'turf', title: 'Turf: Katy Trail', arenaLabel: 'Katy Trail', endsAt: turfEnds});
// The judge owns nothing yet so the live route replay (/api/demo/turf-replay) visibly takes ground.
const territory = [
  [u.maya, 0.004, -0.003, 3],
  [u.leo, -0.005, 0.004, 2],
  [u.ava, 0.001, 0.006, 2],
];
const held = {};
for (const [id, dLat, dLng, k] of territory) {
  const cells = gridDisk(latLngToCell(center.lat + dLat, center.lng + dLng, TURF_RES), k);
  held[id] = cells.length;
  await sql`insert into turf_cells (game_id, cell, owner_id, claimed_at) select ${gameId}, c, ${id}, ${ago(1)} from unnest(${cells}::text[]) as c on conflict do nothing`;
  await sql`insert into turf_outings (game_id, user_id, started_at, ended_at, status, cells_claimed, source, result) values (${gameId}, ${id}, ${ago(1, 1)}, ${ago(1)}, 'claimed', ${cells.length}, 'live', ${JSON.stringify({cutBy: null, loops: 1, taken: {}, gained: cells.length, cutVictims: []})}::jsonb)`;
}
await say(u.maya, `Maya closed a loop and claimed ${held[u.maya]} cells!`, ago(1), 'turf_recap', {gameId, text: `Maya closed a loop and claimed ${held[u.maya]} cells!`, cells: held, title: 'Katy Trail', museUsed: true});
await say(u.leo, 'Jordan you have zero turf, the trail is waiting', ago(0, 3));
await say(u.ava, 'Saturday still on? Troll is at ' + hp + ' HP', ago(0, 1));

// ---- a goal with a plan already under way ----
const plan = {
  weeks: 6,
  summary: 'Walk-runs first, then steady running with one long run, one speed day and two short strength sessions a week.',
  phases: [
    {id: 'p1', name: 'Base', focus: 'Build the habit with walk-runs and short easy runs.', startWeek: 1, endWeek: 2},
    {id: 'p2', name: 'Build', focus: 'Longer runs plus one weekly speed session.', startWeek: 3, endWeek: 4},
    {id: 'p3', name: 'Peak', focus: 'A 4 km long run and steady speed work.', startWeek: 5, endWeek: 5},
    {id: 'p4', name: 'Taper', focus: 'Short easy runs, arrive fresh.', startWeek: 6, endWeek: 6},
  ],
  components: [
    {id: 'run', name: 'Running', detail: '5 km on race day'},
    {id: 'long-run', name: 'Long run', detail: 'One longer run each week'},
    {id: 'speed', name: 'Speed', detail: 'Intervals once a week'},
    {id: 'strength', name: 'Strength', detail: 'Two short leg and core sessions'},
  ],
  milestones: [
    {id: 'm1', week: 1, title: 'Finish a 20-min walk-run session', phaseId: 'p1', componentId: 'run', done: true, doneAt: ago(9)},
    {id: 'm2', week: 2, title: 'Run 2 km without walking', phaseId: 'p1', componentId: 'run', done: true, doneAt: ago(4)},
    {id: 'm3', week: 3, title: 'Complete a 3 km long run', phaseId: 'p2', componentId: 'long-run', done: false, doneAt: null},
    {id: 'm4', week: 4, title: 'Finish 4x1-min fast intervals', phaseId: 'p2', componentId: 'speed', done: false, doneAt: null},
    {id: 'm5', week: 4, title: 'Do 2 short leg and core sessions in one week', phaseId: 'p2', componentId: 'strength', done: false, doneAt: null},
    {id: 'm6', week: 5, title: 'Complete a 4 km long run', phaseId: 'p3', componentId: 'long-run', done: false, doneAt: null},
    {id: 'm7', week: 6, title: 'Run your first 5K', phaseId: 'p4', componentId: 'run', done: false, doneAt: null},
  ],
};
await sql`insert into goals (user_id, raw_text, title, event_kind, event_date, plan, muse_used, status, created_at) values (${u.judge}, 'Run my first 5K', 'First 5K Finish', '5k', ${new Date(now + 28 * DAY).toISOString().slice(0, 10)}, ${JSON.stringify(plan)}::jsonb, true, 'active', ${ago(14)})`;

await sql`update conversations set updated_at = now() where id = ${convId}`;
for (const [actor, message] of [[u.maya, 'Maya hit the Taco Trail Troll for 160. Your move is up.'], [u.leo, 'Leo invited you to Turf: Katy Trail.']]) {
  await sql`insert into notifications (user_id, actor_id, type, message) values (${u.judge}, ${actor}, 'rally', ${message})`;
}

const [linked] = await sql`select supertokens_id is not null as linked from users where id = ${u.judge}`;
console.log(`judge user ${u.judge} (${JUDGE_EMAIL}) seeded: chat ${convId}, quest ${questId} at ${hp}/1500 HP, turf game ${gameId}; login ${linked.linked ? 'linked' : 'not linked yet: sign up at /auth with this email'}`);
