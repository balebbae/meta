import {NextResponse} from 'next/server';
import {getSessionUser} from '@/lib/auth';
import {discoverWhy, type WhyRequest} from '@/lib/activities/discover';

export const dynamic = 'force-dynamic';

/** POST {cards: WhyRequest[]} → {why: {[cardId]: text}, offline}. One batched Ember call for the whole Discover page. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  const body = (await req.json().catch(() => null)) as {cards?: WhyRequest[]} | null;
  const cards = Array.isArray(body?.cards) ? body!.cards.filter(c => c && typeof c.id === 'string' && typeof c.fallback === 'string').slice(0, 60) : [];
  return NextResponse.json(await discoverWhy(user.id, cards));
}
