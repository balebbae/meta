/**
 * Turf persistence + game loop (§10, §7.4). Everything that leaves this module for another player is
 * cells and owners. GPS points live in turf_outings.raw and are only ever read back for their owner's
 * own pipeline run; no query here returns them.
 */
import {randomInt} from 'node:crypto';
import {neon, type NeonQueryFunction} from '@neondatabase/serverless';
import {sql} from '@/lib/db';
import {getProfile, hasOnboarded} from '@/lib/activities/onboarding';
import type {RallyInvitePayload, SystemPayload, TurfRecapPayload} from '@/lib/activities/types';
import {isMember, sendMessage} from '@/lib/messaging-queries';
import {sendPushToUser} from '@/lib/push';
import {colorAt} from './colors';
import {applyClaim, detectCut, detectLoop, fillLoop, obfuscateZone, outingTrimM, pointsToCells, score, type Arena, type GpsPoint, type LatLng, type TrailCell, type TurfGame, type Zone} from './engine';
import {scriptInfo, scriptPoints, type ReplayScript} from './fixtures';
import {finalText, narrateRecap, type FinalStanding} from './recap';
import {emptyResult, type GameStatus, type InviteStatus, type MyOuting, type OutingResult, type OutingStatus, type TurfPlayer, type TurfSettings, type TurfState} from './types';

type Actor = {id: number; name: string};
export type Game = {
  id: number;
  conversationId: number | null;
  type: string;
  settings: TurfSettings;
  status: GameStatus;
  hostId: number | null;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
};

export class TurfError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const MAX_PLAYERS = 8;
const MAX_POINTS = 40_000;
const DAY_MS = 86_400_000;

let _db: NeonQueryFunction<false, false> | null = null;
/** Raw neon client: lib/db's wrapper has no transaction(). */
function db() {
  if (!_db) _db = neon(process.env.DATABASE_URL!.trim());
  return _db;
}

const iso = (v: unknown) => (v == null ? null : new Date(v as string).toISOString());
const first = (n: string) => n.split(' ')[0] || n;

function mapGame(r: Record<string, unknown>): Game {
  const s = (r.settings ?? {}) as Partial<TurfSettings>;
  return {
    id: Number(r.id),
    conversationId: r.conversation_id == null ? null : Number(r.conversation_id),
    type: String(r.game_type),
    settings: {
      center: {lat: Number(s.center?.lat), lng: Number(s.center?.lng)},
      radiusKm: Number(s.radiusKm ?? 1.5),
      lengthDays: Number(s.lengthDays ?? 3),
      arenaLabel: String(s.arenaLabel ?? 'Turf'),
      startsAt: s.startsAt ?? null,
    },
    status: r.status as GameStatus,
    hostId: r.host_id == null ? null : Number(r.host_id),
    startsAt: iso(r.starts_at),
    endsAt: iso(r.ends_at),
    createdAt: iso(r.created_at)!,
  };
}

const arenaOf = (g: Game): Arena => ({center: g.settings.center, radiusKm: g.settings.radiusKm});

export async function listPlayers(gameId: number): Promise<TurfPlayer[]> {
  const rows = await sql`
    select i.user_id, i.status, i.color, u.name, u.avatar_url, (g.host_id = i.user_id) as is_host
    from game_invites i join users u on u.id = i.user_id join games g on g.id = i.game_id
    where i.game_id = ${gameId} order by (g.host_id = i.user_id) desc, i.responded_at nulls last, i.user_id`;
  return rows.map(r => ({id: Number(r.user_id), name: String(r.name), avatarUrl: String(r.avatar_url ?? ''), color: String(r.color ?? colorAt(0)), status: r.status as InviteStatus, isHost: Boolean(r.is_host)}));
}

async function cellCounts(gameId: number): Promise<{userId: number; cells: number; reachedAt: number}[]> {
  const rows = await sql`select owner_id, count(*)::int as n, max(claimed_at) as reached from turf_cells where game_id = ${gameId} and owner_id is not null group by owner_id`;
  return rows.map(r => ({userId: Number(r.owner_id), cells: Number(r.n), reachedAt: new Date(r.reached as string).getTime()}));
}

/** Most cells first; a tie goes to whoever reached the count first (same rule as engine.score). */
async function standings(gameId: number, players: TurfPlayer[]): Promise<FinalStanding[]> {
  const counts = new Map((await cellCounts(gameId)).map(c => [c.userId, c]));
  return players
    .filter(p => p.status === 'accepted')
    .map(p => ({userId: p.id, name: p.name, color: p.color, cells: counts.get(p.id)?.cells ?? 0, reachedAt: counts.get(p.id)?.reachedAt ?? 0}))
    .sort((a, b) => b.cells - a.cells || a.reachedAt - b.reachedAt || a.userId - b.userId)
    .map(({reachedAt: _r, ...s}) => s);
}

