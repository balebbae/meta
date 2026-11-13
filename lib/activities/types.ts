/**
 * Shared contracts for Activities (spec §5, §7, §10, §15). Every module (connectors, Answers,
 * Rally, Turf, Discover, mentor exchange) imports from here; do not redefine these elsewhere.
 */

export type Platform = 'ios' | 'android' | 'web';

export type ConnectorId =
  | 'apple_health'
  | 'health_connect'
  | 'google_health'
  | 'strava'
  | 'oura'
  | 'whoop'
  | 'garmin'
  | 'aggregator'
  | 'phone_steps'
  | 'proof_photo'
  | 'manual'
  | 'mock';

export type EventKind = 'run' | 'walk' | 'ride' | 'strength' | 'yoga' | 'swim' | 'steps' | 'sleep' | 'recovery' | 'other';

/** verified > device > photo > self_reported */
export type Trust = 'self_reported' | 'photo' | 'device' | 'verified';
export const TRUST_RANK: Record<Trust, number> = {self_reported: 0, photo: 1, device: 2, verified: 3};

/** Normalized event. Stored only in the owner's vault (vault_events); never read directly by games or other people. */
export type RawEvent = {
  userId: number;
  source: ConnectorId;
  externalId: string;
  kind: EventKind;
  startedAt: string;
  endedAt?: string;
  distanceKm?: number;
  durationMin?: number;
  steps?: number;
  avgHr?: number;
  trust: Trust;
  /** 'owner_only' for Strava (and WHOOP detail fields): the Answers API refuses them for any audience but only_me. */
  displayScope?: 'normal' | 'owner_only';
  raw?: unknown;
};

export type ConnectResult =
  | {type: 'redirect'; url: string}
  | {type: 'connected'}
  | {type: 'instructions'; title: string; steps: string[]}
  | {type: 'unavailable'; reason: string};

export interface Connector {
  id: ConnectorId;
  label: string;
  platforms: Platform[];
  /** OAuth redirect, SDK permission, shortcut install, or nothing. */
  connect(userId: number, origin: string): Promise<ConnectResult>;
  /** Webhook / upload / poll payload -> normalized events (vault only). */
  ingest(userId: number, payload: unknown): Promise<RawEvent[]>;
  /** Revoke tokens; delete or keep vault data per user choice. */
  disconnect(userId: number, deleteData: boolean): Promise<void>;
}

// ---- Privacy model (§7) -------------------------------------------------

export type Category = 'workouts' | 'steps' | 'heart' | 'sleep' | 'body' | 'location';
export const CATEGORIES: Category[] = ['workouts', 'steps', 'heart', 'sleep', 'body', 'location'];

export type Audience = 'only_me' | 'game_participants' | 'friends' | 'mentor_match' | 'public';
export const AUDIENCES: Audience[] = ['only_me', 'game_participants', 'friends', 'mentor_match', 'public'];

export type ShareLevel = 'exact' | 'rounded' | 'boolean' | 'muse_only' | 'none';
export type Answer = {
  question: QuestionType;
  value: number | boolean | string | null;
  level: ShareLevel;
  sourceTrust: Trust | null;
  /** True when the policy allowed nothing for this audience. */
  withheld: boolean;
};

/** Fixed list so repeated yes/no probing can't recover exact values (§21.1). */
export type QuestionType =
  | 'workouts_this_week'
  | 'active_days_this_week'
  | 'distance_this_week_km'
  | 'distance_last_7_days_km'
  | 'active_days_last_7_days'
  | 'completed_move_today'
  | 'completed_run_3km_today'
  | 'steps_today'
  | 'avg_hr_this_week'
  | 'sleep_last_night_hours'
  | 'last_workout'
  // Sessions of one kind over the last 14 days, banded like workouts_this_week. Feeds per-game handicaps.
  | 'runs_2w'
  | 'rides_2w'
  | 'strength_2w'
  | 'yoga_2w'
  | 'workouts_2w'
  // Code-decided level over 4 weeks (lib/activities/level.ts): rounded = tier only.
  | 'level_4w'
  | 'steps_avg_7d'
  | 'sleep_avg_7d';

