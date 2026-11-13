import {notFound, redirect} from 'next/navigation';
import {PostCard} from '@/components/feed/PostCard';
import {getSessionUser} from '@/lib/auth';
import {canViewPost, getPost} from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function PostPage({params}: {params: Promise<{id: string}>}) {
  const user = await getSessionUser();
  if (!user) redirect('/auth');
  const id = Number((await params).id);
  const post = Number.isInteger(id) ? await getPost(id, user.id) : null;
  if (!post || !(await canViewPost(post, user.id))) notFound();
  return <PostCard post={post} viewer={user} />;
}
