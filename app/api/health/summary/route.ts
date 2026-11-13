import {NextResponse} from 'next/server';
import {withUser} from '@/lib/api';
import {sql} from '@/lib/db';
import {latestHealth} from '@/lib/health';
import {requireDatabase} from '@/lib/muse/guard';

export async function GET() {
  const dbErr = requireDatabase();
  if (dbErr) return dbErr;
  return withUser(async user => {
    const [whoop] = await sql`select whoop_user_id, connected_at from whoop_accounts where user_id = ${user.id}`;
    const samples = await latestHealth(user.id);
    return NextResponse.json({
      whoop: whoop ? {userId: whoop.whoop_user_id, connectedAt: whoop.connected_at} : null,
      samples,
    });
  });
}
