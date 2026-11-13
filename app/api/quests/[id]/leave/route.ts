import {NextResponse} from 'next/server';
import {notFound, withUser} from '@/lib/api';
import {leaveQuest} from '@/lib/rally/queries';

type Ctx = {params: Promise<{id: string}>};

/** The viewer leaves the quest. 404 if they were not in it. */
export async function POST(_req: Request, {params}: Ctx) {
  return withUser(async user => {
    const id = Number((await params).id);
    if (!id || !(await leaveQuest(id, user.id))) return notFound();
    return NextResponse.json({ok: true});
  });
}
