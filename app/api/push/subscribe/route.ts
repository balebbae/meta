import {NextResponse, type NextRequest} from 'next/server';
import {sql} from '@/lib/db';
import {badRequest, readJson, withUser} from '@/lib/api';

type SubscriptionJson = {endpoint?: string; keys?: {p256dh?: string; auth?: string}};

/** Body: {subscription: PushSubscriptionJSON}. Upserts by endpoint (re-subscribing moves it to the caller). */
export async function POST(req: NextRequest) {
  return withUser(async user => {
    const body = await readJson<{subscription?: SubscriptionJson}>(req);
    const sub = body?.subscription;
    const endpoint = sub?.endpoint;
    const p256dh = sub?.keys?.p256dh;
    const auth = sub?.keys?.auth;
    if (!endpoint || !p256dh || !auth) return badRequest('subscription with endpoint and keys required');
    const userAgent = req.headers.get('user-agent')?.slice(0, 500) ?? null;
    await sql`
      insert into push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
      values (${user.id}, ${endpoint}, ${p256dh}, ${auth}, ${userAgent})
      on conflict (endpoint) do update
        set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent`;
    const [{count}] = (await sql`select count(*)::int as count from push_subscriptions where user_id = ${user.id}`) as {count: number}[];
    return NextResponse.json({ok: true, subscriptions: count});
  });
}

/** Body: {endpoint}. Removes the caller's subscription for that endpoint. */
export async function DELETE(req: NextRequest) {
  return withUser(async user => {
    const body = await readJson<{endpoint?: string}>(req);
    if (!body?.endpoint) return badRequest('endpoint required');
    await sql`delete from push_subscriptions where user_id = ${user.id} and endpoint = ${body.endpoint}`;
    return NextResponse.json({ok: true});
  });
}

/** Returns whether the caller has a subscription for the given endpoint (?endpoint=). */
export async function GET(req: NextRequest) {
  return withUser(async user => {
    const endpoint = req.nextUrl.searchParams.get('endpoint');
    if (!endpoint) {
      const [{count}] = (await sql`select count(*)::int as count from push_subscriptions where user_id = ${user.id}`) as {count: number}[];
      return NextResponse.json({subscribed: count > 0, subscriptions: count});
    }
    const rows = await sql`select 1 from push_subscriptions where user_id = ${user.id} and endpoint = ${endpoint}`;
    return NextResponse.json({subscribed: rows.length > 0});
  });
}
