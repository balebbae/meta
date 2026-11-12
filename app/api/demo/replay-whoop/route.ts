import {NextResponse} from 'next/server';
import {withUser} from '@/lib/api';
import {upsertConnection} from '@/lib/activities/connections';
import {mapWhoopWorkout} from '@/lib/activities/connectors/whoop';
import {WHOOP_FIXTURE_WEBHOOK, whoopFixtureWorkout} from '@/lib/activities/connectors/whoop-fixture';
import {insertVaultEvent} from '@/lib/activities/vault';

/**
 * Backstage fallback (§5.3): replays a recorded WHOOP `workout.updated` webhook + v2 workout for the
 * signed-in user, through the exact same deterministic mapper the live webhook uses. No network, no LLM.
 */
export async function POST() {
  return withUser(async user => {
    const workout = whoopFixtureWorkout();
    const event = mapWhoopWorkout(user.id, workout);
    if (!event) return NextResponse.json({error: 'fixture not scored'}, {status: 500});
    event.externalId = `${workout.id}:${user.id}:${Date.now()}`;
    const saved = await insertVaultEvent(event);
    await upsertConnection(user.id, 'whoop', {status: 'connected', tokens: {replayed: true, last_sync: new Date().toISOString()}, externalUserId: String(WHOOP_FIXTURE_WEBHOOK.user_id)});
    return NextResponse.json({ok: true, webhook: WHOOP_FIXTURE_WEBHOOK, event: {...event, id: saved.id, duplicateOf: saved.duplicateOf}});
  });
}