/**
 * Loads a game and applies anything the clock decided since the last request: a scheduled start, or the
 * end of the game (final standings card + notifications, once).
 */
export async function getGame(id: number): Promise<Game | null> {
  if (!Number.isInteger(id) || id <= 0) return null;
  const rows = await sql`select * from games where id = ${id} and game_type = 'turf'`;
  if (!rows.length) return null;
  let game = mapGame(rows[0]);
  const now = Date.now();
  if (game.status === 'pending' && game.settings.startsAt && new Date(game.settings.startsAt).getTime() <= now && (!game.endsAt || new Date(game.endsAt).getTime() > now)) {
    const started = await sql`
      update games set status = 'live', starts_at = now() where id = ${id} and status = 'pending'
        and (select count(*) from game_invites where game_id = ${id} and status = 'accepted') >= 2 returning *`;
    if (started.length) game = mapGame(started[0]);
  }
  if (game.endsAt && new Date(game.endsAt).getTime() <= now && (game.status === 'live' || game.status === 'pending')) {
    const next = game.status === 'live' ? 'ended' : 'cancelled';
    const ended = await sql`update games set status = ${next} where id = ${id} and status = ${game.status} returning *`;
    if (ended.length) {
      game = mapGame(ended[0]);
      await finishGame(game).catch(e => console.error('[turf] finishGame', e));
    } else {
      const again = await sql`select * from games where id = ${id}`;
      if (again.length) game = mapGame(again[0]);
    }
  }
  return game;
}

async function finishGame(game: Game): Promise<void> {
  await sql`update game_invites set status = 'expired' where game_id = ${game.id} and status = 'invited'`;
  await sql`update turf_outings set status = 'discarded', ended_at = now() where game_id = ${game.id} and status = 'open'`;
  if (game.status !== 'ended') return;
  const players = await listPlayers(game.id);
  const table = await standings(game.id, players);
  const text = finalText(game.settings.arenaLabel, table);
  const host = players.find(p => p.isHost) ?? players[0];
  if (game.conversationId && host) {
    const payload: TurfRecapPayload = {gameId: game.id, text, title: game.settings.arenaLabel, final: true, standings: table, cells: Object.fromEntries(table.map(s => [String(s.userId), s.cells]))};
    await sendMessage(game.conversationId, host, text, null, {kind: 'turf_recap', payload});
  }
  const ids = players.filter(p => p.status === 'accepted').map(p => p.id);
  if (ids.length) {
    await sql`
      insert into notifications (user_id, actor_id, type, message, conversation_id)
      select u, ${table[0]?.userId ?? null}, 'turf', ${text}, ${game.conversationId} from unnest(${ids}::int[]) as u`.catch(() => {});
    await Promise.all(ids.map(id => sendPushToUser(id, {title: `Turf: ${game.settings.arenaLabel}`, body: text, url: `/games/${game.id}`, tag: `game-${game.id}`}).catch(() => {})));
  }
}

/** Invited players and members of the game's thread may look at a game; everyone else gets a 404. */
export async function canView(game: Game, userId: number): Promise<boolean> {
  const inv = await sql`select 1 from game_invites where game_id = ${game.id} and user_id = ${userId}`;
  if (inv.length) return true;
  return game.conversationId != null && (await isMember(game.conversationId, userId));
}

// ---------------------------------------------------------------------------------------------------
// Create / invites / start / leave

export type CreateInput = {conversationId: number; settings: Partial<TurfSettings> & {center?: Partial<LatLng>}; invitees: number[] | 'all'};

