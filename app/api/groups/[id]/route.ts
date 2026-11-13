import {NextResponse} from 'next/server';
import {notFound, withUser} from '@/lib/api';
import {getGroup, listGroupMembers, listGroupPosts} from '@/lib/secondary-queries';

export async function GET(_req: Request, {params}: {params: Promise<{id: string}>}) {
  return withUser(async user => {
    const {id} = await params;
    const group = await getGroup(user.id, Number(id));
    if (!group) return notFound();
    const [posts, members] = await Promise.all([listGroupPosts(group.id, user.id), listGroupMembers(group.id)]);
    return NextResponse.json({group, posts, members});
  });
}
