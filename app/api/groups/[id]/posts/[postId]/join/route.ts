import {NextResponse} from 'next/server';
import {notFound, withUser} from '@/lib/api';
import {joinFromGroupPost} from '@/lib/rally/groups';

/** Sign up for the activity on a group post: joins the quest and its crew chat, if a spot is left. */
export async function POST(_req: Request, {params}: {params: Promise<{id: string; postId: string}>}) {
  return withUser(async user => {
    const {id, postId} = await params;
    if (!Number(id) || !Number(postId)) return notFound();
    const res = await joinFromGroupPost(Number(id), Number(postId), user);
    if (!res.ok) return NextResponse.json({error: res.error}, {status: res.status});
    return NextResponse.json(res);
  });
}
