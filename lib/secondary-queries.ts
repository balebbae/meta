import {sql} from '@/lib/db';
import {mapPost} from '@/lib/queries';
import type {Post} from '@/lib/types';

/* ---------- types ---------- */
export type Channel = {id: number; name: string; avatarUrl: string};

export type Video = {
  id: number;
  channel: Channel;
  title: string;
  thumbnailUrl: string;
  durationSeconds: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string;
};

export type Listing = {
  id: number;
  seller: Channel & {createdAt: string};
  title: string;
  description: string | null;
  priceCents: number;
  category: string;
  condition: string;
  location: string;
  imageUrl: string;
  createdAt: string;
  isSaved: boolean;
};

export type Group = {
  id: number;
  name: string;
  description: string | null;
  coverUrl: string;
  iconUrl: string;
  privacy: 'public' | 'private';
  memberCount: number;
  isMember: boolean;
  lastActiveAt: string | null;
};

export type GroupPost = {
  id: number;
  group: Pick<Group, 'id' | 'name' | 'iconUrl' | 'privacy'>;
  author: Channel;
  content: string;
  imageUrl: string | null;
  likeCount: number;
  commentCount: number;
  createdAt: string;
};

export type GroupMember = Channel & {role: 'admin' | 'member'; joinedAt: string};

export type FbEvent = {
  id: number;
  host: Channel;
  title: string;
  description: string | null;
  location: string;
  coverUrl: string;
  startsAt: string;
  endsAt: string | null;
  interestedCount: number;
  isOnline: boolean;
  viewerStatus: 'interested' | 'going' | null;
};

export type SavedItem = {id: number; collection: string; savedAt: string; post: Post};

type Row = Record<string, unknown>;

/* ---------- videos ---------- */
export async function listVideos(): Promise<Video[]> {
  const rows = await sql`
    select v.*, u.name as channel_name, u.avatar_url as channel_avatar
    from videos v join users u on u.id = v.channel_id
    order by v.created_at desc`;
  return rows.map(r => ({
    id: r.id as number,
    channel: {id: r.channel_id as number, name: r.channel_name as string, avatarUrl: r.channel_avatar as string},
    title: r.title as string,
    thumbnailUrl: r.thumbnail_url as string,
    durationSeconds: r.duration_seconds as number,
    viewCount: r.view_count as number,
    likeCount: r.like_count as number,
    commentCount: r.comment_count as number,
    shareCount: r.share_count as number,
    createdAt: String(r.created_at),
  }));
}

/* ---------- marketplace ---------- */
function mapListing(r: Row): Listing {
  return {
    id: r.id as number,
    seller: {id: r.seller_id as number, name: r.seller_name as string, avatarUrl: r.seller_avatar as string, createdAt: String(r.seller_since)},
    title: r.title as string,
    description: (r.description as string | null) ?? null,
    priceCents: r.price_cents as number,
    category: r.category as string,
    condition: r.condition as string,
    location: r.location as string,
    imageUrl: r.image_url as string,
    createdAt: String(r.created_at),
    isSaved: Boolean(r.is_saved),
  };
}

export async function listListings(viewerId: number, category?: string): Promise<Listing[]> {
  const rows = category
    ? await sql`
        select m.*, u.name as seller_name, u.avatar_url as seller_avatar, u.created_at as seller_since,
               exists(select 1 from marketplace_saved s where s.listing_id = m.id and s.user_id = ${viewerId}) as is_saved
        from marketplace_listings m join users u on u.id = m.seller_id
        where m.category = ${category}
        order by m.created_at desc`
    : await sql`
        select m.*, u.name as seller_name, u.avatar_url as seller_avatar, u.created_at as seller_since,
               exists(select 1 from marketplace_saved s where s.listing_id = m.id and s.user_id = ${viewerId}) as is_saved
        from marketplace_listings m join users u on u.id = m.seller_id
        order by m.created_at desc`;
  return rows.map(mapListing);
}

export async function getListing(viewerId: number, id: number): Promise<Listing | null> {
  const rows = await sql`
    select m.*, u.name as seller_name, u.avatar_url as seller_avatar, u.created_at as seller_since,
           exists(select 1 from marketplace_saved s where s.listing_id = m.id and s.user_id = ${viewerId}) as is_saved
    from marketplace_listings m join users u on u.id = m.seller_id
    where m.id = ${id}`;
  return rows[0] ? mapListing(rows[0]) : null;
}

export async function listSavedListings(viewerId: number): Promise<Listing[]> {
  const rows = await sql`
    select m.*, u.name as seller_name, u.avatar_url as seller_avatar, u.created_at as seller_since, true as is_saved
    from marketplace_saved s
    join marketplace_listings m on m.id = s.listing_id
    join users u on u.id = m.seller_id
    where s.user_id = ${viewerId}
    order by s.created_at desc`;
  return rows.map(mapListing);
}

/* ---------- groups ---------- */
function mapGroup(r: Row): Group {
  return {
    id: r.id as number,
    name: r.name as string,
    description: (r.description as string | null) ?? null,
    coverUrl: r.cover_url as string,
    iconUrl: r.icon_url as string,
    privacy: r.privacy as Group['privacy'],
    memberCount: (r.member_count as number) ?? 0,
    isMember: Boolean(r.is_member),
    lastActiveAt: r.last_active_at ? String(r.last_active_at) : null,
  };
}

export async function listGroups(viewerId: number): Promise<Group[]> {
  const rows = await sql`
    select g.*,
           (select count(*)::int from group_members gm where gm.group_id = g.id) as member_count,
           exists(select 1 from group_members gm where gm.group_id = g.id and gm.user_id = ${viewerId}) as is_member,
           (select max(created_at) from group_posts gp where gp.group_id = g.id) as last_active_at
    from groups g
    order by last_active_at desc nulls last, g.name`;
  return rows.map(mapGroup);
}

