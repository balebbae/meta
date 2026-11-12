import {sql} from '@/lib/db';
import {mapUser} from '@/lib/auth';
import {mapPost} from '@/lib/queries';
import type {Post, User} from '@/lib/types';

export type FriendshipState = 'self' | 'friends' | 'outgoing' | 'incoming' | 'none';

export type UserDetails = {
  work: string | null;
  workTitle: string | null;
  education: string | null;
  highSchool: string | null;
  currentCity: string | null;
  hometown: string | null;
  relationship: string | null;
  phone: string | null;
  website: string | null;
  birthday: string | null;
  gender: string | null;
  languages: string | null;
};

export type SuggestionRelation = 'none' | 'outgoing' | 'incoming';
export type FriendSummary = Pick<User, 'id' | 'name' | 'avatarUrl' | 'isOnline'> & {
  mutualCount: number;
  /** Only set by listSuggestions: pending request direction between the viewer and this user. */
  relation?: SuggestionRelation;
  createdAt?: string;
};

export type Profile = {
  user: User;
  details: UserDetails;
  friendCount: number;
  postCount: number;
  photoCount: number;
  mutualCount: number;
  friendship: FriendshipState;
  friendPreview: FriendSummary[];
};

export type Photo = {postId: number; imageUrl: string; createdAt: string};

const emptyDetails: UserDetails = {
  work: null, workTitle: null, education: null, highSchool: null, currentCity: null, hometown: null,
  relationship: null, phone: null, website: null, birthday: null, gender: null, languages: null,
};

function mapDetails(r: Record<string, unknown> | undefined): UserDetails {
  if (!r) return emptyDetails;
  return {
    work: (r.work as string | null) ?? null,
    workTitle: (r.work_title as string | null) ?? null,
    education: (r.education as string | null) ?? null,
    highSchool: (r.high_school as string | null) ?? null,
    currentCity: (r.current_city as string | null) ?? null,
    hometown: (r.hometown as string | null) ?? null,
    relationship: (r.relationship as string | null) ?? null,
    phone: (r.phone as string | null) ?? null,
    website: (r.website as string | null) ?? null,
    birthday: (r.birthday as string | null) ?? null,
    gender: (r.gender as string | null) ?? null,
    languages: (r.languages as string | null) ?? null,
  };
}

function mapFriend(r: Record<string, unknown>): FriendSummary {
  return {
    id: r.id as number,
    name: r.name as string,
    avatarUrl: r.avatar_url as string,
    isOnline: Boolean(r.is_online),
    mutualCount: (r.mutual_count as number) ?? 0,
    ...(r.relation ? {relation: r.relation as SuggestionRelation} : {}),
    ...(r.created_at ? {createdAt: new Date(r.created_at as string).toISOString()} : {}),
  };
}

