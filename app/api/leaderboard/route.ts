import {NextResponse, type NextRequest} from 'next/server';
import {withUser} from '@/lib/api';
import {weekLeaderboard} from '@/lib/closeness-queries';
import {fitnessWeekLeaderboard} from '@/lib/activities/leaderboard';
import {requireDatabase} from '@/lib/muse/guard';

export async function GET(req: NextRequest) {
  const dbErr = requireDatabase();
  if (dbErr) return dbErr;

  return withUser(async user => {
    const tab = req.nextUrl.searchParams.get('tab') === 'fitness' ? 'fitness' : 'closeness';
    const rows = tab === 'fitness' ? await fitnessWeekLeaderboard(user.id) : await weekLeaderboard(user.id);
    return NextResponse.json({period: 'week', tab, rows});
  });
}
