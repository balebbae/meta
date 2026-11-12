import {NextResponse} from 'next/server';
import {badRequest, readJson, withUser} from '@/lib/api';
import {sql} from '@/lib/db';
import {generateBadgeArt} from '@/lib/muse/image';
import {requireDatabase, requireMuse} from '@/lib/muse/guard';

export async function POST(req: Request) {
  const museErr = requireMuse();
  if (museErr) return museErr;
  const dbErr = requireDatabase();
  if (dbErr) return dbErr;

  return withUser(async user => {
    const body = await readJson<{slug?: string; title?: string; prompt?: string}>(req);
    if (!body?.slug || !body.title) return badRequest('slug and title required');

    const imageUrl = await generateBadgeArt(body.prompt ?? body.title);
    const [row] = await sql`
      insert into badges (user_id, slug, title, image_url)
      values (${user.id}, ${body.slug}, ${body.title}, ${imageUrl})
      on conflict (user_id, slug) do update set title = excluded.title, image_url = excluded.image_url
      returning id, slug, title, image_url, earned_at`;
    return NextResponse.json({ok: true, badge: row});
  });
}
