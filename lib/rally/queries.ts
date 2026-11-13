/**
 * Rally persistence + game loop (§15–§19). Quests reuse the Closeness `quests` table (template != null).
 * Anything about a member that other members can see comes from ask() (Answers) or from quest_moves
 * (public game facts: who moved, damage). vault_events are never read here.
 */
import {sql} from '@/lib/db';
import {ask} from '@/lib/activities/answers';
import type {GameSpec, QuestCardPayload, RallyGamePayload, Trust} from '@/lib/activities/types';
import {insertXpEvent} from '@/lib/closeness-queries';
import {sendMessage} from '@/lib/messaging-queries';
import {museConfigured} from '@/lib/muse/client';
import {generateBadgeArt} from '@/lib/muse/image';
import {sendPushToUser} from '@/lib/push';
import {narrate, recapText} from '@/lib/rally/narration';
import {verifyProofImage} from '@/lib/rally/proof';
import {
  adaptiveAdjust,
  applyDamage,
  classifyMoveEvent,
  computeMove,
  contributions,
  gearForEvents,
  isBigMoment,
  isRainDare,
  personalTarget,
  relayState,
  streakState,
  unlockedTiers,
  type BossEvent,
} from '@/lib/rally/scoring';
import {bossKindFor, generateGameSpec, thisMonday, type Member, type SpecSource} from '@/lib/rally/spec';
import {planHandicaps} from '@/lib/rally/handicap';

export type QuestRow = {
  id: number;
  title: string;
  template: GameSpec['template'];
  spec: GameSpec;
  conversationId: number | null;
  reelId: number | null;
  createdBy: number | null;
  status: string;
  startsAt: string;
  endsAt: string;
  bossHp: number;
  bossHpLeft: number;
  bossImageUrl: string | null;
  bossKind: string;
  museUsed: boolean;
  buffed: boolean;
  createdAt: string;
};

export type MoveRow = {id: number; questId: number; userId: number; kind: 'move' | 'dare'; dareId: string | null; damage: number; proofStatus: string | null; proofVerdict: string | null; hasProof: boolean; createdAt: string};

function mapQuest(r: Record<string, unknown>): QuestRow {
  const meta = (r.muse_meta ?? {}) as Record<string, unknown>;
  const spec = r.spec as GameSpec;
  return {
    id: r.id as number,
    title: r.title as string,
    template: (r.template ?? 'boss') as GameSpec['template'],
    spec,
    conversationId: (r.conversation_id as number | null) ?? null,
    reelId: (r.reel_id as number | null) ?? null,
    createdBy: (r.created_by as number | null) ?? null,
    status: r.status as string,
    startsAt: new Date((r.starts_at as string) ?? spec.startsAt).toISOString(),
    endsAt: new Date((r.ends_at as string) ?? spec.endsAt).toISOString(),
    bossHp: (r.boss_hp as number) ?? spec.boss?.hp ?? 0,
    bossHpLeft: (r.boss_hp_left as number) ?? 0,
    bossImageUrl: (r.boss_image_url as string | null) ?? null,
    bossKind: String(meta.bossKind ?? bossKindFor(spec.boss?.name ?? spec.title)),
    museUsed: Boolean(meta.museUsed),
    buffed: Boolean(meta.buffed),
    createdAt: new Date(r.created_at as string).toISOString(),
  };
}

const mapMove = (r: Record<string, unknown>): MoveRow => ({
  id: Number(r.id),
  questId: r.quest_id as number,
  userId: r.user_id as number,
  kind: r.kind as 'move' | 'dare',
  dareId: (r.dare_id as string | null) ?? null,
  damage: r.damage as number,
  proofStatus: (r.proof_status as string | null) ?? null,
  proofVerdict: (r.proof_verdict as string | null) ?? null,
  hasProof: r.proof_image_url != null,
  createdAt: new Date(r.created_at as string).toISOString(),
});

