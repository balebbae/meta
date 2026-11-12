import {NextResponse} from 'next/server';
import {withUser} from '@/lib/api';
import {getDiscover} from '@/lib/activities/discover';

export const dynamic = 'force-dynamic';

/** Ranked Discover sections (§9). Other people's data only via ask() answers. */
export async function GET() {
  return withUser(async user => NextResponse.json(await getDiscover(user.id)));
}
