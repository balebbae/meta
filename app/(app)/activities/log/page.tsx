import {redirect} from 'next/navigation';
import {LogWorkoutPage} from '@/components/activities/LogWorkoutPage';
import {getSessionUser} from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function LogPage({searchParams}: {searchParams: Promise<{tab?: string}>}) {
  const user = await getSessionUser();
  if (!user) redirect('/auth');
  const {tab} = await searchParams;
  return <LogWorkoutPage initialTab={tab === 'photo' || tab === 'voice' ? tab : 'manual'} />;
}