export async function getQuest(id: number): Promise<QuestRow | null> {
  const [row] = await sql`select * from quests where id = ${id} and template is not null`;
  return row ? mapQuest(row) : null;
}

export async function listQuestsForConversation(conversationId: number): Promise<QuestRow[]> {
  const rows = await sql`select * from quests where conversation_id = ${conversationId} and template is not null order by created_at desc limit 20`;
  return rows.map(mapQuest);
}

export async function listQuestsForUser(userId: number): Promise<QuestRow[]> {
  const rows = await sql`select q.* from quests q join quest_progress p on p.quest_id = q.id where p.user_id = ${userId} and q.template is not null order by q.created_at desc limit 20`;
  return rows.map(mapQuest);
}

export async function isQuestMember(questId: number, userId: number): Promise<boolean> {
  const [r] = await sql`select 1 from quest_progress where quest_id = ${questId} and user_id = ${userId}`;
  return Boolean(r);
}

async function conversationMembers(conversationId: number): Promise<Member[]> {
  const rows = await sql`select u.id, u.name from conversation_members cm join users u on u.id = cm.user_id where cm.conversation_id = ${conversationId} order by u.id`;
  return rows.map(r => ({id: r.id as number, name: r.name as string}));
}

export async function getReelSource(reelId: number): Promise<SpecSource | null> {
  const [r] = await sql`select id, caption, exercises, equipment, difficulty from reels where id = ${reelId}`;
  if (!r) return null;
  const ex = Array.isArray(r.exercises) ? (r.exercises as {name?: string; reps?: number; seconds?: number; duration_sec?: number}[]) : [];
  return {
    kind: 'reel',
    reelId,
    caption: String(r.caption ?? ''),
    exercises: ex.filter(e => e?.name).map(e => ({name: String(e.name), ...(e.reps ? {reps: Number(e.reps)} : {}), ...(e.seconds || e.duration_sec ? {seconds: Number(e.seconds ?? e.duration_sec)} : {})})),
    equipment: Array.isArray(r.equipment) ? (r.equipment as string[]) : [],
    difficulty: (r.difficulty as string | null) ?? null,
  };
}

