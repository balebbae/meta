import {type NextRequest} from 'next/server';
import {getSessionUser} from '@/lib/auth';
import {getRequest, runExchange} from '@/lib/activities/mentor';

export const dynamic = 'force-dynamic';

/** SSE: streams the Muse ↔ Muse exchange turn by turn; replays the saved transcript when it already ran. */
export async function GET(_req: NextRequest, ctx: {params: Promise<{id: string}>}) {
  const user = await getSessionUser();
  if (!user) return new Response('Unauthorized', {status: 401});
  const {id} = await ctx.params;
  const requestId = Number(id);
  const view = await getRequest(requestId, user.id);
  if (!view) return new Response('Not found', {status: 404});
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
      try {
        if (view.plan || view.status !== 'accepted') {
          for (const turn of view.transcript) send({type: 'turn', turn});
          if (view.plan) send({type: 'plan', plan: view.plan, museOffline: view.museOffline ?? false});
          send({type: 'done'});
        } else {
          for await (const ev of runExchange(requestId, user.id)) send(ev);
        }
      } catch (e) {
        send({type: 'error', message: e instanceof Error ? e.message : 'stream failed'});
      }
      controller.close();
    },
  });
  return new Response(stream, {headers: {'content-type': 'text/event-stream', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive'}});
}
