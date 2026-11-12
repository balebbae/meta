import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {MessengerApp} from '@/components/messages/MessengerApp';
import {getSessionUser} from '@/lib/auth';
import {listConversations} from '@/lib/messaging-queries';
import {listContacts} from '@/lib/queries';

export const metadata: Metadata = {title: 'Messenger | Facebook'};
export const dynamic = 'force-dynamic';

export default async function MessagesPage() {
  const user = await getSessionUser();
  if (!user) redirect('/auth');
  const [conversations, contacts] = await Promise.all([listConversations(user.id), listContacts(user.id).catch(() => [])]);
  return <MessengerApp viewer={user} initialConversations={conversations} activeId={null} contacts={contacts} />;
}