export async function getUserById(id: number): Promise<User | null> {
  const rows = await sql`select * from users where id = ${id}`;
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function getFriendshipState(viewerId: number, otherId: number): Promise<FriendshipState> {
  if (viewerId === otherId) return 'self';
  const rows = await sql`
    select user_id, friend_id, status from friendships
    where (user_id = ${viewerId} and friend_id = ${otherId}) or (user_id = ${otherId} and friend_id = ${viewerId})`;
  if (rows.some(r => r.status === 'accepted')) return 'friends';
  const pending = rows.find(r => r.status === 'pending');
  if (!pending) return 'none';
  return pending.user_id === viewerId ? 'outgoing' : 'incoming';
}

export async function getProfile(id: number, viewerId: number): Promise<Profile | null> {
  const user = await getUserById(id);
  if (!user) return null;
  const [detailRows, counts, friendship, friendPreview] = await Promise.all([
    sql`select * from user_details where user_id = ${id}`,
    sql`
      select
        (select count(*)::int from friendships where user_id = ${id} and status = 'accepted') as friend_count,
        (select count(*)::int from posts where author_id = ${id}) as post_count,
        (select count(*)::int from posts where author_id = ${id} and image_url is not null) as photo_count,
        (select count(*)::int from friendships a
           join friendships b on a.friend_id = b.friend_id
           where a.user_id = ${id} and b.user_id = ${viewerId} and a.status = 'accepted' and b.status = 'accepted') as mutual_count`,
    getFriendshipState(viewerId, id),
    listUserFriends(id, viewerId, 9),
  ]);
  const c = counts[0];
  return {
    user,
    details: mapDetails(detailRows[0]),
    friendCount: c.friend_count,
    postCount: c.post_count,
    photoCount: c.photo_count,
    mutualCount: id === viewerId ? 0 : c.mutual_count,
    friendship,
    friendPreview,
  };
}

/** Accepted friends of `id`, with the number of friends each shares with the viewer. */
export async function listUserFriends(id: number, viewerId: number, limit = 200): Promise<FriendSummary[]> {
  const rows = await sql`
    select u.id, u.name, u.avatar_url, u.is_online,
           (select count(*)::int from friendships a
              join friendships b on a.friend_id = b.friend_id
              where a.user_id = u.id and b.user_id = ${viewerId} and a.status = 'accepted' and b.status = 'accepted'
                and a.friend_id <> u.id) as mutual_count
    from friendships f
    join users u on u.id = f.friend_id
    where f.user_id = ${id} and f.status = 'accepted'
    order by u.is_online desc, u.name asc
    limit ${limit}`;
  return rows.map(mapFriend);
}

export async function listUserPosts(id: number, viewerId: number, limit = 30, offset = 0): Promise<Post[]> {
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
    where p.author_id = ${id}
    order by p.created_at desc
    limit ${limit} offset ${offset}`;
  return rows.map(mapPost);
}

export async function listUserPhotos(id: number, limit = 60): Promise<Photo[]> {
  const rows = await sql`
    select id, image_url, created_at from posts
    where author_id = ${id} and image_url is not null
    order by created_at desc limit ${limit}`;
  return rows.map(r => ({postId: r.id as number, imageUrl: r.image_url as string, createdAt: String(r.created_at)}));
}

/** Incoming pending requests for the viewer. */
export async function listFriendRequests(viewerId: number): Promise<FriendSummary[]> {
  const rows = await sql`
    select u.id, u.name, u.avatar_url, u.is_online,
           (select count(*)::int from friendships a
              join friendships b on a.friend_id = b.friend_id
              where a.user_id = u.id and b.user_id = ${viewerId} and a.status = 'accepted' and b.status = 'accepted') as mutual_count
    from friendships f
    join users u on u.id = f.user_id
    where f.friend_id = ${viewerId} and f.status = 'pending'
    order by f.created_at desc`;
  return rows.map(mapFriend);
}

/** Users with no friendship row in either direction with the viewer, most mutual friends first. */
/**
 * "People You May Know": EVERY registered user except the viewer and accepted friends,
 * newest sign-ups first. Pending requests are included with their direction so the UI can
 * show "Cancel request" / "Respond". `q` filters by name or email prefix.
 */
export async function listSuggestions(viewerId: number, limit = 200, q = ''): Promise<FriendSummary[]> {
  const pattern = `%${q.trim().replace(/[%_]/g, '')}%`;
  const rows = await sql`
    select u.id, u.name, u.avatar_url, u.is_online, u.created_at,
           (select count(*)::int from friendships a
              join friendships b on a.friend_id = b.friend_id
              where a.user_id = u.id and b.user_id = ${viewerId}
                and a.status = 'accepted' and b.status = 'accepted') as mutual_count,
           case
             when exists (select 1 from friendships f where f.user_id = ${viewerId} and f.friend_id = u.id and f.status = 'pending') then 'outgoing'
             when exists (select 1 from friendships f where f.user_id = u.id and f.friend_id = ${viewerId} and f.status = 'pending') then 'incoming'
             else 'none'
           end as relation
    from users u
    where u.id <> ${viewerId}
      and not exists (
        select 1 from friendships f
        where ((f.user_id = ${viewerId} and f.friend_id = u.id) or (f.user_id = u.id and f.friend_id = ${viewerId}))
          and f.status = 'accepted'
      )
      and (${q.trim() === ''} or u.name ilike ${pattern} or u.email ilike ${pattern})
    order by u.created_at desc, u.id desc
    limit ${limit}`;
  return rows.map(mapFriend);
}

export async function sendFriendRequest(viewerId: number, userId: number) {
  if (viewerId === userId) throw new Error('cannot friend yourself');
  const state = await getFriendshipState(viewerId, userId);
  if (state === 'incoming') return acceptFriendRequest(viewerId, userId);
  if (state === 'none') {
    await sql`insert into friendships (user_id, friend_id, status) values (${viewerId}, ${userId}, 'pending') on conflict do nothing`;
    await sql`insert into notifications (user_id, actor_id, type, message)
              select ${userId}, ${viewerId}, 'friend_request', u.name || ' sent you a friend request.' from users u where u.id = ${viewerId}`;
  }
  return getFriendshipState(viewerId, userId);
}

export async function acceptFriendRequest(viewerId: number, userId: number) {
  await sql`update friendships set status = 'accepted' where user_id = ${userId} and friend_id = ${viewerId} and status = 'pending'`;
  await sql`insert into friendships (user_id, friend_id, status) values (${viewerId}, ${userId}, 'accepted')
            on conflict (user_id, friend_id) do update set status = 'accepted'`;
  await sql`insert into notifications (user_id, actor_id, type, message)
            select ${userId}, ${viewerId}, 'friend_accept', u.name || ' accepted your friend request.' from users u where u.id = ${viewerId}`;
  return getFriendshipState(viewerId, userId);
}

/** Unfriend, cancel an outgoing request, or decline an incoming one. */
export async function removeFriendship(viewerId: number, userId: number) {
  await sql`delete from friendships
            where (user_id = ${viewerId} and friend_id = ${userId}) or (user_id = ${userId} and friend_id = ${viewerId})`;
  return 'none' as const;
}

export async function updateProfile(
  id: number,
  patch: {bio?: string | null; coverUrl?: string | null; avatarUrl?: string | null},
): Promise<User | null> {
  const rows = await sql`
    update users set
      bio = case when ${patch.bio !== undefined} then ${patch.bio ?? null} else bio end,
      cover_url = case when ${patch.coverUrl !== undefined} then ${patch.coverUrl ?? null} else cover_url end,
      avatar_url = case when ${patch.avatarUrl !== undefined && !!patch.avatarUrl} then ${patch.avatarUrl ?? ''} else avatar_url end
    where id = ${id}
    returning *`;
  return rows[0] ? mapUser(rows[0]) : null;
}
