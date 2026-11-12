import {NextResponse} from 'next/server';
import {withUser} from '@/lib/api';
import {listAudit} from '@/lib/activities/answers';

export async function GET(req: Request) {
  return withUser(async user => {
    const limit = Math.min(200, Math.max(1, Number(new URL(req.url).searchParams.get('limit')) || 50));
    return NextResponse.json({audit: await listAudit(user.id, limit)});
  });
}
