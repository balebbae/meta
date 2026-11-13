import {NextResponse, type NextRequest} from 'next/server';
import {badRequest, notFound, readJson, withUser} from '@/lib/api';
import {isCallState, reduceCall, type CallAction, type CallMode, type CallState} from '@/lib/calls';
import {sql} from '@/lib/db';
import {isMember, sendMessage} from '@/lib/messaging-queries';

type Ctx = {params: Promise<{id: string}>};

const MAX_SDP = 20_000;

function parseState(value: unknown): CallState | null {
  const row = typeof value === 'string' ? JSON.parse(value) : value;
  return isCallState(row) ? row : null;
}

export async function GET(_req: NextRequest, {params}: Ctx) {
  return withUser(async user => {
    const id = Number((await params).id);
    if (!Number.isInteger(id) || !(await isMember(id, user.id))) return notFound();
    const rows = await sql`select call_state from conversations where id = ${id}`;
    return NextResponse.json({call: parseState(rows[0]?.call_state)});
  });
}

export async function POST(req: NextRequest, {params}: Ctx) {
  return withUser(async user => {
    const id = Number((await params).id);
    if (!Number.isInteger(id) || !(await isMember(id, user.id))) return notFound();
    const body = await readJson<{type?: string; mode?: string; offer?: string; answer?: string; candidate?: string; id?: string}>(req);
    if (!body?.type) return badRequest('type is required');

    if (body.type === 'start') {
      const mode: CallMode = body.mode === 'video' ? 'video' : 'voice';
      const offer = body.offer?.trim() ?? '';
      if (!offer || offer.length > MAX_SDP) return badRequest('offer is required');
      const action: CallAction = {type: 'start', from: user.id, mode, offer, id: body.id?.slice(0, 40) || crypto.randomUUID()};
      const next = reduceCall(null, action);
      if (!next || typeof next === 'string') return badRequest('Could not start the call');
      const saved = await sql`update conversations set call_state = ${JSON.stringify(next)}::jsonb where id = ${id} and call_state is null returning id`;
      if (!saved.length) return badRequest('Someone is already calling');
      await sendMessage(id, user, mode === 'video' ? 'Started a video call' : 'Started a voice call', null).catch(() => {});
      return NextResponse.json({call: next});
    }

    if (body.type === 'end') {
      await sql`update conversations set call_state = null where id = ${id}`;
      return NextResponse.json({call: null});
    }

    const rows = await sql`select call_state from conversations where id = ${id}`;
    const current = parseState(rows[0]?.call_state);
    const action: CallAction | null = body.type === 'answer'
      ? (body.answer && body.answer.length <= MAX_SDP ? {type: 'answer', from: user.id, answer: body.answer} : null)
      : body.type === 'ice'
        ? (body.candidate && body.candidate.length <= 2000 ? {type: 'ice', from: user.id, candidate: body.candidate} : null)
        : null;
    if (!action) return badRequest('That call update is not valid');
    const next = reduceCall(current, action);
    if (next === 'busy' || next === 'gone') return badRequest('That call ended');
    await sql`update conversations set call_state = ${JSON.stringify(next)}::jsonb where id = ${id}`;
    return NextResponse.json({call: next});
  });
}
