'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useState} from 'react';
import {useVisiblePolling} from './hooks';
import styles from './messages.module.css';

/** Rings on any page while someone is calling. The chat itself still places the WebRTC call. */
export function IncomingCall() {
  const pathname = usePathname();
  const [call, setCall] = useState<{conversationId: number; mode: string} | null>(null);

  useVisiblePolling(async () => {
    const res = await fetch('/api/calls/incoming', {cache: 'no-store'});
    if (!res.ok) return;
    const data = (await res.json()) as {call: {conversationId: number; mode: string} | null};
    setCall(data.call);
  }, 3000);

  if (!call || pathname === `/messages/${call.conversationId}`) return null;
  return (
    <div className={styles.callBanner} role="status">
      <span>{call.mode === 'video' ? 'Incoming video call' : 'Incoming voice call'}</span>
      <Link href={`/messages/${call.conversationId}`}>Answer</Link>
    </div>
  );
}