export async function createGame(host: Actor, input: CreateInput): Promise<{game: Game; state: TurfState}> {
  const conversationId = Number(input.conversationId);
  if (!Number.isInteger(conversationId) || !(await isMember(conversationId, host.id))) throw new TurfError('You are not in this chat', 403);
  const s = input.settings ?? {};
  const lat = Number(s.center?.lat);
  const lng = Number(s.center?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 85 || Math.abs(lng) > 180) throw new TurfError('Pick an arena center (lat, lng)');
  const radiusKm = s.radiusKm == null ? 1.5 : Number(s.radiusKm);
  if (!Number.isFinite(radiusKm) || radiusKm < 0.3 || radiusKm > 3) throw new TurfError('Arena radius must be between 0.3 and 3 km');
  const lengthDays = s.lengthDays == null ? 3 : Number(s.lengthDays);
  if (![1, 3, 7].includes(lengthDays)) throw new TurfError('Length must be 1, 3 or 7 days');
  const arenaLabel = String(s.arenaLabel ?? '').trim().slice(0, 60) || 'Turf arena';
  let startsAt: string | null = null;
  if (s.startsAt) {
    const t = new Date(s.startsAt).getTime();
    if (!Number.isFinite(t)) throw new TurfError('Invalid start time');
    startsAt = new Date(t).toISOString();
  }

  const members = (await sql`select user_id from conversation_members where conversation_id = ${conversationId} and user_id <> ${host.id} order by user_id`).map(r => Number(r.user_id));
  const wanted = input.invitees === 'all' || input.invitees == null ? members : [...new Set((Array.isArray(input.invitees) ? input.invitees : []).map(Number))].filter(id => members.includes(id));
  if (!wanted.length) throw new TurfError('Invite at least one person from this chat');
  if (wanted.length + 1 > MAX_PLAYERS) throw new TurfError('Turf is for 2 to 8 players');

  const settings: TurfSettings = {center: {lat, lng}, radiusKm, lengthDays, arenaLabel, startsAt};
  const endsAt = new Date((startsAt ? new Date(startsAt).getTime() : Date.now()) + lengthDays * DAY_MS).toISOString();
  const [row] = await sql`
    insert into games (conversation_id, game_type, settings, status, host_id, ends_at)
    values (${conversationId}, 'turf', ${JSON.stringify(settings)}::jsonb, 'pending', ${host.id}, ${endsAt}) returning *`;
  const game = mapGame(row);
  const ids = [host.id, ...wanted];
  // the host picked the arena and agreed to the consent line in the create dialog
  await sql`
    insert into game_invites (game_id, user_id, invited_by, status, color, location_consent_at, responded_at)
    select ${game.id}, t.uid, ${host.id}, case when t.uid = ${host.id} then 'accepted' else 'invited' end, t.color,
           case when t.uid = ${host.id} then now() end, case when t.uid = ${host.id} then now() end
    from unnest(${ids}::int[], ${ids.map((_, i) => colorAt(i))}::text[]) as t(uid, color)
    on conflict do nothing`;

  const payload: RallyInvitePayload = {gameId: game.id, gameType: 'turf', title: `Turf: ${arenaLabel}`, arenaLabel, endsAt};
  // sendMessage also writes a notification and a push for every other member of the thread (the invitees)
  await sendMessage(conversationId, host, `${first(host.name)} invited you to Turf: ${arenaLabel}`, null, {kind: 'rally_invite', payload});
  return {game, state: await buildState(game, host.id)};
}

function pastHalfway(game: Game): boolean {
  if (game.status !== 'live' || !game.startsAt || !game.endsAt) return false;
  const a = new Date(game.startsAt).getTime();
  const b = new Date(game.endsAt).getTime();
  return Date.now() > a + (b - a) / 2;
}

export async function respondInvite(game: Game, user: Actor, status: 'accepted' | 'declined', locationConsent: boolean): Promise<void> {
  const rows = await sql`select status from game_invites where game_id = ${game.id} and user_id = ${user.id}`;
  if (!rows.length) throw new TurfError('You are not invited to this game', 403);
  const current = rows[0].status as InviteStatus;
  if (game.status === 'ended' || game.status === 'cancelled' || current === 'expired') throw new TurfError('This invite has expired', 410);
  if (current === 'accepted') {
    if (status === 'accepted') return;
    throw new TurfError('You already joined. Use Leave game instead.');
  }
  if (current === 'left') throw new TurfError('You left this game');
  if (status === 'accepted') {
    if (locationConsent !== true) throw new TurfError('Turf needs your location consent to join. Saying no declines the game.');
    if (pastHalfway(game)) throw new TurfError('This game is more than halfway through', 410);
    await sql`update game_invites set status = 'accepted', location_consent_at = now(), responded_at = now() where game_id = ${game.id} and user_id = ${user.id}`;
    if (game.hostId && game.hostId !== user.id) {
      await sendPushToUser(game.hostId, {title: `Turf: ${game.settings.arenaLabel}`, body: `${first(user.name)} is in.`, url: `/games/${game.id}`, tag: `game-${game.id}`}).catch(() => {});
    }
    return;
  }
  if (current === 'declined') return;
  await sql`update game_invites set status = 'declined', responded_at = now() where game_id = ${game.id} and user_id = ${user.id}`;
  // Quiet: one line that only the host can see. No notification or push for anyone else.
  if (game.hostId && game.hostId !== user.id) {
    const text = `${first(user.name)} passed on Turf: ${game.settings.arenaLabel}`;
    if (game.conversationId) {
      const payload: SystemPayload & {gameId: number} = {text, visibleTo: [game.hostId], gameId: game.id};
      await sql`insert into messages (conversation_id, sender_id, body, kind, payload) values (${game.conversationId}, ${user.id}, ${text}, 'system', ${JSON.stringify(payload)}::jsonb)`;
    }
    await sql`insert into notifications (user_id, actor_id, type, message, conversation_id) values (${game.hostId}, ${user.id}, 'turf', ${text}, ${game.conversationId})`.catch(() => {});
  }
}

