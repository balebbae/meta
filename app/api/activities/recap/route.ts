import {NextResponse, type NextRequest} from 'next/server';
import {readJson, withUser} from '@/lib/api';
import {buildRecap, postRecap} from '@/lib/activities/recap';

export const dynamic = 'force-dynamic';

/** POST {dryRun?: boolean} — writes the weekly recap post (Muse from Answers; template fallback). */
export async function POST(req: NextRequest) {
  return withUser(async user => {
    const body = await readJson<{dryRun?: boolean}>(req).catch(() => null);
    if (body?.dryRun) return NextResponse.json(await buildRecap(user.id));
    return NextResponse.json(await postRecap(user.id), {status: 201});
  });
}
