/**
 * GameSpec generation (spec §15.6). Muse Spark designs the game when MODEL_API_KEY is set; otherwise a
 * deterministic generator builds one from the Reel's exercises / the sentence keywords. Either way
 * `clampSpec` bounds every number and handicaps come ONLY from banded Answers (never raw data).
 */
import type {Answer, GameSpec, GameTemplate} from '@/lib/activities/types';
import {MODELS, museConfigured, museJson} from '@/lib/muse/client';
import {LIMITS, clamp} from '@/lib/rally/scoring';

export type Member = {id: number; name: string};
export type SpecSource = {kind: 'sentence'; text: string} | {kind: 'reel'; reelId: number; caption: string; exercises: {name: string; reps?: number; seconds?: number}[]; equipment: string[]; difficulty?: string | null};

export const HANDICAP_NOTE = 'scaled to your recent weeks';

/** Banded Answer (workouts_this_week at game_participants level) -> scales. Reason is never stored. */
export function handicapFromAnswer(userId: number, a: Answer | null): GameSpec['handicaps'][number] {
  const v = a?.withheld ? null : a?.value ?? null;
  let band: 0 | 1 | 2 | 3 = 2;
  if (typeof v === 'string') band = v === '0' ? 0 : v === '1-2' ? 1 : v === '3-4' ? 2 : 3;
  else if (typeof v === 'number') band = v === 0 ? 0 : v <= 2 ? 1 : v <= 4 ? 2 : 3;
  else if (typeof v === 'boolean') band = v ? 2 : 0;
  const table = [
    {targetScale: 0.6, damageScale: 1.5},
    {targetScale: 0.8, damageScale: 1.25},
    {targetScale: 1.0, damageScale: 1.0},
    {targetScale: 1.2, damageScale: 0.8},
  ][band];
  return {userId, ...table, note: HANDICAP_NOTE};
}

export function clampSpec(raw: GameSpec, members: Member[]): GameSpec {
  const memberIds = new Set(members.map(m => m.id));
  const levels = (raw.levels ?? []).slice(0, 7).map((l, i) => ({
    day: i + 1,
    name: String(l.name ?? `Day ${i + 1}`).slice(0, 60),
    exercises: (l.exercises ?? []).slice(0, 5).map(e => ({
      name: String(e.name ?? 'Move').slice(0, 40),
      ...(e.reps != null ? {reps: Math.round(clamp(e.reps, LIMITS.reps))} : {}),
      ...(e.seconds != null ? {seconds: Math.round(clamp(e.seconds, LIMITS.seconds))} : {}),
    })),
  }));
  const template: GameTemplate = raw.template === 'relay' || raw.template === 'streak' ? raw.template : 'boss';
  return {
    template,
    title: String(raw.title ?? 'Rally quest').slice(0, 80),
    story: String(raw.story ?? '').slice(0, 300),
    source: raw.source,
    startsAt: raw.startsAt,
    endsAt: raw.endsAt,
    levels: levels.length ? levels : [{day: 1, name: 'Day 1', exercises: [{name: 'Move', reps: 10}]}],
    boss: template === 'boss' ? {name: String(raw.boss?.name ?? 'The Boss').slice(0, 40), hp: Math.round(clamp(raw.boss?.hp ?? 1500, LIMITS.bossHp))} : undefined,
    handicaps: members.map(m => {
      const h = (raw.handicaps ?? []).find(x => x.userId === m.id);
      return {userId: m.id, targetScale: clamp(h?.targetScale ?? 1, LIMITS.targetScale), damageScale: clamp(h?.damageScale ?? 1, LIMITS.damageScale), note: HANDICAP_NOTE};
    }).filter(h => memberIds.has(h.userId)),
    dares: (raw.dares ?? []).slice(0, 4).map((d, i) => ({id: String(d.id ?? `dare-${i + 1}`).slice(0, 24), text: String(d.text ?? '').slice(0, 140), bonus: Math.round(clamp(d.bonus ?? 10, LIMITS.bonus)), needsProof: Boolean(d.needsProof)})),
    rewards: (raw.rewards ?? []).slice(0, 3).map(r => ({tier: r.tier === 'discount' || r.tier === 'equipment' ? r.tier : 'gear', label: String(r.label ?? 'Reward').slice(0, 80), ...(r.equipmentTags ? {equipmentTags: r.equipmentTags.slice(0, 5).map(String)} : {})})),
  };
}