/** Reel/sentence -> GameSpec -> quest row + progress rows + quest_card in the thread + push (§15.6, §16.1). */
export async function createQuest(opts: {source: SpecSource; conversationId: number; creator: {id: number; name: string}; goalId?: number}): Promise<{quest: QuestRow; museUsed: boolean}> {
  const members = await conversationMembers(opts.conversationId);
  // Handicaps (per-activity, Spark) and the game itself (Spark) are independent calls: run them together.
  const [plan, generated] = await Promise.all([planHandicaps(opts.source, members), generateGameSpec({source: opts.source, members, answers: {}})]);
  const spec: GameSpec = {...generated.spec, handicaps: plan.handicaps};
  const museUsed = generated.museUsed;
  const bossKind = bossKindFor(spec.boss?.name ?? spec.title);
  let bossImageUrl: string | null = null;
  if (museConfigured() && spec.boss) {
    try {
      bossImageUrl = await generateBadgeArt(`${spec.boss.artPrompt}. Cartoon game boss, friendly villain`);
    } catch (err) {
      console.error('[rally] boss art failed', err instanceof Error ? err.message : err);
    }
  }
  const hp = spec.boss?.hp ?? 0;
  const meta = JSON.stringify({museUsed, bossKind, buffed: false, focus: plan.focus, fairness: plan.fairness, handicapsByMuse: plan.museUsed, ...(opts.goalId ? {goalId: opts.goalId} : {})});
  const [row] = await sql`
    insert into quests (title, description, xp_reward, goal_type, goal_count, week_start, muse_meta, template, spec, conversation_id, reel_id, created_by, status, starts_at, ends_at, boss_hp, boss_hp_left, boss_image_url)
    values (${spec.title}, ${spec.story}, 100, 'rally', ${spec.levels.length}, ${thisMonday().toISOString().slice(0, 10)}, ${meta}::jsonb, ${spec.template}, ${JSON.stringify(spec)}::jsonb, ${opts.conversationId}, ${opts.source.kind === 'reel' ? opts.source.reelId : null}, ${opts.creator.id}, 'active', ${spec.startsAt}, ${spec.endsAt}, ${hp}, ${hp}, ${bossImageUrl})
    returning *`;
  const quest = mapQuest(row);
  for (const m of members) {
    // handicapWhy is private to that player: getQuestState only returns it to them.
    const progress = JSON.stringify({handicapWhy: plan.reasons[m.id] ?? null});
    await sql`insert into quest_progress (quest_id, user_id, status, progress) values (${quest.id}, ${m.id}, 'active', ${progress}::jsonb) on conflict (quest_id, user_id) do nothing`;
  }
  const payload: QuestCardPayload = {questId: quest.id, title: spec.title, template: spec.template, bossName: spec.boss?.name, bossHp: hp, ...(quest.reelId ? {reelId: quest.reelId} : {})};
  await sendMessage(opts.conversationId, opts.creator, `${opts.creator.name.split(' ')[0]} started ${spec.title}`, null, {kind: 'quest_card', payload});
  for (const m of members) {
    if (m.id === opts.creator.id) continue;
    await sql`insert into notifications (user_id, actor_id, type, message) values (${m.id}, ${opts.creator.id}, 'rally', ${`${opts.creator.name.split(' ')[0]} started the quest "${spec.title}". Your first move is up.`})`;
    void sendPushToUser(m.id, {title: 'New Rally quest', body: `${opts.creator.name.split(' ')[0]} started ${spec.title}`, url: `/activities/games/${quest.id}`, tag: `quest-${quest.id}`});
  }
  return {quest, museUsed};
}

export async function listMoves(questId: number): Promise<MoveRow[]> {
  const rows = await sql`select id, quest_id, user_id, kind, dare_id, damage, proof_status, proof_verdict, proof_image_url, created_at from quest_moves where quest_id = ${questId} order by id asc`;
  return rows.map(mapMove);
}

export function levelDayFor(quest: Pick<QuestRow, 'startsAt' | 'spec'>, now = new Date()): number {
  const day = Math.floor((now.getTime() - new Date(quest.startsAt).getTime()) / 86_400_000) + 1;
  return Math.min(quest.spec.levels.length, Math.max(1, day));
}

export type MoveSource = 'manual' | 'photo' | 'voice' | 'vault';
export type LogMoveInput = {source: MoveSource; vaultEventId?: number | null; note?: string | null; image?: string | null; amount?: number | null; dareId?: string | null};
export type LogMoveResult =
  | {ok: true; move: MoveRow; event: BossEvent; damage: number; critical: boolean; hpLeft: number; narration: string; museUsed: boolean; proof?: {status: string; verdict: string}; completed: boolean}
  | {ok: false; error: string; status: number};

