import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {SettingsScreen} from '@/components/settings/SettingsScreen';
import {getSessionUser} from '@/lib/auth';

export const metadata: Metadata = {title: 'Settings | Facebook'};
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect('/auth');
  return <SettingsScreen user={user} />;
}
