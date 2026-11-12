'use client';
import {useRouter} from 'next/navigation';
import {useState, type ReactNode} from 'react';
import {chatApi} from './api';

/** Opens (or creates) the 1:1 conversation with `userId` and navigates to it. */
export function ContactDmLink({userId, className, children}: {userId: number; className?: string; children: ReactNode}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const d = await chatApi.createConversation([userId]);
          router.push(`/messages/${d.conversation.id}`);
        } catch {
          router.push('/messages');
        } finally {
          setBusy(false);
        }
      }}>
      {children}
    </button>
  );
}