export const QUESTION_CATEGORY: Record<QuestionType, Category> = {
  workouts_this_week: 'workouts',
  active_days_this_week: 'workouts',
  distance_this_week_km: 'workouts',
  distance_last_7_days_km: 'workouts',
  active_days_last_7_days: 'workouts',
  completed_move_today: 'workouts',
  completed_run_3km_today: 'workouts',
  last_workout: 'workouts',
  runs_2w: 'workouts',
  rides_2w: 'workouts',
  strength_2w: 'workouts',
  yoga_2w: 'workouts',
  workouts_2w: 'workouts',
  level_4w: 'workouts',
  steps_today: 'steps',
  steps_avg_7d: 'steps',
  avg_hr_this_week: 'heart',
  sleep_last_night_hours: 'sleep',
  sleep_avg_7d: 'sleep',
};

// ---- Tags (§4 step 1) -----------------------------------------------------

export type TagKind = 'activity' | 'goal' | 'style' | 'constraint';
export type TagOrigin = 'selected' | 'derived' | 'suggested';
export type TagVisibility = 'public' | 'friends' | 'only_me' | 'muse_only';

export const ACTIVITY_TAGS = ['Running', 'Walking', 'Lifting', 'Yoga', 'Cycling', 'Hiking', 'Climbing', 'Swimming', 'Pickleball', 'Basketball', 'Soccer', 'Dance', 'HIIT', 'Pilates', 'Martial arts'];
export const GOAL_TAGS = ['Get started', 'Be consistent', 'Train for an event', 'Get faster', 'Get stronger', 'Lose the phone and go outside', 'Sleep better', 'Do it with friends'];
export const STYLE_TAGS = ['Solo', 'Small group', 'Big group', 'Competitive', 'Chill', 'Mornings', 'Evenings', 'Weekends'];

export type UserTag = {tag: string; kind: TagKind; origin: TagOrigin; visibility: TagVisibility; confirmed: boolean; reason: string | null};

// ---- Rally game spec (§15.6) ---------------------------------------------

export type GameTemplate = 'boss' | 'relay' | 'streak';

export type GameSpec = {
  template: GameTemplate;
  title: string;
  story: string;
  source: {kind: 'sentence' | 'reel'; reelId?: number; text?: string};
  startsAt: string;
  endsAt: string;
  levels: {day: number; name: string; exercises: {name: string; reps?: number; seconds?: number}[]}[];
  boss?: {name: string; hp: number};
  /** note is shown to the group and must never reveal why ("scaled to your recent weeks"). */
  handicaps: {userId: number; targetScale: number; damageScale: number; note: string}[];
  dares: {id: string; text: string; bonus: number; needsProof: boolean}[];
  rewards: {tier: 'gear' | 'discount' | 'equipment'; label: string; equipmentTags?: string[]}[];
};

// ---- Messenger cards -----------------------------------------------------

/** messages.kind. Each non-text kind renders through components/messages/cards. */
export type MessageKind = 'text' | 'rally_invite' | 'rally_game' | 'quest_card' | 'turf_recap' | 'proof' | 'system';

export type RallyInvitePayload = {gameId: number; gameType: 'turf'; title: string; arenaLabel: string; endsAt: string};
export type QuestCardPayload = {questId: number; title: string; template: GameTemplate; bossName?: string; bossHp?: number; reelId?: number};
export type RallyGamePayload = {questId: number; event: 'move' | 'dare' | 'level' | 'boss_low' | 'boss_down' | 'critical'; userId?: number; text: string; damage?: number; hpLeft?: number};
export type TurfRecapPayload = {
  gameId: number;
  text: string;
  /** userId -> cells held after this outing. */
  cells?: Record<string, number>;
  title?: string;
  /** false = deterministic template was used ("Muse offline"). */
  museUsed?: boolean;
  /** Final standings card posted when the game ends. */
  final?: boolean;
  standings?: {userId: number; name: string; color: string; cells: number}[];
};
/** visibleTo: when set, only these user ids see the line ("Sam passed" is for the host only, §10.2). */
export type SystemPayload = {text: string; visibleTo?: number[]};