/** The game loop for one move or dare (§15.1–§15.3, §16.1, §19.1). */
export async function logMove(questId: number, user: {id: number; name: string}, input: LogMoveInput): Promise<LogMoveResult> {
  const quest = await getQuest(questId);
  if (!quest) return {ok: false, error: 'Quest not found', status: 404};
  if (!(await isQuestMember(questId, user.id))) return {ok: false, error: 'Not in this quest', status: 403};
  if (quest.status !== 'active') return {ok: false, error: 'This quest is over', status: 409};
  const dare = input.dareId ? quest.spec.dares.find(d => d.id === input.dareId) : undefined;
  if (input.dareId && !dare) return {ok: false, error: 'Unknown dare', status: 400};
  if (dare?.needsProof && !input.image) return {ok: false, error: 'This dare needs a photo', status: 400};
  const existing = dare ? await sql`select 1 from quest_moves where quest_id = ${questId} and user_id = ${user.id} and dare_id = ${dare.id}` : [];
  if (existing.length) return {ok: false, error: 'Dare already completed', status: 409};

  // Answers (never vault_events): best trust the owner's policy lets game participants see for today's move.
  let sourceTrust: Trust | null = null;
  try {
    const a = await ask(user.id, 'game_participants', 'completed_move_today', `quest:${questId}`);
    if (!a.withheld && a.value) sourceTrust = a.sourceTrust;
  } catch {
    sourceTrust = null;
  }
  if (input.source === 'vault' && !sourceTrust) return {ok: false, error: 'No shareable workout found for today. Log it manually or adjust your sharing settings.', status: 400};

  let proof: {status: 'pending' | 'approved' | 'rejected'; verdict: string; museUsed: boolean} | undefined;
  if (input.image) {
    const task = dare ? dare.text : quest.spec.levels[levelDayFor(quest) - 1]?.exercises.map(e => e.name).join(', ') || 'a workout';
    const r = await verifyProofImage({image: input.image, task});
    proof = {status: r.status, verdict: r.verdict, museUsed: r.museUsed};
    if (r.status === 'rejected') return {ok: false, error: `Proof not accepted: ${r.verdict}`, status: 422};
    if (!sourceTrust) sourceTrust = 'photo';
  }

  const levelDay = levelDayFor(quest);
  const moves = await listMoves(questId);
  const result = computeMove({spec: quest.spec, userId: user.id, levelDay, sourceTrust, amount: input.amount ?? null, dareId: dare?.id ?? null});
  const hpBefore = quest.bossHpLeft;
  const hpAfter = quest.template === 'boss' ? applyDamage(hpBefore, result.damage) : hpBefore;
  const myMovesBefore = moves.filter(m => m.userId === user.id && m.kind === 'move').length;
  const levelFinished = !dare && myMovesBefore + 1 >= levelDay && myMovesBefore < levelDay;
  const event: BossEvent = quest.template === 'boss' ? classifyMoveEvent({critical: result.critical, hpBefore, hpAfter, hpMax: quest.bossHp, levelFinished}) : levelFinished ? 'level' : result.critical ? 'critical' : 'move';

  const [moveRow] = await sql`
    insert into quest_moves (quest_id, user_id, vault_event_id, kind, dare_id, damage, note, proof_image_url, proof_status, proof_verdict)
    values (${questId}, ${user.id}, ${input.vaultEventId ?? null}, ${dare ? 'dare' : 'move'}, ${dare?.id ?? null}, ${result.damage}, ${input.note?.slice(0, 200) ?? null}, ${input.image ?? null}, ${proof?.status ?? null}, ${proof?.verdict ?? null})
    returning id, quest_id, user_id, kind, dare_id, damage, proof_status, proof_verdict, proof_image_url, created_at`;
  const move = mapMove(moveRow);
  await sql`update quests set boss_hp_left = ${hpAfter} where id = ${questId}`;
  await sql`update quest_progress set progress = coalesce(progress, '{}'::jsonb) || ${JSON.stringify({lastMoveAt: move.createdAt, level: levelDay})}::jsonb, updated_at = now() where quest_id = ${questId} and user_id = ${user.id}`;

  const bossName = quest.spec.boss?.name ?? quest.title;
  const {text, museUsed} = await narrate({event, actor: user.name, damage: result.damage, hpLeft: hpAfter, hpMax: quest.bossHp, bossName, dareText: dare?.text});
  if (quest.conversationId) {
    const payload: RallyGamePayload = {questId, event: dare && event === 'move' ? 'dare' : event, userId: user.id, text, damage: result.damage, hpLeft: hpAfter};
    await sendMessage(quest.conversationId, user, text, null, {kind: 'rally_game', payload});
  }
  await insertXpEvent({userId: user.id, sourceType: 'rally_move', sourceId: Number(move.id), xp: Math.max(1, result.damage), reason: `${bossName}: ${dare ? 'dare' : 'move'} for ${result.damage}`});

  if (dare && isRainDare(dare.text)) await awardGear(user.id, questId, gearForEvents({owned: await ownedGear(user.id), rainDare: true}));

  const members = await questMembers(questId);
  if (isBigMoment(event)) {
    for (const m of members) {
      if (m.id === user.id) continue;
      await sql`insert into notifications (user_id, actor_id, type, message) values (${m.id}, ${user.id}, 'rally', ${text})`;
      void sendPushToUser(m.id, {title: quest.title, body: text, url: `/activities/games/${questId}`, tag: `quest-${questId}`});
    }
  }

  let completed = false;
  if (event === 'boss_down') {
    await completeQuest(quest, members);
    completed = true;
  } else {
    await maybeAdapt({...quest, bossHpLeft: hpAfter});
  }
  return {ok: true, move, event, damage: result.damage, critical: result.critical, hpLeft: hpAfter, narration: text, museUsed: museUsed && (proof ? proof.museUsed : true), ...(proof ? {proof: {status: proof.status, verdict: proof.verdict}} : {}), completed};
}

