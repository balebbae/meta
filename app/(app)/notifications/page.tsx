import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {getSessionUser} from '@/lib/auth';
import {listNotifications} from '@/lib/queries';
import {NotificationsPage} from '@/components/notifications/NotificationsPage';

export const metadata: Metadata = {title: 'Notifications | Facebook'};
export const dynamic = 'force-dynamic';

export default async function Page() {
  const user = await getSessionUser();
  if (!user) redirect('/auth');
  const notifications = await listNotifications(user.id);
  return <NotificationsPage initial={notifications} />;
}
