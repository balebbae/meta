import {NextResponse} from 'next/server';
import {badRequest, readJson, withUser} from '@/lib/api';
import {ask} from '@/lib/activities/answers';
import {AUDIENCES, QUESTION_CATEGORY, type Audience, type QuestionType} from '@/lib/activities/types';

/** Live redaction demo (§14): what would <audience> get if it asked my Muse <question> right now. */
async function preview(userId: number, question: string | null, audience: string | null) {
  if (!question || !(question in QUESTION_CATEGORY)) return badRequest('question required');
  if (!audience || !AUDIENCES.includes(audience as Audience)) return badRequest('audience required');
  const answer = await ask(userId, audience as Audience, question as QuestionType, 'preview:you');
  return NextResponse.json({answer, category: QUESTION_CATEGORY[question as QuestionType]});
}

export async function GET(req: Request) {
  return withUser(async user => {
    const url = new URL(req.url);
    return preview(user.id, url.searchParams.get('question'), url.searchParams.get('audience'));
  });
}

export async function POST(req: Request) {
  return withUser(async user => {
    const body = await readJson<{question?: string; audience?: string}>(req);
    return preview(user.id, body?.question ?? null, body?.audience ?? null);
  });
}