/** §15.3: behind schedule -> comeback dare appended to the spec; far ahead -> boss gets +10% HP once. */
async function maybeAdapt(quest: QuestRow) {
  if (quest.template !== 'boss') return;
  const action = adaptiveAdjust({spec: quest.spec, hpMax: quest.bossHp, hpLeft: quest.bossHpLeft, now: new Date().toISOString(), alreadyBuffed: quest.buffed});
  if (action.type === 'comeback_dare') {
    const spec = {...quest.spec, dares: [...quest.spec.dares, action.dare]};
    await sql`update quests set spec = ${JSON.stringify(spec)}::jsonb where id = ${quest.id}`;
  } else if (action.type === 'buff_boss') {
    await sql`update quests set boss_hp = boss_hp + ${action.hpAdd}, boss_hp_left = boss_hp_left + ${action.hpAdd}, muse_meta = coalesce(muse_meta, '{}'::jsonb) || '{"buffed": true}'::jsonb where id = ${quest.id}`;
    if (quest.conversationId && quest.createdBy) {
      const creator = await userBrief(quest.createdBy);
      if (creator) await sendMessage(quest.conversationId, creator, `${quest.spec.boss?.name ?? 'The boss'} rallies: +${action.hpAdd} HP. Too easy for this squad.`, null, {kind: 'rally_game', payload: {questId: quest.id, event: 'move', text: `${quest.spec.boss?.name ?? 'The boss'} rallies: +${action.hpAdd} HP. Too easy for this squad.`} satisfies RallyGamePayload});
    }
  }
}

export type QuestMember = {id: number; name: string; avatarUrl: string};

async function questMembers(questId: number): Promise<QuestMember[]> {
  const rows = await sql`select u.id, u.name, u.avatar_url from quest_progress p join users u on u.id = p.user_id where p.quest_id = ${questId} order by u.id`;
  return rows.map(r => ({id: r.id as number, name: r.name as string, avatarUrl: r.avatar_url as string}));
}

async function userBrief(id: number): Promise<{id: number; name: string} | null> {
  const [r] = await sql`select id, name from users where id = ${id}`;
  return r ? {id: r.id as number, name: r.name as string} : null;
}

export async function ownedGear(userId: number): Promise<string[]> {
  const rows = await sql`select slug from avatar_gear where user_id = ${userId}`;
  return rows.map(r => r.slug as string);
}

async function awardGear(userId: number, questId: number, gear: {slug: string; label: string; description: string}[]) {
  for (const g of gear) {
    await sql`insert into avatar_gear (user_id, slug, label, description, quest_id) values (${userId}, ${g.slug}, ${g.label}, ${g.description}, ${questId}) on conflict (user_id, slug) do nothing`;
  }
}