export async function getGroup(viewerId: number, id: number): Promise<Group | null> {
  const rows = await sql`
    select g.*,
           (select count(*)::int from group_members gm where gm.group_id = g.id) as member_count,
           exists(select 1 from group_members gm where gm.group_id = g.id and gm.user_id = ${viewerId}) as is_member,
           (select max(created_at) from group_posts gp where gp.group_id = g.id) as last_active_at
    from groups g where g.id = ${id}`;
  return rows[0] ? mapGroup(rows[0]) : null;
}

function mapGroupPost(r: Row): GroupPost {
  return {
    id: r.id as number,
    group: {id: r.group_id as number, name: r.group_name as string, iconUrl: r.group_icon as string, privacy: r.group_privacy as Group['privacy']},
    author: {id: r.author_id as number, name: r.author_name as string, avatarUrl: r.author_avatar as string},
    content: r.content as string,
    imageUrl: (r.image_url as string | null) ?? null,
    likeCount: r.like_count as number,
    commentCount: r.comment_count as number,
    createdAt: String(r.created_at),
  };
}

export async function listGroupFeed(viewerId: number): Promise<GroupPost[]> {
  const rows = await sql`
    select gp.*, g.name as group_name, g.icon_url as group_icon, g.privacy as group_privacy,
           u.name as author_name, u.avatar_url as author_avatar
    from group_posts gp
    join groups g on g.id = gp.group_id
    join users u on u.id = gp.author_id
    where exists(select 1 from group_members gm where gm.group_id = g.id and gm.user_id = ${viewerId})
       or g.privacy = 'public'
    order by gp.created_at desc`;
  return rows.map(mapGroupPost);
}

export async function listGroupPosts(groupId: number): Promise<GroupPost[]> {
  const rows = await sql`
    select gp.*, g.name as group_name, g.icon_url as group_icon, g.privacy as group_privacy,
           u.name as author_name, u.avatar_url as author_avatar
    from group_posts gp
    join groups g on g.id = gp.group_id
    join users u on u.id = gp.author_id
    where gp.group_id = ${groupId}
    order by gp.created_at desc`;
  return rows.map(mapGroupPost);
}

export async function listGroupMembers(groupId: number, limit = 12): Promise<GroupMember[]> {
  const rows = await sql`
    select u.id, u.name, u.avatar_url, gm.role, gm.joined_at
    from group_members gm join users u on u.id = gm.user_id
    where gm.group_id = ${groupId}
    order by (gm.role = 'admin') desc, gm.joined_at asc
    limit ${limit}`;
  return rows.map(r => ({
    id: r.id as number,
    name: r.name as string,
    avatarUrl: r.avatar_url as string,
    role: r.role as GroupMember['role'],
    joinedAt: String(r.joined_at),
  }));
}

/* ---------- events ---------- */
function mapEvent(r: Row): FbEvent {
  return {
    id: r.id as number,
    host: {id: r.host_id as number, name: r.host_name as string, avatarUrl: r.host_avatar as string},
    title: r.title as string,
    description: (r.description as string | null) ?? null,
    location: r.location as string,
    coverUrl: r.cover_url as string,
    startsAt: String(r.starts_at),
    endsAt: r.ends_at ? String(r.ends_at) : null,
    interestedCount: r.interested_count as number,
    isOnline: Boolean(r.is_online),
    viewerStatus: (r.viewer_status as FbEvent['viewerStatus']) ?? null,
  };
}

export async function listEvents(viewerId: number): Promise<FbEvent[]> {
  const rows = await sql`
    select e.*, u.name as host_name, u.avatar_url as host_avatar,
           (select status from event_rsvps r where r.event_id = e.id and r.user_id = ${viewerId}) as viewer_status
    from events e join users u on u.id = e.host_id
    where e.starts_at > now() - interval '1 day'
    order by e.starts_at asc`;
  return rows.map(mapEvent);
}

/* ---------- saved / memories ---------- */
export async function listSavedPosts(viewerId: number): Promise<SavedItem[]> {
  const rows = await sql`
    select sp.id as saved_id, sp.collection, sp.created_at as saved_at,
           p.id, p.content, p.image_url, p.audience, p.created_at, p.share_count,
           u.id as author_id, u.name as author_name, u.avatar_url as author_avatar,
           (select count(*)::int from reactions r where r.post_id = p.id) as reaction_count,
           (select count(*)::int from comments c where c.post_id = p.id) as comment_count,
           '{}'::text[] as top_reactions, null as viewer_reaction
    from saved_posts sp
    join posts p on p.id = sp.post_id
    join users u on u.id = p.author_id
    where sp.user_id = ${viewerId}
    order by sp.created_at desc`;
  return rows.map(r => ({id: r.saved_id as number, collection: r.collection as string, savedAt: String(r.saved_at), post: mapPost(r)}));
}

export async function listMemories(viewerId: number): Promise<Post[]> {
  const rows = await sql`
    select p.id, p.content, p.image_url, p.audience, p.created_at, p.share_count,
           u.id as author_id, u.name as author_name, u.avatar_url as author_avatar,
           (select count(*)::int from reactions r where r.post_id = p.id) as reaction_count,
           (select count(*)::int from comments c where c.post_id = p.id) as comment_count,
           '{}'::text[] as top_reactions,
           (select type from reactions r where r.post_id = p.id and r.user_id = ${viewerId}) as viewer_reaction
    from posts p join users u on u.id = p.author_id
    where p.created_at < now() - interval '1 day'
    order by p.created_at desc`;
  return rows.map(mapPost);
}
