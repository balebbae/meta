import {after, NextResponse, type NextRequest} from 'next/server';
import {sql} from '@/lib/db';
import {awardXp} from '@/lib/closeness-queries';
import {museConfigured} from '@/lib/muse/client';
import {nudgeOrNull} from '@/lib/muse/nudge';
import {badRequest, notFound, readJson, REACTION_TYPES, withUser} from '@/lib/api';
import {getPost} from '@/lib/queries';

type Ctx = {params: Promise<{id: string}>};

export async function GET(_req: NextRequest, {params}: Ctx) {
  return withUser(async () => {
    const id = Number((await params).id);
    const rows = await sql`
      select r.type, u.id, u.name, u.avatar_url from reactions r join users u on u.id = r.user_id
      where r.post_id = ${id} order by r.created_at desc`;
    return NextResponse.json({reactions: rows.map(r => ({type: r.type, user: {id: r.id, name: r.name, avatarUrl: r.avatar_url}}))});
  });
}

export async function PUT(req: NextRequest, {params}: Ctx) {
  return withUser(async user => {
    const id = Number((await params).id);
    const body = await readJson<{type?: string}>(req);
    const type = body?.type;
    if (!type || !REACTION_TYPES.includes(type as (typeof REACTION_TYPES)[number])) return badRequest('invalid reaction type');
    const [post] = await sql`select id, author_id from posts where id = ${id}`;
    if (!post) return notFound();
    const [prev] = await sql`select id from reactions where post_id = ${id} and user_id = ${user.id}`;
    await sql`
      insert into reactions (post_id, user_id, type) values (${id}, ${user.id}, ${type})
      on conflict (post_id, user_id) do update set type = excluded.type, created_at = now()`;
    if (!prev && (post.author_id as number) !== user.id) {
      await sql`insert into notifications (user_id, actor_id, type, post_id, message)
        values (${post.author_id as number}, ${user.id}, 'reaction', ${id}, ${user.name + ' reacted to your post.'})`;
      const authorId = post.author_id as number;
      // Deterministic closeness XP, no model call; un-react + re-react never re-awards (lib/xp-guard.ts). Never fails the reaction.
      await awardXp({userId: user.id, friendId: authorId, sourceType: 'reaction', sourceId: id}).catch(() => undefined);
      // Muse only rewrites the notification copy, after the response; the template above stays on timeout/error.
      if (museConfigured()) {
        after(async () => {
          const [author] = await sql`select name from users where id = ${authorId}`;
          const nudge = await nudgeOrNull({recipientName: (author?.name as string) ?? 'friend', actorName: user.name, context: `reacted ${type} on your post`});
          if (!nudge?.message) return;
          await sql`update notifications set message = ${nudge.message}
            where user_id = ${authorId} and actor_id = ${user.id} and post_id = ${id} and type = 'reaction'
            and created_at > now() - interval '1 minute'`;
        });
      }
    }
    return NextResponse.json({post: await getPost(id, user.id)});
  });
}

export async function DELETE(_req: NextRequest, {params}: Ctx) {
  return withUser(async user => {
    const id = Number((await params).id);
    await sql`delete from reactions where post_id = ${id} and user_id = ${user.id}`;
    const post = await getPost(id, user.id);
    return post ? NextResponse.json({post}) : notFound();
  });
}