/** Weeks of consecutive finished Rally quests ending this week (for the 4-week cape). */
async function weeksStreak(userId: number): Promise<number> {
  const rows = await sql`select distinct q.week_start from quests q join quest_progress p on p.quest_id = q.id where p.user_id = ${userId} and p.status = 'completed' and q.template is not null order by q.week_start desc limit 12`;
  let streak = 0;
  let expect = thisMonday();
  for (const r of rows) {
    const ws = new Date(r.week_start as string);
    if (Math.abs(ws.getTime() - expect.getTime()) > 2 * 86_400_000) break;
    streak += 1;
    expect = new Date(expect.getTime() - 7 * 86_400_000);
  }
  return streak;
}

/** Boss down (§18): gear for everyone, reward claims by tier, Muse recap post naming only finishers. */
async function completeQuest(quest: QuestRow, members: QuestMember[]) {
  await sql`update quests set status = 'completed', boss_hp_left = 0 where id = ${quest.id}`;
  const moves = await listMoves(quest.id);
  const finishers = members.filter(m => moves.some(mv => mv.userId === m.id));
  const finisherIds = finishers.map(f => f.id);
  if (finisherIds.length) await sql`update quest_progress set status = 'completed', updated_at = now() where quest_id = ${quest.id} and user_id = any(${finisherIds}::int[])`;
  const bossName = quest.spec.boss?.name ?? quest.title;
  const daresDone = moves.filter(m => m.kind === 'dare').length;
  const tiers = unlockedTiers({template: quest.template, hpMax: quest.bossHp, daresDone});
  for (const m of members) {
    const weeks = finisherIds.includes(m.id) ? await weeksStreak(m.id) : 0;
    await awardGear(m.id, quest.id, gearForEvents({owned: await ownedGear(m.id), questFinished: {questId: quest.id, bossName}, weeksStreak: weeks}));
    for (const r of quest.spec.rewards) {
      if (!tiers.includes(r.tier)) continue;
      const [dup] = await sql`select 1 from reward_claims where user_id = ${m.id} and quest_id = ${quest.id} and tier = ${r.tier}`;
      if (dup) continue;
      const sponsor = r.tier === 'equipment' ? 'Sponsored · Rally partner (demo)' : r.tier === 'discount' ? 'Partner gym (demo)' : null;
      const code = r.tier === 'discount' ? `RALLY-${quest.id}-${m.id}` : null;
      await sql`insert into reward_claims (user_id, quest_id, tier, label, sponsor, code) values (${m.id}, ${quest.id}, ${r.tier}, ${r.label}, ${sponsor}, ${code})`;
    }
    await insertXpEvent({userId: m.id, sourceType: 'rally_quest', sourceId: quest.id, xp: finisherIds.includes(m.id) ? 100 : 25, reason: `Quest complete: ${quest.title}`});
    await sql`insert into notifications (user_id, actor_id, type, message) values (${m.id}, ${quest.createdBy}, 'rally', ${`${bossName} is down! Your rewards from "${quest.title}" are ready in the Locker.`})`;
    void sendPushToUser(m.id, {title: 'Quest complete', body: `${bossName} is down. Rewards unlocked.`, url: `/activities/games/${quest.id}`, tag: `quest-${quest.id}`});
  }
  const days = Math.max(1, Math.ceil((Date.now() - new Date(quest.startsAt).getTime()) / 86_400_000));
  const {text} = await recapText({title: quest.title, bossName, finishers: finishers.map(f => f.name), moves: moves.length, days});
  const author = quest.createdBy ?? finisherIds[0];
  if (author) await sql`insert into posts (author_id, content, image_url, audience) values (${author}, ${`Muse Game Master · ${text}`}, ${quest.bossImageUrl && !quest.bossImageUrl.startsWith('data:') ? quest.bossImageUrl : null}, 'friends')`;
}

// ---- State for the dashboard (§17.2) ----------------------------------------------

