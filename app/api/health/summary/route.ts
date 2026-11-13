import {NextResponse} from 'next/server';
import {withUser} from '@/lib/api';
import {sql} from '@/lib/db';
import {fitnessLevel} from '@/lib/activities/level';
import {listVaultEvents} from '@/lib/activities/vault';
import {latestHealth} from '@/lib/health';
import {requireDatabase} from '@/lib/muse/guard';

export async function GET() {
  const dbErr = requireDatabase();
  if (dbErr) return dbErr;
  return withUser(async user => {
    const [whoop] = await sql`select whoop_user_id, connected_at from whoop_accounts where user_id = ${user.id}`;
    const [samples, events] = await Promise.all([latestHealth(user.id), listVaultEvents(user.id, {since: new Date(Date.now() - 28 * 86_400_000).toISOString(), limit: 500})]);
    return NextResponse.json({
      whoop: whoop ? {userId: whoop.whoop_user_id, connectedAt: whoop.connected_at} : null,
      samples,
      // owner-only view of the level their Muse plans from (the Muse itself gets the rounded version)
      level: fitnessLevel(events),
    });
  });
}
