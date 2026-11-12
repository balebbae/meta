import type {Metadata} from 'next';
import {notFound, redirect} from 'next/navigation';
import {QuestDashboard} from '@/components/rally/QuestDashboard';
import {getSessionUser} from '@/lib/auth';
import {getQuestState, isQuestMember} from '@/lib/rally/queries';

export const dynamic = 'force-dynamic';

export async function generateMetadata({params}: {params: Promise<{id: string}>}): Promise<Metadata> {
  const {id} = await params;
  return {title: `Quest ${id} | Rally | Facebook`};
}

export default async function QuestPage({params}: {params: Promise<{id: string}>}) {
  const user = await getSessionUser();
  if (!user) redirect('/auth');
  const id = Number((await params).id);
  if (!id || !(await isQuestMember(id, user.id))) notFound();
  const state = await getQuestState(id, user.id);
  if (!state) notFound();
  return <QuestDashboard initial={JSON.parse(JSON.stringify(state))} />;
}
