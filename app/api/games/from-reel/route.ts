import {NextResponse} from 'next/server';
import {badRequest, notFound, readJson, withUser} from '@/lib/api';
import {sql} from '@/lib/db';
import {isMember} from '@/lib/messaging-queries';
import {createMirrorMatch} from '@/lib/rally/mirror-store';
import {createQuest, findRecentQuestForReel, getReelSource} from '@/lib/rally/queries';
import {classifyReel, getReelInfo} from '@/lib/rally/reel-router';
import {createSwimJourney} from '@/lib/rally/swim-store';

/**
 * Body: {reelId, conversationId}. Muse Ember decides what the Reel is and starts the matching game:
 * dance / yoga -> Mirror Match, swim -> swim journey, anything else -> Rally boss quest.
 */
export async function POST(req: Request) {
  return withUser(async user => {
    const body = await readJson<{reelId?: number; conversationId?: number}>(req);
    const reelId = Number(body?.reelId);
    const conversationId = Number(body?.conversationId);
    if (!reelId || !conversationId) return badRequest('reelId and conversationId required');
    if (!(await isMember(conversationId, user.id))) return notFound();
    const reel = await getReelInfo(reelId);
    if (!reel) return notFound();
    // a double tap within 2 minutes returns the game already started instead of a twin
    const [dupMirror] = await sql`select id, mode from mirror_matches where reel_id = ${reelId} and conversation_id = ${conversationId} and created_at > now() - interval '2 minutes' limit 1`;
    if (dupMirror) return NextResponse.json({game: 'mirror', mode: dupMirror.mode, matchId: dupMirror.id, duplicate: true});
    const [dupSwim] = await sql`select id from swim_journeys where reel_id = ${reelId} and conversation_id = ${conversationId} and created_at > now() - interval '2 minutes' limit 1`;
    if (dupSwim) return NextResponse.json({game: 'swim', journeyId: dupSwim.id, duplicate: true});
    const creator = {id: user.id, name: user.name};
    const {game, museUsed} = await classifyReel(reel);
    if (game === 'dance' || game === 'yoga') {
      const {matchId} = await createMirrorMatch({reel, conversationId, creator, mode: game});
      return NextResponse.json({game: 'mirror', mode: game, matchId, museUsed}, {status: 201});
    }
    if (game === 'swim') {
      const {journeyId} = await createSwimJourney({reel, conversationId, creator});
      return NextResponse.json({game: 'swim', journeyId, museUsed}, {status: 201});
    }
    const source = await getReelSource(reelId);
    if (!source) return notFound();
    // Muse takes 10-60 s to design a quest; a retry in that window returns the quest already on its way instead of a twin.
    const recent = await findRecentQuestForReel(reelId, conversationId);
    if (recent) return NextResponse.json({game: 'quest', quest: recent, museUsed: recent.museUsed, duplicate: true});
    const created = await createQuest({source, conversationId, creator});
    return NextResponse.json({game: 'quest', quest: created.quest, museUsed: created.museUsed}, {status: 201});
  });
}
