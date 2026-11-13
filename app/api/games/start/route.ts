import {NextResponse} from 'next/server';
import {badRequest, notFound, readJson, withUser} from '@/lib/api';
import {sql} from '@/lib/db';
import {isMember} from '@/lib/messaging-queries';
import {createMirrorMatch} from '@/lib/rally/mirror-store';
import {reelGameByText} from '@/lib/rally/reel-kind';
import {getReelInfo} from '@/lib/rally/reel-router';
import {ROUTES} from '@/lib/rally/swim';
import {createSwimJourney} from '@/lib/rally/swim-store';

/**
 * Start Mirror Yoga, Mirror Dance or Castle Crossing from Activities (the player picks the game, so Muse doesn't
 * classify here). GET ?mode=yoga|dance lists Reels to copy; POST starts the game in a chat.
 */
export type StartReel = {id: number; caption: string; posterUrl: string | null; durationSec: number | null};

export async function GET(req: Request) {
  return withUser(async () => {
    const mode = new URL(req.url).searchParams.get('mode');
    if (mode !== 'yoga' && mode !== 'dance') return badRequest('mode must be yoga or dance');
    // Reels a phone already found nobody in are left out
    const rows = await sql`
      select id, caption, slug, tags, exercises, poster_url, duration_sec from reels r
      where video_url is not null
        and not exists (select 1 from mirror_matches m where m.reel_id = r.id and m.reference->>'unreadable' = 'true')
      order by plays desc, id desc limit 300`;
    const reels: StartReel[] = rows
      .filter(r => {
        const text = `${r.caption ?? ''} ${String(r.slug ?? '').replace(/-/g, ' ')} ${((r.tags as string[] | null) ?? []).join(' ')} ${(Array.isArray(r.exercises) ? (r.exercises as {name: string}[]) : []).map(e => e.name).join(' ')}`;
        return reelGameByText(text) === mode;
      })
      .slice(0, 12)
      .map(r => ({id: Number(r.id), caption: String(r.caption ?? ''), posterUrl: (r.poster_url as string | null) ?? null, durationSec: r.duration_sec == null ? null : Number(r.duration_sec)}));
    return NextResponse.json({reels, routes: ROUTES.map(r => ({id: r.id, name: r.name, totalM: r.totalM}))});
  });
}

export async function POST(req: Request) {
  return withUser(async user => {
    const body = await readJson<{game?: string; conversationId?: number; reelId?: number; routeId?: string}>(req);
    const conversationId = Number(body?.conversationId);
    const game = body?.game;
    if (!conversationId || (game !== 'yoga' && game !== 'dance' && game !== 'swim')) return badRequest('game and conversationId required');
    if (!(await isMember(conversationId, user.id))) return notFound();
    const creator = {id: user.id, name: user.name};
    if (game === 'swim') {
      const routeId = ROUTES.some(r => r.id === body?.routeId) ? body?.routeId : undefined;
      const {journeyId} = await createSwimJourney({reel: null, conversationId, creator, routeId});
      return NextResponse.json({game, journeyId, conversationId}, {status: 201});
    }
    const reel = body?.reelId ? await getReelInfo(Number(body.reelId)) : null;
    if (!reel) return badRequest('Pick a Reel');
    const {matchId} = await createMirrorMatch({reel, conversationId, creator, mode: game});
    return NextResponse.json({game, matchId, conversationId}, {status: 201});
  });
}
