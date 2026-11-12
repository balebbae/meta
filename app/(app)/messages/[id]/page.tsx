import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {MessengerApp} from '@/components/messages/MessengerApp';
import {getSessionUser} from '@/lib/auth';
import {listConversations} from '@/lib/messaging-queries';
import {listContacts} from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function generateMetadata({params}: {params: Promise<{id: string}>}): Promise<Metadata> {
  const user = await getSessionUser();
  const id = Number((await params).id);
  if (!user || !Number.isInteger(id)) return {title: 'Messenger | Facebook'};
  const conv = (await listConversations(user.id)).find(c => c.id === id);
  return {title: conv ? `${conv.title} | Messenger` : 'Messenger | Facebook'};
}

export default async function ConversationPage({params}: {params: Promise<{id: string}>}) {
  const user = await getSessionUser();
  if (!user) redirect('/auth');
  const id = Number((await params).id);
  const [conversations, contacts] = await Promise.all([listConversations(user.id), listContacts(user.id).catch(() => [])]);
  return <MessengerApp viewer={user} initialConversations={conversations} activeId={Number.isInteger(id) ? id : null} contacts={contacts} />;
}