export type RewardRow = {id: number; userId: number; tier: 'gear' | 'discount' | 'equipment'; label: string; sponsor: string | null; code: string | null; status: 'unlocked' | 'claimed'};
export type GearRow = {userId: number; slug: string; label: string; description: string | null};
export type ListingBrief = {id: number; title: string; priceCents: number; imageUrl: string; location: string};

export type QuestState = {
  quest: Omit<QuestRow, 'spec'> & {spec: GameSpec};
  viewerId: number;
  members: (QuestMember & {damage: number; moves: number; level: number; team: 'A' | 'B' | null; gear: string[]; target: number | null; handicapNote: string})[];
  mvp: number | null;
  moves: MoveRow[];
  dares: (GameSpec['dares'][number] & {doneBy: number[]})[];
  rewards: RewardRow[];
  gear: GearRow[];
  listings: ListingBrief[];
  relay: ReturnType<typeof relayState> extends infer R ? (R extends {teamOf: Map<number, 'A' | 'B'>} ? Omit<R, 'teamOf'> : never) : never;
  streak: Record<number, ReturnType<typeof streakState>>;
  levelDay: number;
  museUsed: boolean;
  /** Group-visible balance line. Null for quests made before per-activity handicaps. */
  fairness: {label: string; summary: string} | null;
  /** The viewer's own handicap and private reason; never other players'. */
  myHandicap: {targetScale: number; damageScale: number; why: string | null} | null;
};

export async function getQuestState(questId: number, viewerId: number): Promise<QuestState | null> {
  const quest = await getQuest(questId);
  if (!quest) return null;
  const [members, moves, gearRows, rewardRows, [mine]] = await Promise.all([
    questMembers(questId),
    listMoves(questId),
    sql`select g.user_id, g.slug, g.label, g.description from avatar_gear g join quest_progress p on p.user_id = g.user_id where p.quest_id = ${questId}`,
    sql`select id, user_id, tier, label, sponsor, code, status from reward_claims where quest_id = ${questId} order by id`,
    sql`select q.muse_meta->'fairness' as fairness, p.progress->>'handicapWhy' as why from quests q left join quest_progress p on p.quest_id = q.id and p.user_id = ${viewerId} where q.id = ${questId}`,
  ]);
  const fairnessRaw = (mine?.fairness ?? null) as {label?: string; summary?: string} | null;
  const myScale = quest.spec.handicaps.find(x => x.userId === viewerId);
  const gear: GearRow[] = gearRows.map(r => ({userId: r.user_id as number, slug: r.slug as string, label: r.label as string, description: (r.description as string | null) ?? null}));
  const rewards: RewardRow[] = rewardRows.map(r => ({id: r.id as number, userId: r.user_id as number, tier: r.tier as RewardRow['tier'], label: r.label as string, sponsor: (r.sponsor as string | null) ?? null, code: (r.code as string | null) ?? null, status: r.status as RewardRow['status']}));
  const contrib = contributions(moves);
  const relay = relayState(members.map(m => m.id), moves, quest.spec.levels.length * 2);
  const levelDay = levelDayFor(quest);
  const streak: QuestState['streak'] = {};
  if (quest.template === 'streak') for (const m of members) streak[m.id] = streakState(moves.filter(mv => mv.userId === m.id), quest.startsAt, new Date().toISOString());
  const tags = quest.spec.rewards.flatMap(r => r.equipmentTags ?? []);
  const listings = await listingsForTags(tags);
  const level = quest.spec.levels[levelDay - 1];
  return {
    quest,
    viewerId,
    members: members.map(m => {
      const c = contrib.byUser.get(m.id) ?? {damage: 0, moves: 0};
      const h = quest.spec.handicaps.find(x => x.userId === m.id);
      return {
        ...m,
        damage: c.damage,
        moves: c.moves,
        level: Math.min(quest.spec.levels.length, Math.max(1, moves.filter(mv => mv.userId === m.id && mv.kind === 'move').length || 1)),
        team: quest.template === 'relay' ? (relay.teamOf.get(m.id) ?? null) : null,
        gear: gear.filter(g => g.userId === m.id).map(g => g.slug),
        target: m.id === viewerId ? personalTarget(level, h?.targetScale ?? 1) : null,
        handicapNote: h?.note ?? 'scaled to your recent weeks',
      };
    }),
    mvp: contrib.mvp,
    moves,
    dares: quest.spec.dares.map(d => ({...d, doneBy: moves.filter(m => m.dareId === d.id).map(m => m.userId)})),
    rewards,
    gear,
    listings,
    relay: {legs: relay.legs, totalLegs: relay.totalLegs, winner: relay.winner},
    streak,
    levelDay,
    museUsed: quest.museUsed,
    fairness: fairnessRaw?.label ? {label: fairnessRaw.label, summary: fairnessRaw.summary ?? ''} : null,
    myHandicap: myScale ? {targetScale: myScale.targetScale, damageScale: myScale.damageScale, why: (mine?.why as string | null) ?? null} : null,
  };
}

