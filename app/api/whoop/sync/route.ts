import {NextResponse} from 'next/server';
import {withUser} from '@/lib/api';
import {sql} from '@/lib/db';
import {insertHealthSamples} from '@/lib/health';
import {fetchWhoopSamples, refreshWhoopToken} from '@/lib/whoop';
import {requireDatabase} from '@/lib/muse/guard';

export async function POST() {
  const dbErr = requireDatabase();
  if (dbErr) return dbErr;
  return withUser(async user => {
    const [account] = await sql`
      select access_token, refresh_token, expires_at
      from whoop_accounts
      where user_id = ${user.id}`;
    if (!account) return NextResponse.json({error: 'Whoop is not linked'}, {status: 400});

    let access = account.access_token as string;
    let refresh = (account.refresh_token as string | null) ?? null;
    const expires = account.expires_at ? Date.parse(String(account.expires_at)) : 0;
    if (refresh && expires < Date.now() + 60_000) {
      const next = await refreshWhoopToken(refresh);
      access = next.access_token;
      refresh = next.refresh_token ?? refresh;
      const expiresAt = new Date(Date.now() + (next.expires_in ?? 3600) * 1000).toISOString();
      await sql`
        update whoop_accounts
        set access_token = ${access}, refresh_token = ${refresh}, expires_at = ${expiresAt}
        where user_id = ${user.id}`;
    }

    const samples = await fetchWhoopSamples(access);
    const saved = await insertHealthSamples(user.id, 'whoop', samples);
    return NextResponse.json({ok: true, saved});
  });
}
