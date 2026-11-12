import {NextResponse} from 'next/server';
import {withUser} from '@/lib/api';
import {listSubscriptions, sendToSubscription} from '@/lib/push';

/** Sends a test notification to every device the caller has subscribed. */
export async function POST() {
  return withUser(async user => {
    const subs = await listSubscriptions(user.id);
    if (subs.length === 0) return NextResponse.json({ok: false, sent: 0, error: 'No push subscriptions for this user'}, {status: 409});
    const results = await Promise.all(
      subs.map(sub =>
        sendToSubscription(sub, {
          title: 'Facebook',
          body: `Notifications are on, ${user.name.split(' ')[0]}. You'll hear about new messages here.`,
          url: '/',
          tag: 'push-test',
        }),
      ),
    );
    const sent = results.filter(Boolean).length;
    return NextResponse.json({ok: sent > 0, sent, total: subs.length});
  });
}
