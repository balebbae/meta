import {NextResponse} from 'next/server';
import {badRequest, withUser} from '@/lib/api';
import {deleteVaultSource, listVaultEvents} from '@/lib/activities/vault';

/** Owner-only view of the vault (Logs panel). Never called for another user. ?all=1 includes merged duplicates. */
export async function GET(req: Request) {
  return withUser(async user => {
    const url = new URL(req.url);
    const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit')) || 200));
    return NextResponse.json({events: await listVaultEvents(user.id, {limit, includeDuplicates: url.searchParams.get('all') === '1'})});
  });
}

/** DELETE ?source=<connector id>: wipe everything that source put in the vault (keeps the connection). */
export async function DELETE(req: Request) {
  return withUser(async user => {
    const source = new URL(req.url).searchParams.get('source');
    if (!source) return badRequest('source required');
    const deleted = await deleteVaultSource(user.id, source);
    return NextResponse.json({ok: true, deleted});
  });
}