export async function startGame(game: Game, user: Actor): Promise<Game> {
  if (game.hostId !== user.id) throw new TurfError('Only the host can start the game', 403);
  if (game.status !== 'pending') throw new TurfError('This game has already started');
  const started = await sql`
    update games set status = 'live', starts_at = now() where id = ${game.id} and status = 'pending'
      and (select count(*) from game_invites where game_id = ${game.id} and status = 'accepted') >= 2 returning *`;
  if (!started.length) throw new TurfError('Turf needs at least 2 accepted players to start');
  const next = mapGame(started[0]);
  if (next.conversationId) {
    // relative, so it reads the same in every time zone (the card shows the absolute time in the viewer's zone)
    const left = next.endsAt ? Math.max(0, new Date(next.endsAt).getTime() - Date.now()) : 0;
    const days = Math.floor(left / DAY_MS);
    const hours = Math.floor((left % DAY_MS) / 3_600_000);
    const ends = left ? (days > 0 ? `${days}d ${hours}h` : `${Math.max(1, hours)}h`) : '';
    const text = `Turf: ${next.settings.arenaLabel} is live${ends ? `. Ends in ${ends}` : ''}. Go claim some ground.`;
    await sendMessage(next.conversationId, user, text, null, {kind: 'system', payload: {text, gameId: next.id}});
  }
  return next;
}

/** The host can nudge people who have not answered, once per invitee. */
export async function resendInvites(game: Game, user: Actor): Promise<number> {
  if (game.hostId !== user.id) throw new TurfError('Only the host can resend invites', 403);
  if (game.status === 'ended' || game.status === 'cancelled') throw new TurfError('This game is over', 410);
  const rows = await sql`update game_invites set resent_at = now() where game_id = ${game.id} and status = 'invited' and resent_at is null returning user_id`;
  const ids = rows.map(r => Number(r.user_id));
  if (!ids.length) return 0;
  const text = `${first(user.name)} is waiting on you for Turf: ${game.settings.arenaLabel}`;
  await sql`insert into notifications (user_id, actor_id, type, message, conversation_id) select u, ${user.id}, 'turf', ${text}, ${game.conversationId} from unnest(${ids}::int[]) as u`.catch(() => {});
  await Promise.all(ids.map(id => sendPushToUser(id, {title: `Turf: ${game.settings.arenaLabel}`, body: text, url: `/games/${game.id}`, tag: `game-${game.id}`}).catch(() => {})));
  return ids.length;
}

/** Leaving turns your cells neutral and drops any open outing. */
/** Turf games the user has accepted and not left, that haven't ended. */
export async function listActiveGamesForUser(userId: number): Promise<{id: number; label: string; status: GameStatus}[]> {
  const rows = await sql`
    select g.id, g.status, g.settings->>'arenaLabel' as label from games g join game_invites i on i.game_id = g.id
    where i.user_id = ${userId} and i.status = 'accepted' and g.status in ('pending', 'live') order by g.created_at desc limit 20`;
  return rows.map(r => ({id: Number(r.id), label: String(r.label ?? 'Turf'), status: r.status as GameStatus}));
}

export async function leaveGame(game: Game, user: Actor): Promise<void> {
  const rows = await sql`update game_invites set status = 'left', responded_at = now() where game_id = ${game.id} and user_id = ${user.id} and status = 'accepted' returning user_id`;
  if (!rows.length) throw new TurfError('You are not in this game');
  await db().transaction([
    db()`update turf_cells set owner_id = null, claimed_at = now() where game_id = ${game.id} and owner_id = ${user.id}`,
    db()`update turf_outings set status = 'discarded', ended_at = now() where game_id = ${game.id} and user_id = ${user.id} and status = 'open'`,
  ]);
  if (game.conversationId && (game.status === 'live' || game.status === 'pending')) {
    const text = `${first(user.name)} left Turf: ${game.settings.arenaLabel}. Their ground is neutral again.`;
    await sendMessage(game.conversationId, user, text, null, {kind: 'system', payload: {text, gameId: game.id}});
  }
}

// ---------------------------------------------------------------------------------------------------
// Outings: points -> cells -> cuts / loops -> turf_cells

type OutingRow = {id: number; userId: number; status: OutingStatus; source: string; startedAt: string; endedAt: string | null; raw: GpsPoint[]; trail: TrailCell[]; consumed: number; cellsClaimed: number; result: OutingResult};

function mapOuting(r: Record<string, unknown>): OutingRow {
  return {
    id: Number(r.id),
    userId: Number(r.user_id),
    status: r.status as OutingStatus,
    source: String(r.source ?? 'live'),
    startedAt: iso(r.started_at)!,
    endedAt: iso(r.ended_at),
    raw: (r.raw as GpsPoint[] | null) ?? [],
    trail: (r.trail as TrailCell[] | null) ?? [],
    consumed: Number(r.consumed ?? 0),
    cellsClaimed: Number(r.cells_claimed ?? 0),
    result: {...emptyResult(), ...((r.result as Partial<OutingResult> | null) ?? {})},
  };
}