async function listingsForTags(tags: string[]): Promise<ListingBrief[]> {
  if (!tags.length) return [];
  const pattern = tags.map(t => t.toLowerCase().split(/\s+/)[0]).filter(Boolean).map(t => `%${t}%`);
  const rows = await sql`select id, title, price_cents, image_url, location from marketplace_listings where lower(title) like any(${pattern}::text[]) or lower(category) like any(${pattern}::text[]) or category = 'Sporting Goods' order by case when lower(title) like any(${pattern}::text[]) then 0 else 1 end, created_at desc limit 4`;
  return rows.map(r => ({id: r.id as number, title: r.title as string, priceCents: r.price_cents as number, imageUrl: r.image_url as string, location: r.location as string}));
}

export async function claimReward(id: number, userId: number): Promise<RewardRow | null> {
  const [r] = await sql`update reward_claims set status = 'claimed', claimed_at = now() where id = ${id} and user_id = ${userId} returning id, user_id, tier, label, sponsor, code, status`;
  return r ? {id: r.id as number, userId: r.user_id as number, tier: r.tier as RewardRow['tier'], label: r.label as string, sponsor: (r.sponsor as string | null) ?? null, code: (r.code as string | null) ?? null, status: r.status as RewardRow['status']} : null;
}

/** Profile "Activities" tab data: avatar gear, quests finished, active quests. Public game facts only. */
export async function activitySummary(userId: number) {
  const [gearRows, finished, active] = await Promise.all([
    sql`select slug, label, description from avatar_gear where user_id = ${userId} order by earned_at desc`,
    sql`select q.id, q.title, q.spec->'boss'->>'name' as boss_name from quests q join quest_progress p on p.quest_id = q.id where p.user_id = ${userId} and p.status = 'completed' and q.template is not null order by q.created_at desc limit 8`,
    sql`select q.id, q.title, q.boss_hp, q.boss_hp_left from quests q join quest_progress p on p.quest_id = q.id where p.user_id = ${userId} and q.status = 'active' and q.template is not null order by q.created_at desc limit 4`,
  ]);
  const [{n}] = await sql`select count(*)::int as n from quest_moves where user_id = ${userId}`;
  return {
    gear: gearRows.map(r => ({slug: r.slug as string, label: r.label as string, description: (r.description as string | null) ?? null})),
    finished: finished.map(r => ({id: r.id as number, title: r.title as string, bossName: (r.boss_name as string | null) ?? null})),
    active: active.map(r => ({id: r.id as number, title: r.title as string, bossHp: (r.boss_hp as number) ?? 0, bossHpLeft: (r.boss_hp_left as number) ?? 0})),
    moves: n as number,
  };
}

export {createQuestFromSentence};
async function createQuestFromSentence(text: string, conversationId: number, creator: {id: number; name: string}) {
  return createQuest({source: {kind: 'sentence', text}, conversationId, creator});
}
