import {NextResponse} from 'next/server';
import {withUser} from '@/lib/api';
import {weekLeaderboard} from '@/lib/closeness-queries';
import {requireDatabase} from '@/lib/muse/guard';

export async function GET() {
  const dbErr = requireDatabase();
  if (dbErr) return dbErr;

  return withUser(async user => {
    const rows = await weekLeaderboard(user.id);
    return NextResponse.json({period: 'week', rows});
  });
}
