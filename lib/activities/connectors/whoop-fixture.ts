import type {WhoopWebhook, WhoopWorkout} from './whoop';

/** Recorded WHOOP v2 webhook + workout fixture for api/demo/replay-whoop (backstage fallback, §5.3). */
export const WHOOP_FIXTURE_WEBHOOK: WhoopWebhook = {user_id: 10129, id: 'ecfc6a15-4661-442f-a9a4-f160dd7afae8', type: 'workout.updated', trace_id: 'replay-demo'};

export function whoopFixtureWorkout(startedAt = new Date(Date.now() - 2 * 3_600_000)): WhoopWorkout {
  const end = new Date(startedAt.getTime() + 31 * 60_000);
  return {
    id: WHOOP_FIXTURE_WEBHOOK.id,
    user_id: WHOOP_FIXTURE_WEBHOOK.user_id,
    start: startedAt.toISOString(),
    end: end.toISOString(),
    sport_name: 'running',
    sport_id: 0,
    score_state: 'SCORED',
    score: {strain: 10.4, average_heart_rate: 152, max_heart_rate: 178, distance_meter: 5210, kilojoule: 1480},
  };
}