/** Your open trail as cells, without the hidden first/last 200 m. */
const openTrail = (o: Pick<OutingRow, 'trail' | 'consumed'>) => o.trail.slice(o.consumed).filter(c => !c.hidden);

function toMyOuting(o: OutingRow): MyOuting {
  return {id: o.id, status: o.status, source: o.source, startedAt: o.startedAt, cellsClaimed: o.cellsClaimed, trail: o.status === 'open' ? [...new Set(openTrail(o).map(c => c.cell))] : [], result: o.result};
}

async function requirePlayer(game: Game, userId: number): Promise<void> {
  const rows = await sql`select status, location_consent_at from game_invites where game_id = ${game.id} and user_id = ${userId}`;
  if (!rows.length || rows[0].status !== 'accepted') throw new TurfError('Accept the invite to play', 403);
  if (!rows[0].location_consent_at) throw new TurfError('Location consent is required for this game', 403);
}

async function privacyZones(userId: number): Promise<Zone[]> {
  return (await listZones(userId)).map(({lat, lng, radiusM}) => ({lat, lng, radiusM}));
}

export async function startOuting(game: Game, user: Actor, source: 'live' | 'gpx' | 'replay' = 'live'): Promise<MyOuting> {
  if (game.status !== 'live') throw new TurfError(game.status === 'pending' ? 'The host has not started this game yet' : 'This game is over', 409);
  await requirePlayer(game, user.id);
  const open = await sql`select * from turf_outings where game_id = ${game.id} and user_id = ${user.id} and status = 'open' order by id desc limit 1`;
  if (open.length) {
    if (source === 'live') return toMyOuting(mapOuting(open[0]));
    await sql`update turf_outings set status = case when cells_claimed > 0 then 'claimed' else 'discarded' end, ended_at = now() where game_id = ${game.id} and user_id = ${user.id} and status = 'open'`;
  }
  const [row] = await sql`insert into turf_outings (game_id, user_id, source) values (${game.id}, ${user.id}, ${source}) returning *`;
  return toMyOuting(mapOuting(row));
}

export type PointsResult = {outing: MyOuting; gained: number; cut: boolean; recap: string | null};

/**
 * One batch of GPS points (or a whole GPX / replay route). Appends to the owner's raw track, recomputes
 * the trail, judges cuts by cell + timestamp against every other open outing, closes loops, and writes
 * the claim as one multi-row upsert inside a transaction with the outing update.
 */
