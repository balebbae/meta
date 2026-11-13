import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {Board} from '@/components/pages/Board';
import {getSessionUser} from '@/lib/auth';
import {listLabeledPosts} from '@/lib/search';

export const metadata: Metadata = {title: 'Fundraisers | Facebook'};
export const dynamic = 'force-dynamic';

export default async function FundraisersPage() {
  const user = await getSessionUser();
  if (!user) redirect('/auth');
  const posts = await listLabeledPosts(user.id, 'Fundraiser');
  return (
    <Board
      title="Fundraisers"
      blurb="Post what you are raising money for. People see it here and on the feed. This demo does not collect donations."
      prefix="Fundraiser"
      placeholder="What is the fundraiser for?"
      posts={posts}
    />
  );
}
