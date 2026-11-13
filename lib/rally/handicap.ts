/**
 * Per-activity handicaps (Muse Spark). For each player we ask the Answers API two banded questions at
 * the game_participants level: sessions of THIS game's activity in the last 2 weeks, and all workouts, plus the
 * code-decided 4-week level tier (level_4w). Spark sees first names + those bands only (what game members may already see), proposes scales and a
 * private one-line reason per player; code clamps everything (fairness.ts). Offline -> fixed table.
 */
import {ask} from '@/lib/activities/answers';
import {MODELS, museConfigured, museJson} from '@/lib/muse/client';
import {
  BAND_LABEL,
  FOCUS_LABEL,
  FOCUS_QUESTION,
  activityFocus,
  bandOf,
  clampHandicap,
  fallbackReason,
  fallbackScales,
  predictFairness,
  readiness,
  type Readiness,
  type Band,
  type Focus,
  type HandicapPlan,
} from '@/lib/rally/fairness';
import {HANDICAP_NOTE, type Member, type SpecSource} from '@/lib/rally/spec';

const SCHEMA = {
  type: 'object',
  properties: {
    players: {
      type: 'array',
      items: {
        type: 'object',
        properties: {userId: {type: 'integer'}, targetScale: {type: 'number'}, damageScale: {type: 'number'}, reason: {type: 'string'}},
        required: ['userId', 'targetScale', 'damageScale', 'reason'],
        additionalProperties: false,
      },
    },
    summary: {type: 'string'},
  },
  required: ['players', 'summary'],
  additionalProperties: false,
};

function sourceText(source: SpecSource): string {
  return source.kind === 'reel' ? `${source.caption} ${source.exercises.map(e => e.name).join(' ')}` : source.text;
}

const bandText = (b: Band | null) => (b == null ? 'not shared' : BAND_LABEL[b]);

async function safeAsk(userId: number, question: Parameters<typeof ask>[2]) {
  try {
    return await ask(userId, 'game_participants', question, 'quest:handicap');
  } catch {
    return null;
  }
}

async function bandsFor(userId: number, focus: Focus) {
  const [focusA, generalA, levelA] = await Promise.all([safeAsk(userId, FOCUS_QUESTION[focus]), focus === 'general' ? null : safeAsk(userId, 'workouts_2w'), safeAsk(userId, 'level_4w')]);
  const focusBand = bandOf(focusA);
  return {id: userId, focusBand, generalBand: focus === 'general' ? focusBand : bandOf(generalA), level: typeof levelA?.value === 'string' ? levelA.value : null};
}

/** Good match or stretch for someone joining a game that already exists (its focus is in quests.muse_meta). */
export async function readinessFor(userId: number, focus: Focus): Promise<Readiness | null> {
  const b = await bandsFor(userId, focus);
  return readiness(focus, b.focusBand, b.generalBand, b.level);
}

export async function planHandicaps(source: SpecSource, members: Member[]): Promise<HandicapPlan> {
  const focus = activityFocus(sourceText(source));
  const what = FOCUS_LABEL[focus];
  const bands = await Promise.all(members.map(m => bandsFor(m.id, focus)));

  const base = new Map(bands.map(b => [b.id, {...fallbackScales(b.focusBand, b.generalBand), reason: fallbackReason(focus, b.focusBand)}]));
  let summary = `Balanced on recent ${what}: newer players hit harder, regulars aim higher.`;
  let museUsed = false;

  if (museConfigured() && members.length > 1) {
    try {
      const players = members.map(m => {
        const b = bands.find(x => x.id === m.id);
        return {userId: m.id, firstName: m.name.split(' ')[0], thisActivity: bandText(b?.focusBand ?? null), allWorkouts: bandText(b?.generalBand ?? null), usualLevel: b?.level ?? 'not shared'};
      });
      const out = await museJson<{players: {userId: number; targetScale: number; damageScale: number; reason: string}[]; summary: string}>({
        model: MODELS.spark,
        schemaName: 'rally_handicaps',
        schema: SCHEMA,
        effort: 'low',
        input: `You balance a friendly co-op fitness game in a group chat so every player has a real shot at contributing.
The game is mostly ${what}. For each player you get how many ${what} sessions and how many workouts overall they did in the last 2 weeks (bands: none lately, 1-2, 3-4, 5+, or not shared), and usualLevel: their overall level over the last 4 weeks (new, building, regular, strong), measured from their synced workouts. Use usualLevel to tell a regular having a quiet fortnight from someone just starting.
Players: ${JSON.stringify(players)}
For every player return:
- targetScale (0.6-1.4): how big their personal target is. More recent ${what} than the group -> above 1. Less -> below 1.
- damageScale (0.7-1.6): how hard each of their moves hits. Less recent ${what} -> above 1. More -> below 1. Never raise both for one player.
- "not shared" -> 1 and 1.
- reason: one sentence to that player ("you"), max 16 words, about their recent ${what} only. Never name their level word.
summary: one sentence for the whole group on how the game is balanced. Name nobody and no one's level.
Never mention bodies, weight, health, injuries, age, or words like weak, slow, unfit, lazy.`,
      });
      for (const p of out.players ?? []) {
        if (!base.has(p.userId)) continue;
        const reason = String(p.reason ?? '').trim().slice(0, 140);
        base.set(p.userId, {...clampHandicap(p), reason: reason || base.get(p.userId)!.reason});
      }
      if (out.summary?.trim()) summary = out.summary.trim().slice(0, 180);
      museUsed = true;
    } catch (err) {
      console.error('[rally] Spark handicaps failed, using table', err instanceof Error ? err.message : err);
    }
  }

  const handicaps = members.map(m => {
    const h = base.get(m.id)!;
    return {userId: m.id, targetScale: h.targetScale, damageScale: h.damageScale, note: HANDICAP_NOTE};
  });
  const fairness = predictFairness(bands.map(b => ({band: b.focusBand ?? b.generalBand, damageScale: base.get(b.id)!.damageScale})));
  return {
    focus,
    handicaps,
    reasons: Object.fromEntries(members.map(m => [m.id, base.get(m.id)!.reason])),
    readiness: Object.fromEntries(bands.flatMap(b => { const r = readiness(focus, b.focusBand, b.generalBand, b.level); return r ? [[b.id, r] as [number, Readiness]] : []; })),
    fairness: {...fairness, summary},
    museUsed,
  };
}