export async function addPoints(game: Game, user: Actor, outingId: number, points: GpsPoint[], finish: boolean, opts: {ongoingRecap?: boolean} = {}): Promise<PointsResult> {
  await requirePlayer(game, user.id);
  const rows = await sql`select * from turf_outings where id = ${outingId} and game_id = ${game.id} and user_id = ${user.id}`;
  if (!rows.length) throw new TurfError('Outing not found', 404);
  const outing = mapOuting(rows[0]);
  if (outing.status !== 'open') return {outing: toMyOuting(outing), gained: 0, cut: outing.status === 'cut', recap: null};
  if (game.status !== 'live') {
    await sql`update turf_outings set status = 'discarded', ended_at = now() where id = ${outing.id} and status = 'open'`;
    throw new TurfError('This game is over', 409);
  }

  const clean = points
    .map(p => ({lat: Number(p?.lat), lng: Number(p?.lng), t: Math.round(Number(p?.t))}))
    .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng) && Number.isFinite(p.t) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180);
  const raw = [...outing.raw, ...clean].sort((a, b) => a.t - b.t).slice(-MAX_POINTS);
  const arena = arenaOf(game);
  const trail = pointsToCells(raw, arena, {zones: await privacyZones(user.id), trimM: outingTrimM(outing.id), keepHidden: true});

  const [cellRows, otherRows, playerRows] = await Promise.all([
    sql`select cell, owner_id from turf_cells where game_id = ${game.id} and owner_id is not null`,
    sql`select id, user_id, trail, consumed from turf_outings where game_id = ${game.id} and status = 'open' and user_id <> ${user.id}`,
    listPlayers(game.id),
  ]);
  const board: TurfGame = {cells: new Map(cellRows.map(r => [String(r.cell), {owner: Number(r.owner_id), at: 0}]))};
  const owned = new Set<string>();
  for (const [cell, o] of board.cells) if (o.owner === user.id) owned.add(cell);

  const result: OutingResult = {...outing.result, taken: {...outing.result.taken}, cutVictims: [...outing.result.cutVictims]};
  const mine = {userId: user.id, trail: trail.slice(outing.consumed).filter(c => !c.hidden)};
  const myWhole = {userId: user.id, trail: trail.filter(c => !c.hidden)};
  const cutOutingIds: number[] = [];
  let cutBy: number | null = null;
  for (const r of otherRows) {
    const other = {userId: Number(r.user_id), trail: ((r.trail as TrailCell[]) ?? []).slice(Number(r.consumed ?? 0)).filter(c => !c.hidden)};
    const theirWhole = {userId: other.userId, trail: ((r.trail as TrailCell[]) ?? []).filter(c => !c.hidden)};
    if (detectCut(other, myWhole)) {
      cutOutingIds.push(Number(r.id));
      if (!result.cutVictims.includes(other.userId)) result.cutVictims.push(other.userId);
    }
    if (cutBy == null && detectCut(mine, theirWhole)) cutBy = other.userId;
  }

  // Close every loop in the unclaimed part of the trail. A cut outing claims nothing from here on.
  let consumed = Math.min(outing.consumed, trail.length);
  const claim: string[] = [];
  let loops = 0;
  if (cutBy == null) {
    for (let guard = 0; guard < 50; guard++) {
      const loop = detectLoop(trail.slice(consumed), owned);
      if (!loop.closed) break;
      const cells = fillLoop(loop.loop, arena);
      for (const c of cells) {
        if (!owned.has(c)) claim.push(c);
        owned.add(c);
      }
      if (cells.length) loops += 1;
      consumed += loop.endIndex + 1;
    }
  }
  // what the engine says the claim does, for the response; the DB statement below is the source of truth
  const preview = applyClaim(board, user.id, claim, Date.now());

  const nextStatus: OutingStatus = cutBy != null ? 'cut' : finish ? (outing.cellsClaimed + preview.gained > 0 ? 'claimed' : 'discarded') : 'open';
  const ended = nextStatus !== 'open';
  const tx = db();
  const [claimed] = await tx.transaction([
    tx`
      with prev as (select cell, owner_id from turf_cells where game_id = ${game.id} and cell = any(${claim}::text[])),
      up as (
        insert into turf_cells (game_id, cell, owner_id, claimed_at)
        select ${game.id}, c, ${user.id}, now() from unnest(${claim}::text[]) as c
        where exists (select 1 from games where id = ${game.id} and status = 'live')
          and exists (select 1 from turf_outings where id = ${outing.id} and status = 'open')
        on conflict (game_id, cell) do update set owner_id = excluded.owner_id, claimed_at = excluded.claimed_at
          where turf_cells.owner_id is distinct from excluded.owner_id
        returning cell)
      select up.cell, prev.owner_id as prev_owner from up left join prev on prev.cell = up.cell`,
    tx`
      update turf_outings set raw = ${JSON.stringify(raw)}::jsonb, trail = ${JSON.stringify(trail)}::jsonb, trail_cells = ${[...new Set(trail.filter(c => !c.hidden).map(c => c.cell))]}::text[],
        consumed = ${consumed}, status = ${nextStatus}, ended_at = case when ${ended} then now() else null end
      where id = ${outing.id} and status = 'open'`,
    tx`update turf_outings set status = 'cut', ended_at = now(), result = result || ${JSON.stringify({cutBy: user.id})}::jsonb where id = any(${cutOutingIds}::bigint[]) and status = 'open'`,
  ]);

  const gained = claimed.length;
  for (const r of claimed) {
    if (r.prev_owner != null && Number(r.prev_owner) !== user.id) result.taken[String(r.prev_owner)] = (result.taken[String(r.prev_owner)] ?? 0) + 1;
  }
  result.gained += gained;
  result.loops += loops;
  if (cutBy != null) result.cutBy = cutBy;
  await sql`update turf_outings set cells_claimed = cells_claimed + ${gained}, result = ${JSON.stringify(result)}::jsonb where id = ${outing.id}`;

  let recap: string | null = null;
  if (ended || opts.ongoingRecap) {
    recap = await postRecap(game, user, result, playerRows, !ended).catch(e => {
      console.error('[turf] recap', e);
      return null;
    });
    if (result.gained > 0) {
      // Audit trail for the owner's Muse page: what the game received, and that it was not a route.
      const value = `${result.gained} claimed cells, no route`;
      await sql`
        insert into answers_log (owner_id, asker, audience, question, answer, level)
        values (${user.id}, ${`Turf: ${game.settings.arenaLabel}`}, 'game_participants', 'turf_claimed_cells',
          ${JSON.stringify({question: 'turf_claimed_cells', value, level: 'rounded', sourceTrust: null, withheld: false})}::jsonb, 'rounded')`.catch(() => {});
    }
  }
  const after: OutingRow = {...outing, raw, trail, consumed, status: nextStatus, cellsClaimed: outing.cellsClaimed + gained, result};
  return {outing: toMyOuting(after), gained, cut: cutBy != null, recap};
}

