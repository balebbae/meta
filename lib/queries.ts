import {sql} from '@/lib/db';
import type {Post, ReactionType} from '@/lib/types';

/** Feed for a viewer: newest first, with reaction/comment counts and the viewer's own reaction. */
export async function listFeed(viewerId: number, limit = 20, offset = 0): Promise<Post[]> {
  const rows = await sql`
    select p.id, p.content, p.image_url, p.audience, p.created_at, p.share_count,
           u.id as author_id, u.name as author_name, u.avatar_url as author_avatar,
           (select count(*)::int from reactions r where r.post_id = p.id) as reaction_count,
           (select count(*)::int from comments c where c.post_id = p.id) as comment_count,
           (select coalesce(array_agg(t order by n desc), '{}') from (
              select type as t, count(*) as n from reactions r where r.post_id = p.id group by type order by n desc limit 3
            ) x) as top_reactions,
           (select type from reactions r where r.post_id = p.id and r.user_id = ${viewerId}) as viewer_reaction
    from posts p
    join users u on u.id = p.author_id
    order by p.created_at desc
    limit ${limit} offset ${offset}`;
  return rows.map(mapPost);
}

export function mapPost(r: Record<string, unknown>): Post {
  return {
    id: r.id as number,
    author: {id: r.author_id as number, name: r.author_name as string, avatarUrl: r.author_avatar as string},
    content: r.content as string,
    imageUrl: (r.image_url as string | null) ?? null,
    audience: r.audience as Post['audience'],
    createdAt: String(r.created_at),
    reactionCount: (r.reaction_count as number) ?? 0,
    commentCount: (r.comment_count as number) ?? 0,
    shareCount: (r.share_count as number) ?? 0,
    topReactions: ((r.top_reactions as ReactionType[]) ?? []),
    viewerReaction: (r.viewer_reaction as ReactionType | null) ?? null,
  };
}
