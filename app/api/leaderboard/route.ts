import {NextResponse, type NextRequest} from 'next/server';
import {withUser} from '@/lib/api';
import {weekLeaderboard} from '@/lib/closeness-queries';
import {fitnessWeekLeaderboard} from '@/lib/activities/leaderboard';
import {requireDatabase} from '@/lib/muse/guard';
import {xpBand} from '@/lib/activities/privacy';

export async function GET(req: NextRequest) {
  const dbErr = requireDatabase();
  if (dbErr) return dbErr;

  return withUser(async user => {
    const tab = req.nextUrl.searchParams.get('tab') === 'fitness' ? 'fitness' : 'closeness';
    const rows = tab === 'fitness' ? await fitnessWeekLeaderboard(user.id) : await weekLeaderboard(user.id);
    // other people's XP is banded (no opt-in field yet); the viewer sees their own exact total
    return NextResponse.json({period: 'week', tab, rows: rows.map(r => (r.userId === user.id ? r : {...r, xp: xpBand(r.xp)}))});
  });
}