async function postRecap(game: Game, user: Actor, result: OutingResult, players: TurfPlayer[], ongoing: boolean): Promise<string | null> {
  if (!game.conversationId) return null;
  const names = Object.fromEntries(players.map(p => [String(p.id), p.name]));
  const out = await narrateRecap({actor: user.name, result, names, ongoing});
  if (!out) return null;
  const counts = await cellCounts(game.id);
  const payload: TurfRecapPayload = {gameId: game.id, text: out.text, title: game.settings.arenaLabel, museUsed: out.museUsed, cells: Object.fromEntries(counts.map(c => [String(c.userId), c.cells]))};
  await sendMessage(game.conversationId, user, out.text, null, {kind: 'turf_recap', payload});
  return out.text;
}

/** GPX upload: a whole route through the same pipeline as live points. */
export async function importRoute(game: Game, user: Actor, points: GpsPoint[], source: 'gpx' | 'replay' | 'strava', finish = true, externalId?: string): Promise<PointsResult> {
  if (points.length < 2) throw new TurfError('No track points found in that file');
  if (source === 'strava') {
    if (!externalId) throw new TurfError('Missing Strava activity id');
    if (game.status !== 'live') throw new TurfError('This game is not live', 409);
    await requirePlayer(game, user.id);
    const tx = db();
    const [, rows] = await tx.transaction([
      tx`select pg_advisory_xact_lock(${game.id}::int, ${user.id}::int)`,
      tx`insert into turf_outings (game_id, user_id, source, result)
        select ${game.id}, ${user.id}, 'strava', ${JSON.stringify({stravaActivityId: externalId})}::jsonb
        where not exists (select 1 from turf_outings where game_id = ${game.id} and user_id = ${user.id}
          and source = 'strava' and result->>'stravaActivityId' = ${externalId}) returning *`,
    ]);
    if (!rows.length) {
      const [existing] = await sql`select * from turf_outings where game_id = ${game.id} and user_id = ${user.id}
        and source = 'strava' and result->>'stravaActivityId' = ${externalId} order by id limit 1`;
      return {outing: toMyOuting(mapOuting(existing)), gained: 0, cut: false, recap: null};
    }
    // shortcut: reserve before processing for at-most-once claims; failed imports need a board reset to retry.
    const outingId = Number(rows[0].id);
    try {
      return await addPoints(game, user, outingId, points.slice(0, MAX_POINTS), true);
    } catch (e) {
      await sql`update turf_outings set status = 'discarded', ended_at = now() where id = ${outingId} and status = 'open'`;
      throw e;
    }
  }
  const outing = await startOuting(game, user, source);
  return addPoints(game, user, outing.id, points.slice(0, MAX_POINTS), finish, {ongoingRecap: !finish});
}

/**
 * Stage demo: replays a recorded route around the game's arena centre as the signed-in player, through
 * the same pipeline as live GPS. Timestamps are shifted to "now" (after any trail already open) so cuts
 * are judged the way they would be live.
 */
export async function replayScript(game: Game, user: Actor, script: ReplayScript): Promise<PointsResult> {
  const info = scriptInfo(script);
  const base = scriptPoints(script, game.settings.center, 0);
  const duration = base[base.length - 1].t;
  const rows = await sql`select trail from turf_outings where game_id = ${game.id} and status = 'open' and user_id <> ${user.id}`;
  let latest = 0;
  for (const r of rows) for (const c of (r.trail as TrailCell[]) ?? []) if (c.t > latest) latest = c.t;
  const start = Math.max(Date.now() - duration, latest + 1000);
  return importRoute(game, user, base.map(p => ({...p, t: p.t + start})), 'replay', info.finish);
}

/** Host-only rehearsal reset: wipes the board and every outing of this game. */
export async function resetBoard(game: Game, user: Actor): Promise<void> {
  if (game.hostId !== user.id) throw new TurfError('Only the host can reset the board', 403);
  await db().transaction([db()`delete from turf_cells where game_id = ${game.id}`, db()`delete from turf_outings where game_id = ${game.id}`]);
}

// ---------------------------------------------------------------------------------------------------
// State

