import type {Metadata} from 'next';
import {notFound, redirect} from 'next/navigation';
import {GoalRoadmap} from '@/components/activities/goals/GoalRoadmap';
import {getGoal, goalMatches} from '@/lib/activities/goals';
import {getSessionUser} from '@/lib/auth';

export const metadata: Metadata = {title: 'Roadmap | Facebook'};
export const dynamic = 'force-dynamic';

export default async function GoalPage({params}: {params: Promise<{id: string}>}) {
  const user = await getSessionUser();
  if (!user) redirect('/auth');
  const goal = await getGoal(Number((await params).id), user.id);
  if (!goal) notFound();
  return <GoalRoadmap goal={goal} matches={await goalMatches(goal)} />;
}
