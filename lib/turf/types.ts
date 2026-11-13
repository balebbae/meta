import type {LatLng} from './engine';
import type {HeroPick} from '@/lib/kingdom/cast';

export type TurfSettings = {center: LatLng; radiusKm: number; lengthDays: number; arenaLabel: string; startsAt?: string | null};
export type GameStatus = 'pending' | 'live' | 'ended' | 'cancelled';
export type InviteStatus = 'invited' | 'accepted' | 'declined' | 'expired' | 'left';
export type OutingStatus = 'open' | 'claimed' | 'cut' | 'discarded';

export type TurfPlayer = {id: number; name: string; avatarUrl: string; color: string; status: InviteStatus; isHost: boolean; hero?: HeroPick | null};
export type TurfScore = {playerId: number; cells: number; rank: number};

/** What an outing did, from the deterministic engine only. This is all Muse ever sees. */
export type OutingResult = {
  loops: number;
  gained: number;
  /** userId -> cells taken from them. */
  taken: Record<string, number>;
  /** players whose open trail this outing cut. */
  cutVictims: number[];
  cutBy: number | null;
};

export type MyOuting = {
  id: number;
  status: OutingStatus;
  source: string;
  startedAt: string;
  cellsClaimed: number;
  /** Your own open trail (cells only, minus the hidden first/last 200 m). Never sent to anyone else. */
  trail: string[];
  result: OutingResult;
};

/**
 * GET /api/games/[id]/state. Cells and owners only: no routes, no positions, no outing times of other
 * players. Players who have not accepted get the arena and the player list, but no cells.
 */
export type TurfState = {
  id: number;
  type: 'turf';
  title: string;
  status: GameStatus;
  conversationId: number | null;
  hostId: number | null;
  arena: {center: LatLng; radiusKm: number};
  lengthDays: number;
  startsAt: string | null;
  endsAt: string | null;
  now: string;
  players: TurfPlayer[];
  /** [cell, ownerId] pairs. Empty unless the viewer has accepted. */
  cells: [string, number][];
  scores: TurfScore[];
  winnerId: number | null;
  me: {
    id: number;
    status: InviteStatus | 'none';
    isHost: boolean;
    onboarded: boolean;
    canAccept: boolean;
    canStart: boolean;
    canResend: boolean;
    outing: MyOuting | null;
  };
};

export const emptyResult = (): OutingResult => ({loops: 0, gained: 0, taken: {}, cutVictims: [], cutBy: null});
