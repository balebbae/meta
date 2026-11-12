import {NextResponse, type NextRequest} from 'next/server';
import {sql} from '@/lib/db';
import {readJson, withUser} from '@/lib/api';
import {listNotifications} from '@/lib/queries';

export async function GET() {
  return withUser(async user => {
    const notifications = await listNotifications(user.id);
    return NextResponse.json({notifications, unreadCount: notifications.filter(n => !n.isRead).length});
  });
}

/** Body: {ids: number[]} marks those read; {all: true} marks everything read. */
export async function PATCH(req: NextRequest) {
  return withUser(async user => {
    const body = await readJson<{ids?: number[]; all?: boolean}>(req);
    if (body?.all) {
      await sql`update notifications set is_read = true where user_id = ${user.id}`;
    } else if (body?.ids?.length) {
      await sql`update notifications set is_read = true where user_id = ${user.id} and id = any(${body.ids.map(Number)})`;
    }
    const notifications = await listNotifications(user.id);
    return NextResponse.json({notifications, unreadCount: notifications.filter(n => !n.isRead).length});
  });
}
