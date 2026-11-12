import {sql} from '@/lib/db';
import type {Comment, Post, ReactionType, Story, User} from '@/lib/types';

const POST_SELECT = (viewerId: number) => sql`
  select p.id, p.content, p.image_url, p.audience, p.created_at, p.share_count,
         u.id as author_id, u.name as author_name, u.avatar_url as author_avatar,
         (select count(*)::int from reactions r where r.post_id = p.id) as reaction_count,
         (select count(*)::int from comments c where c.post_id = p.id) as comment_count,
         (select coalesce(array_agg(t order by n desc), '{}') from (
            select type as t, count(*) as n from reactions r where r.post_id = p.id group by type order by n desc limit 3
          ) x) as top_reactions,
         (select type from reactions r where r.post_id = p.id and r.user_id = ${viewerId}) as viewer_reaction
  from posts p
  join users u on u.id = p.author_id`;

export type FeedPage = {posts: Post[]; nextCursor: string | null};

/** Cursor-paginated feed. `cursor` is the created_at ISO string of the last post seen. */
export async function listFeedPage(viewerId: number, cursor: string | null, limit = 10): Promise<FeedPage> {
  const rows = cursor
    ? await sql`${POST_SELECT(viewerId)} where p.created_at < ${cursor} order by p.created_at desc, p.id desc limit ${limit + 1}`
    : await sql`${POST_SELECT(viewerId)} order by p.created_at desc, p.id desc limit ${limit + 1}`;
  const hasMore = rows.length > limit;
  const posts = rows.slice(0, limit).map(mapPost);
  return {posts, nextCursor: hasMore ? posts[posts.length - 1].createdAt : null};
}

export async function getPost(id: number, viewerId: number): Promise<Post | null> {
  const rows = await sql`${POST_SELECT(viewerId)} where p.id = ${id}`;
  return rows[0] ? mapPost(rows[0]) : null;
}

export async function listComments(postId: number): Promise<Comment[]> {
  const rows = await sql`
    select c.id, c.post_id, c.content, c.created_at, u.id as author_id, u.name as author_name, u.avatar_url as author_avatar
    from comments c join users u on u.id = c.author_id
    where c.post_id = ${postId}
    order by c.created_at asc`;
  return rows.map(mapComment);
}

export async function listStories(): Promise<Story[]> {
  const rows = await sql`
    select s.id, s.image_url, s.created_at, u.id as user_id, u.name as user_name, u.avatar_url as user_avatar
    from stories s join users u on u.id = s.user_id
    where s.created_at > now() - interval '24 hours'
    order by s.created_at desc`;
  return rows.map(r => ({
    id: r.id as number,
    user: {id: r.user_id as number, name: r.user_name as string, avatarUrl: r.user_avatar as string},
    imageUrl: r.image_url as string,
    createdAt: String(r.created_at),
  }));
}

export type Notification = {
  id: number;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  postId: number | null;
  actor: Pick<User, 'id' | 'name' | 'avatarUrl'> | null;
};

export async function listNotifications(userId: number): Promise<Notification[]> {
  const rows = await sql`
    select n.id, n.type, n.message, n.is_read, n.created_at, n.post_id,
           a.id as actor_id, a.name as actor_name, a.avatar_url as actor_avatar
    from notifications n left join users a on a.id = n.actor_id
    where n.user_id = ${userId}
    order by n.created_at desc
    limit 30`;
  return rows.map(r => ({
    id: r.id as number,
    type: r.type as string,
    message: r.message as string,
    isRead: Boolean(r.is_read),
    createdAt: String(r.created_at),
    postId: (r.post_id as number | null) ?? null,
    actor: r.actor_id ? {id: r.actor_id as number, name: r.actor_name as string, avatarUrl: r.actor_avatar as string} : null,
  }));
}

export type Contact = Pick<User, 'id' | 'name' | 'avatarUrl' | 'isOnline'>;

/** Accepted friends of a user, online first. */
export async function listContacts(userId: number): Promise<Contact[]> {
  const rows = await sql`
    select u.id, u.name, u.avatar_url, u.is_online
    from friendships f join users u on u.id = f.friend_id
    where f.user_id = ${userId} and f.status = 'accepted'
    order by u.is_online desc, u.name asc`;
  return rows.map(r => ({id: r.id as number, name: r.name as string, avatarUrl: r.avatar_url as string, isOnline: Boolean(r.is_online)}));
}

export async function searchUsers(q: string, limit = 8): Promise<Contact[]> {
  const rows = await sql`
    select id, name, avatar_url, is_online from users
    where name ilike ${'%' + q + '%'}
    order by name asc limit ${limit}`;
  return rows.map(r => ({id: r.id as number, name: r.name as string, avatarUrl: r.avatar_url as string, isOnline: Boolean(r.is_online)}));
}

export function mapComment(r: Record<string, unknown>): Comment {
  return {
    id: r.id as number,
    postId: r.post_id as number,
    author: {id: r.author_id as number, name: r.author_name as string, avatarUrl: r.author_avatar as string},
    content: r.content as string,
    createdAt: String(r.created_at),
  };
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
