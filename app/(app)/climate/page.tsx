import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {Board} from '@/components/pages/Board';
import {getSessionUser} from '@/lib/auth';
import {listLabeledPosts} from '@/lib/search';

export const metadata: Metadata = {title: 'Climate Science Center | Facebook'};
export const dynamic = 'force-dynamic';

export default async function ClimatePage() {
  const user = await getSessionUser();
  if (!user) redirect('/auth');
  const posts = await listLabeledPosts(user.id, 'Climate');
  return (
    <Board
      title="Climate Science Center"
      blurb="Share a climate note. Notes from people on this site show up here and on the feed."
      prefix="Climate"
      placeholder="Share a climate note"
      posts={posts}
    />
  );
}
