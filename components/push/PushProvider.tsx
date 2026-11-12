'use client';
import {useEffect} from 'react';
import {PushPrompt} from './PushPrompt';
import {isPushSupported, registerServiceWorker, syncExistingSubscription} from './push-client';

/**
 * Registers the service worker (`/sw.js`), re-syncs an existing push subscription for the
 * signed-in user, and renders the one-time "Turn on notifications" prompt.
 * Mount once inside the signed-in layout.
 */
export function PushProvider({userId}: {userId: number}) {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    registerServiceWorker().then(() => {
      if (isPushSupported()) syncExistingSubscription().catch(() => {});
    });
  }, [userId]);

  return <PushPrompt userId={userId} />;
}