// ---- Deterministic fallback -------------------------------------------------------

const FAMILIES: {match: RegExp; exercise: string; reps?: number; seconds?: number; boss: string; kind: BossKind; tags: string[]}[] = [
  {match: /plank|core|abs/i, exercise: 'Plank', seconds: 40, boss: 'Plank Goblin', kind: 'goblin', tags: ['mat', 'ab roller']},
  {match: /squat|leg|lunge/i, exercise: 'Squat', reps: 15, boss: 'Squat Golem', kind: 'golem', tags: ['bands', 'kettlebell']},
  {match: /push.?up|chest|press/i, exercise: 'Push-up', reps: 12, boss: 'Push-up Dragon', kind: 'dragon', tags: ['push-up bars', 'mat']},
  {match: /run|jog|mile|km|sprint|cardio/i, exercise: 'Run (minutes)', seconds: 90, boss: 'Treadmill Serpent', kind: 'serpent', tags: ['running shoes', 'water bottle']},
  {match: /walk|steps|hike/i, exercise: 'Brisk walk (minutes)', seconds: 90, boss: 'Trail Yeti', kind: 'yeti', tags: ['walking shoes', 'day pass']},
  {match: /yoga|stretch|mobility/i, exercise: 'Flow (minutes)', seconds: 60, boss: 'Stiffness Spectre', kind: 'spectre', tags: ['yoga mat', 'blocks']},
  {match: /burpee|hiit|jump/i, exercise: 'Burpee', reps: 10, boss: 'Burpee Beast', kind: 'beast', tags: ['jump rope', 'mat']},
  {match: /bike|cycle|ride|spin/i, exercise: 'Ride (minutes)', seconds: 90, boss: 'Hill Hydra', kind: 'serpent', tags: ['bike', 'helmet']},
  {match: /lift|deadlift|curl|dumbbell|strength|gym/i, exercise: 'Dumbbell row', reps: 12, boss: 'Iron Ogre', kind: 'golem', tags: ['dumbbells', 'bands']},
];
export type BossKind = 'goblin' | 'golem' | 'dragon' | 'serpent' | 'yeti' | 'spectre' | 'beast';

export function bossKindFor(name: string): BossKind {
  const f = FAMILIES.find(f => f.match.test(name));
  if (f) return f.kind;
  const kinds: BossKind[] = ['goblin', 'golem', 'dragon', 'serpent', 'yeti', 'spectre', 'beast'];
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return kinds[h % kinds.length];
}