export async function buildState(game: Game, viewerId: number): Promise<TurfState> {
  const players = await listPlayers(game.id);
  const me = players.find(p => p.id === viewerId);
  const accepted = me?.status === 'accepted';
  const [cellRows, outingRows, profile, pendingResend] = await Promise.all([
    accepted ? sql`select cell, owner_id, claimed_at from turf_cells where game_id = ${game.id} and owner_id is not null` : Promise.resolve([]),
    accepted ? sql`select * from turf_outings where game_id = ${game.id} and user_id = ${viewerId} order by id desc limit 1` : Promise.resolve([]),
    getProfile(viewerId).catch(() => null),
    game.hostId === viewerId ? sql`select count(*)::int as n from game_invites where game_id = ${game.id} and status = 'invited' and resent_at is null` : Promise.resolve([{n: 0}]),
  ]);
  const board: TurfGame = {cells: new Map(cellRows.map(r => [String(r.cell), {owner: Number(r.owner_id), at: new Date(r.claimed_at as string).getTime()}]))};
  const inGame = players.filter(p => p.status === 'accepted').map(p => p.id);
  const scores = accepted ? score(board, inGame).filter(s => inGame.includes(s.playerId)).map((s, i) => ({playerId: s.playerId, cells: s.cells, rank: i + 1})) : [];
  const isHost = game.hostId === viewerId;
  const open = game.status === 'pending' || game.status === 'live';
  // "Sam passed" is for the host only: everyone else sees a declined player as still invited
  const shown = players
    .filter(p => p.status !== 'left' || p.id === viewerId)
    .map(p => (p.status === 'declined' && !isHost && p.id !== viewerId ? {...p, status: 'invited' as InviteStatus} : p));
  const last = outingRows.length ? mapOuting(outingRows[0]) : null;
  return {
    id: game.id,
    type: 'turf',
    title: game.settings.arenaLabel,
    status: game.status,
    conversationId: game.conversationId,
    hostId: game.hostId,
    arena: {center: game.settings.center, radiusKm: game.settings.radiusKm},
    lengthDays: game.settings.lengthDays,
    startsAt: game.startsAt,
    endsAt: game.endsAt,
    now: new Date().toISOString(),
    players: shown,
    cells: [...board.cells].map(([cell, o]) => [cell, o.owner] as [string, number]),
    scores,
    winnerId: game.status === 'ended' && scores[0]?.cells ? scores[0].playerId : null,
    me: {
      id: viewerId,
      status: me?.status ?? 'none',
      isHost,
      onboarded: profile ? hasOnboarded(profile) : false,
      canAccept: Boolean(me) && (me!.status === 'invited' || me!.status === 'declined') && open && !pastHalfway(game),
      canStart: isHost && game.status === 'pending' && inGame.length >= 2,
      canResend: isHost && open && Number(pendingResend[0]?.n ?? 0) > 0,
      // a finished outing is kept for a minute so the tracker can show how it ended
      outing: last && (last.status === 'open' || (last.endedAt && Date.now() - new Date(last.endedAt).getTime() < 60_000)) ? toMyOuting(last) : null,
    },
  };
}

// ---------------------------------------------------------------------------------------------------
// Privacy zones (owner only)

export type PrivacyZone = {id: number; label: string; lat: number; lng: number; radiusM: number};

const unit = () => randomInt(2 ** 47) / 2 ** 47;

export async function listZones(userId: number): Promise<PrivacyZone[]> {
  // rows from before obfuscation: offset + enlarge them once, on first read (the guard stops a double offset)
  const legacy = await sql`select id, lat, lng, radius_m from turf_privacy_zones where user_id = ${userId} and not obfuscated`;
  for (const r of legacy) {
    const z = obfuscateZone({lat: Number(r.lat), lng: Number(r.lng), radiusM: Number(r.radius_m)}, unit(), unit());
    await sql`update turf_privacy_zones set lat = ${z.lat}, lng = ${z.lng}, radius_m = ${z.radiusM}, obfuscated = true where id = ${r.id} and not obfuscated`;
  }
  const rows = await sql`select id, label, lat, lng, radius_m from turf_privacy_zones where user_id = ${userId} order by id`;
  return rows.map(r => ({id: Number(r.id), label: String(r.label), lat: Number(r.lat), lng: Number(r.lng), radiusM: Number(r.radius_m)}));
}

export async function addZone(userId: number, z: {label?: string; lat: number; lng: number; radiusM?: number}): Promise<PrivacyZone[]> {
  const lat = Number(z.lat);
  const lng = Number(z.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new TurfError('Invalid location');
  const radius = Math.min(1000, Math.max(50, Math.round(Number(z.radiusM ?? 200)) || 200));
  const existing = await sql`select count(*)::int as n from turf_privacy_zones where user_id = ${userId}`;
  if (Number(existing[0].n) >= 10) throw new TurfError('You can have up to 10 privacy zones');
  // the true point is never stored: only the offset, enlarged circle that still covers it (see obfuscateZone)
  const o = obfuscateZone({lat, lng, radiusM: radius}, unit(), unit());
  await sql`insert into turf_privacy_zones (user_id, label, lat, lng, radius_m, obfuscated) values (${userId}, ${String(z.label ?? 'Home').trim().slice(0, 30) || 'Home'}, ${o.lat}, ${o.lng}, ${o.radiusM}, true)`;
  return listZones(userId);
}

export async function removeZone(userId: number, id: number): Promise<PrivacyZone[]> {
  await sql`delete from turf_privacy_zones where id = ${id} and user_id = ${userId}`;
  return listZones(userId);
}
