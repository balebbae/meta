import {sql} from '@/lib/db';

export type AppSearch = {
  users: {id: number; name: string; avatarUrl: string}[];
  posts: {id: number; authorId: number; authorName: string; snippet: string}[];
  groups: {id: number; name: string}[];
  listings: {id: number; title: string; priceCents: number}[];
  events: {id: number; title: string}[];
};

export type LabeledPost = {id: number; authorId: number; authorName: string; content: string; createdAt: string};

const empty: AppSearch = {users: [], posts: [], groups: [], listings: [], events: []};

function snippet(content: string): string {
  const flat = content.replace(/\s+/g, ' ').trim();
  return flat.length > 90 ? `${flat.slice(0, 89)}…` : flat;
}

/** People, posts the viewer can see, public groups, marketplace, and events. */
export async function searchApp(viewerId: number, q: string): Promise<AppSearch> {
  const term = q.trim().slice(0, 80);
  if (!term) return empty;
  const like = `%${term}%`;
  const [users, posts, groups, listings, events] = await Promise.all([
    sql`select id, name, avatar_url from users where name ilike ${like} order by name limit 5`,
    sql`select p.id, p.content, p.author_id, u.name as author_name from posts p join users u on u.id = p.author_id
        where p.content ilike ${like}
          and (p.author_id = ${viewerId} or p.audience = 'public' or (p.audience = 'friends' and exists (
            select 1 from friendships f where f.status = 'accepted' and f.user_id = ${viewerId} and f.friend_id = p.author_id)))
        order by p.created_at desc limit 5`,
    sql`select id, name from groups where name ilike ${like} and (privacy = 'public' or exists (
        select 1 from group_members gm where gm.group_id = groups.id and gm.user_id = ${viewerId})) order by name limit 5`,
    sql`select id, title, price_cents from marketplace_listings where title ilike ${like} order by created_at desc limit 5`,
    sql`select id, title from events where title ilike ${like} order by starts_at desc limit 5`,
  ]);
  return {
    users: users.map(r => ({id: Number(r.id), name: String(r.name), avatarUrl: String(r.avatar_url ?? '')})),
    posts: posts.map(r => ({id: Number(r.id), authorId: Number(r.author_id), authorName: String(r.author_name), snippet: snippet(String(r.content))})),
    groups: groups.map(r => ({id: Number(r.id), name: String(r.name)})),
    listings: listings.map(r => ({id: Number(r.id), title: String(r.title), priceCents: Number(r.price_cents)})),
    events: events.map(r => ({id: Number(r.id), title: String(r.title)})),
  };
}

export async function listLabeledPosts(viewerId: number, prefix: string): Promise<LabeledPost[]> {
  const like = `${prefix}:%`;
  const rows = await sql`
    select p.id, p.content, p.created_at, u.id as author_id, u.name as author_name
    from posts p join users u on u.id = p.author_id
    where p.content ilike ${like}
      and (p.author_id = ${viewerId} or p.audience = 'public' or (p.audience = 'friends' and exists (
        select 1 from friendships f where f.status = 'accepted' and f.user_id = ${viewerId} and f.friend_id = p.author_id)))
    order by p.created_at desc limit 20`;
  return rows.map(r => ({
    id: Number(r.id),
    authorId: Number(r.author_id),
    authorName: String(r.author_name),
    content: String(r.content),
    createdAt: String(r.created_at),
  }));
}