export function thisMonday(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

const LEVEL_NAMES = ['Warm-up Woods', 'Rep Ridge', 'Burn Bridge', 'Sweat Swamp', 'Grit Gorge', 'Final Climb', 'Boss Gate'];

export function fallbackSpec(source: SpecSource, members: Member[], handicaps: GameSpec['handicaps'], now = new Date()): GameSpec {
  const text = source.kind === 'sentence' ? source.text : `${source.caption} ${source.exercises.map(e => e.name).join(' ')}`;
  const template: GameTemplate = /streak|every day|daily|survival/i.test(text) ? 'streak' : /relay|teams?\b|race/i.test(text) ? 'relay' : 'boss';
  const fams = FAMILIES.filter(f => f.match.test(text));
  const primary = fams[0] ?? FAMILIES[0];
  const base = source.kind === 'reel' && source.exercises.length ? source.exercises : (fams.length ? fams : [primary]).map(f => ({name: f.exercise, reps: f.reps, seconds: f.seconds}));
  const sizeBoost = clamp(members.length, [2, 6]);
  const levels = LEVEL_NAMES.map((name, i) => ({
    day: i + 1,
    name,
    exercises: base.slice(0, 3).map(e => ({
      name: e.name,
      ...(e.reps != null ? {reps: Math.round(e.reps * (1 + i * 0.1))} : {}),
      ...(e.seconds != null ? {seconds: Math.round(e.seconds * (1 + i * 0.1))} : {}),
    })),
  }));
  const start = thisMonday(now);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const bossName = source.kind === 'reel' && source.exercises[0] ? `${source.exercises[0].name.split(' ')[0]} ${primary.boss.split(' ')[1] ?? 'Goblin'}` : primary.boss;
  const titleBase = template === 'boss' ? `${bossName} Week` : template === 'relay' ? `${primary.exercise} Relay` : `${primary.exercise} Streak`;
  const tags = source.kind === 'reel' && source.equipment.length ? source.equipment : primary.tags;
  return clampSpec(
    {
      template,
      title: titleBase,
      story:
        template === 'boss'
          ? `${bossName} has camped out in the group chat. Every ${primary.exercise.toLowerCase()} the squad logs this week chips away its HP; take it down before Sunday night.`
          : template === 'relay'
            ? `Two teams, one map. Every move passes the baton a leg further; first team to the finish wins bragging rights.`
            : `One move a day keeps the squad alive. Miss a day and you burn a freeze, then a life. Last ones standing on Sunday win.`,
      source: source.kind === 'reel' ? {kind: 'reel', reelId: source.reelId} : {kind: 'sentence', text: source.text.slice(0, 200)},
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      levels,
      boss: {name: bossName, hp: 300 * sizeBoost * 2},
      handicaps,
      dares: [
        {id: 'somewhere-new', text: 'Work out somewhere you have never trained before.', bonus: 15, needsProof: true},
        {id: 'rain', text: 'Get a move in while it rains.', bonus: 20, needsProof: true},
        {id: 'bring-a-friend', text: 'Bring a friend from outside the group to one session.', bonus: 15, needsProof: false},
      ],
      rewards: [
        {tier: 'gear', label: `${bossName} trophy for every avatar`},
        {tier: 'discount', label: '20% off at a partner gym (demo code)'},
        {tier: 'equipment', label: `Sponsored ${tags[0] ?? 'gear'} for the squad`, equipmentTags: tags.slice(0, 3)},
      ],
    },
    members,
  );
}

// ---- Muse Spark ---------------------------------------------------------------------

const exerciseSchema = {type: 'object', properties: {name: {type: 'string'}, reps: {type: ['integer', 'null']}, seconds: {type: ['integer', 'null']}}, required: ['name', 'reps', 'seconds'], additionalProperties: false};
export const GAME_SPEC_SCHEMA = {
  type: 'object',
  properties: {
    template: {type: 'string', enum: ['boss', 'relay', 'streak']},
    title: {type: 'string'},
    story: {type: 'string'},
    levels: {type: 'array', items: {type: 'object', properties: {day: {type: 'integer'}, name: {type: 'string'}, exercises: {type: 'array', items: exerciseSchema}}, required: ['day', 'name', 'exercises'], additionalProperties: false}},
    boss: {type: 'object', properties: {name: {type: 'string'}, hp: {type: 'integer'}}, required: ['name', 'hp'], additionalProperties: false},
    dares: {type: 'array', items: {type: 'object', properties: {id: {type: 'string'}, text: {type: 'string'}, bonus: {type: 'integer'}, needsProof: {type: 'boolean'}}, required: ['id', 'text', 'bonus', 'needsProof'], additionalProperties: false}},
    rewards: {type: 'array', items: {type: 'object', properties: {tier: {type: 'string', enum: ['gear', 'discount', 'equipment']}, label: {type: 'string'}, equipmentTags: {type: 'array', items: {type: 'string'}}}, required: ['tier', 'label', 'equipmentTags'], additionalProperties: false}},
  },
  required: ['template', 'title', 'story', 'levels', 'boss', 'dares', 'rewards'],
  additionalProperties: false,
};

type MuseSpec = Omit<GameSpec, 'source' | 'startsAt' | 'endsAt' | 'handicaps' | 'levels'> & {levels: {day: number; name: string; exercises: {name: string; reps: number | null; seconds: number | null}[]}[]};

/**
 * Handicaps come from `handicaps` (lib/rally/handicap.ts, already clamped) or, when absent, from
 * `answers` via the fixed table. This call never sees them; Muse only gets names and the workout.
 * `museUsed` tells the UI when the offline generator ran.
 */
export async function generateGameSpec(opts: {source: SpecSource; members: Member[]; answers: Record<number, Answer | null>; handicaps?: GameSpec['handicaps']}): Promise<{spec: GameSpec; museUsed: boolean}> {
  const handicaps = opts.handicaps ?? opts.members.map(m => handicapFromAnswer(m.id, opts.answers[m.id] ?? null));
  const fallback = fallbackSpec(opts.source, opts.members, handicaps);
  if (!museConfigured()) return {spec: fallback, museUsed: false};
  try {
    const workout =
      opts.source.kind === 'reel'
        ? `Reel caption: ${opts.source.caption}\nExercises: ${opts.source.exercises.map(e => `${e.name}${e.reps ? ` x${e.reps}` : ''}${e.seconds ? ` ${e.seconds}s` : ''}`).join(', ') || 'unknown'}\nEquipment: ${opts.source.equipment.join(', ') || 'none'}`
        : `Request: "${opts.source.text}"`;
    const out = await museJson<MuseSpec>({
      model: MODELS.spark,
      schemaName: 'rally_game_spec',
      schema: GAME_SPEC_SCHEMA,
      effort: 'low',
      input: `You are the Game Master for a friendly fitness game in a group chat of ${opts.members.length}: ${opts.members.map(m => m.name.split(' ')[0]).join(', ')}.
${workout}
Design one week-long quest. Templates: boss (co-op HP pool, default), relay (two teams race), streak (one move a day).
Return 7 levels (day 1..7) named like a board game path, each with 1-3 exercises from the workout with a normal single-set target (reps 8-20, holds 20-60 s, cardio in seconds 30-90).
Boss: a playful villain named from the main exercise (e.g. "Plank Goblin"), hp 1000-3000.
3 dares that fit a group (somewhere new, weather, bring a friend), bonus 10-30, needsProof true when a photo makes sense.
3 rewards: gear (avatar gear name), discount (partner code), equipment (equipmentTags = 1-3 pieces of simple gear that match the workout).
Rules: playful trash talk only; never mention bodies, weight, health, injuries or ability. Title under 40 characters, story 1-2 sentences.`,
    });
    const spec = clampSpec(
      {
        ...fallback,
        template: out.template,
        title: out.title,
        story: out.story,
        levels: out.levels.map(l => ({...l, exercises: l.exercises.map(e => ({name: e.name, ...(e.reps != null ? {reps: e.reps} : {}), ...(e.seconds != null ? {seconds: e.seconds} : {})}))})),
        boss: out.boss,
        dares: out.dares,
        rewards: out.rewards.map(r => ({...r, equipmentTags: r.equipmentTags?.length ? r.equipmentTags : undefined})),
        handicaps,
      },
      opts.members,
    );
    return {spec, museUsed: true};
  } catch (err) {
    console.error('[rally] Spark spec failed, using fallback', err instanceof Error ? err.message : err);
    return {spec: fallback, museUsed: false};
  }
}
