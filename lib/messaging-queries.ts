import {sql} from '@/lib/db';
import {sendPushToUser} from '@/lib/push';
import type {Conversation, ConversationMember, Message} from '@/lib/messaging-types';
import type {MessageKind} from '@/lib/activities/types';

function mapMember(r: Record<string, unknown>): ConversationMember {
  return {
    id: Number(r.id),
    name: String(r.name),
    avatarUrl: String(r.avatar_url),
    isOnline: Boolean(r.is_online),
    role: (r.role as 'admin' | 'member') ?? 'member',
    lastReadMessageId: r.last_read_message_id == null ? null : Number(r.last_read_message_id),
  };
}

export function mapMessage(r: Record<string, unknown>): Message {
  return {
    id: Number(r.id),
    conversationId: Number(r.conversation_id),
    sender: r.sender_id ? {id: Number(r.sender_id), name: String(r.sender_name), avatarUrl: String(r.sender_avatar)} : null,
    body: String(r.body ?? ''),
    imageUrl: (r.image_url as string | null) ?? null,
    kind: ((r.kind as MessageKind | null) ?? 'text'),
    payload: (r.payload as Record<string, unknown> | null) ?? null,
    createdAt: String(r.created_at),
  };
}

const GROUP_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200&h=200&fit=crop&q=80';

function mapConversation(r: Record<string, unknown>, viewerId: number): Conversation {
  const members = ((r.members as Record<string, unknown>[]) ?? []).map(mapMember);
  const others = members.filter(m => m.id !== viewerId);
  const isGroup = Boolean(r.is_group);
  const title = isGroup
    ? (r.name as string | null) || others.map(m => m.name.split(' ')[0]).join(', ') || 'Group chat'
    : others[0]?.name ?? 'Deleted user';
  // groups without a photo get '' so the client can render stacked member avatars
  const imageUrl = isGroup ? (r.image_url as string | null) || '' : others[0]?.avatarUrl ?? GROUP_FALLBACK_IMAGE;
  const last = r.last_message as Record<string, unknown> | null;
  return {
    id: Number(r.id),
    isGroup,
    title,
    imageUrl,
    isOnline: !isGroup && Boolean(others[0]?.isOnline),
    members,
    lastMessage: last ? mapMessage(last) : null,
    unreadCount: Number(r.unread_count ?? 0),
    createdBy: r.created_by == null ? null : Number(r.created_by),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

const CONVERSATION_SELECT = (viewerId: number) => sql`
  select c.id, c.is_group, c.name, c.image_url, c.created_by, c.created_at, c.updated_at,
    (select coalesce(json_agg(json_build_object(
        'id', u.id, 'name', u.name, 'avatar_url', u.avatar_url, 'is_online', u.is_online,
        'role', cm.role, 'last_read_message_id', cm.last_read_message_id) order by cm.joined_at, u.id), '[]'::json)
      from conversation_members cm join users u on u.id = cm.user_id where cm.conversation_id = c.id) as members,
    (select row_to_json(m) from (
        select m.id, m.conversation_id, m.sender_id, m.body, m.image_url, m.kind, m.payload, m.created_at, s.name as sender_name, s.avatar_url as sender_avatar
        from messages m left join users s on s.id = m.sender_id
        where m.conversation_id = c.id order by m.id desc limit 1) m) as last_message,
    (select count(*)::int from messages m
      where m.conversation_id = c.id and m.id > coalesce(me.last_read_message_id, 0) and m.sender_id is distinct from ${viewerId}) as unread_count
  from conversations c
  join conversation_members me on me.conversation_id = c.id and me.user_id = ${viewerId}`;

export async function listConversations(viewerId: number): Promise<Conversation[]> {
  const rows = await sql`${CONVERSATION_SELECT(viewerId)} order by c.updated_at desc, c.id desc limit 100`;
  return rows.map(r => mapConversation(r, viewerId));
}

export async function getConversation(id: number, viewerId: number): Promise<Conversation | null> {
  const rows = await sql`${CONVERSATION_SELECT(viewerId)} where c.id = ${id} limit 1`;
  return rows[0] ? mapConversation(rows[0], viewerId) : null;
}

export async function isMember(conversationId: number, userId: number): Promise<boolean> {
  const rows = await sql`select 1 from conversation_members where conversation_id = ${conversationId} and user_id = ${userId}`;
  return rows.length > 0;
}

/** Number of conversations with at least one unread message (the Messenger badge). */
export async function countUnreadConversations(viewerId: number): Promise<number> {
  const rows = await sql`
    select count(*)::int as n
    from conversation_members me
    where me.user_id = ${viewerId}
      and exists (select 1 from messages m where m.conversation_id = me.conversation_id
                  and m.id > coalesce(me.last_read_message_id, 0) and m.sender_id is distinct from ${viewerId})`;
  return Number(rows[0]?.n ?? 0);
}

export async function findDm(a: number, b: number): Promise<number | null> {
  const rows = await sql`
    select c.id from conversations c
    where not c.is_group
      and exists (select 1 from conversation_members where conversation_id = c.id and user_id = ${a})
      and exists (select 1 from conversation_members where conversation_id = c.id and user_id = ${b})
      and (select count(*) from conversation_members where conversation_id = c.id) = 2
    order by c.id limit 1`;
  return rows[0] ? Number(rows[0].id) : null;
}

export async function findOrCreateDm(viewerId: number, otherId: number): Promise<{id: number; created: boolean}> {
  const existing = await findDm(viewerId, otherId);
  if (existing) return {id: existing, created: false};
  const [c] = await sql`insert into conversations (is_group, created_by) values (false, ${viewerId}) returning id`;
  const id = Number(c.id);
  await sql`insert into conversation_members (conversation_id, user_id, role) values (${id}, ${viewerId}, 'member'), (${id}, ${otherId}, 'member') on conflict do nothing`;
  return {id, created: true};
}

export async function createGroup(viewerId: number, memberIds: number[], name: string | null, imageUrl: string | null): Promise<number> {
  const [c] = await sql`insert into conversations (is_group, name, image_url, created_by) values (true, ${name}, ${imageUrl}, ${viewerId}) returning id`;
  const id = Number(c.id);
  const ids = Array.from(new Set([viewerId, ...memberIds]));
  await sql`
    insert into conversation_members (conversation_id, user_id, role)
    select ${id}, u.id, case when u.id = ${viewerId} then 'admin' else 'member' end
    from users u where u.id = any(${ids})
    on conflict do nothing`;
  return id;
}

export async function addMembers(conversationId: number, userIds: number[]): Promise<void> {
  if (!userIds.length) return;
  await sql`
    insert into conversation_members (conversation_id, user_id, role)
    select ${conversationId}, u.id, 'member' from users u where u.id = any(${userIds})
    on conflict do nothing`;
  await sql`update conversations set updated_at = now() where id = ${conversationId}`;
}

export async function leaveConversation(conversationId: number, userId: number): Promise<void> {
  await sql`delete from conversation_members where conversation_id = ${conversationId} and user_id = ${userId}`;
  const [{n}] = await sql`select count(*)::int as n from conversation_members where conversation_id = ${conversationId}`;
  if (Number(n) === 0) await sql`delete from conversations where id = ${conversationId}`;
}

export async function updateConversation(conversationId: number, patch: {name?: string | null; imageUrl?: string | null}): Promise<void> {
  if (patch.name !== undefined) await sql`update conversations set name = ${patch.name}, updated_at = now() where id = ${conversationId}`;
  if (patch.imageUrl !== undefined) await sql`update conversations set image_url = ${patch.imageUrl}, updated_at = now() where id = ${conversationId}`;
}

const MESSAGE_SELECT = sql`
  select m.id, m.conversation_id, m.sender_id, m.body, m.image_url, m.kind, m.payload, m.created_at, s.name as sender_name, s.avatar_url as sender_avatar
  from messages m left join users s on s.id = m.sender_id`;

/** Messages in ascending id order. `after` returns newer rows than that id; `before` pages back. */
export async function listMessages(conversationId: number, opts: {after?: number; before?: number; limit?: number} = {}): Promise<Message[]> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  if (opts.after != null) {
    const rows = await sql`${MESSAGE_SELECT} where m.conversation_id = ${conversationId} and m.id > ${opts.after} order by m.id asc limit ${limit}`;
    return rows.map(mapMessage);
  }
  if (opts.before != null) {
    const rows = await sql`${MESSAGE_SELECT} where m.conversation_id = ${conversationId} and m.id < ${opts.before} order by m.id desc limit ${limit}`;
    return rows.map(mapMessage).reverse();
  }
  const rows = await sql`${MESSAGE_SELECT} where m.conversation_id = ${conversationId} order by m.id desc limit ${limit}`;
  return rows.map(mapMessage).reverse();
}

export type SendOptions = {kind?: MessageKind; payload?: Record<string, unknown> | null};

/**
 * Send a text message or a card. For cards pass `kind` + `payload`; `body` is the preview line
 * shown in the chat list, notifications and push ("Priya invited you to Turf: Katy Trail").
 */
export async function sendMessage(conversationId: number, sender: {id: number; name: string}, body: string, imageUrl: string | null, opts: SendOptions = {}): Promise<Message> {
  const kind = opts.kind ?? 'text';
  const payload = opts.payload == null ? null : JSON.stringify(opts.payload);
  const [row] = await sql`
    with ins as (
      insert into messages (conversation_id, sender_id, body, image_url, kind, payload) values (${conversationId}, ${sender.id}, ${body}, ${imageUrl}, ${kind}, ${payload})
      returning id, conversation_id, sender_id, body, image_url, kind, payload, created_at)
    select ins.*, s.name as sender_name, s.avatar_url as sender_avatar from ins join users s on s.id = ins.sender_id`;
  const message = mapMessage(row);
  await sql`update conversations set updated_at = now() where id = ${conversationId}`;
  // the sender has seen their own message
  await sql`update conversation_members set last_read_message_id = ${message.id} where conversation_id = ${conversationId} and user_id = ${sender.id}`;

  const conv = await sql`select is_group, name from conversations where id = ${conversationId}`;
  const isGroup = Boolean(conv[0]?.is_group);
  const groupName = (conv[0]?.name as string | null) || null;
  const others = await sql`select user_id from conversation_members where conversation_id = ${conversationId} and user_id <> ${sender.id}`;
  const preview = body.trim() || (imageUrl ? 'Sent a photo.' : '');
  const notifText = isGroup ? `${sender.name} in ${groupName ?? 'your group chat'}: ${preview}` : `${sender.name} sent you a message: ${preview}`;
  if (others.length) {
    await sql`
      insert into notifications (user_id, actor_id, type, message, conversation_id)
      select u, ${sender.id}, 'message', ${notifText}, ${conversationId} from unnest(${others.map(o => Number(o.user_id))}::int[]) as u`.catch(() => {});
  }
  await Promise.all(
    others.map(o =>
      Promise.resolve()
        .then(() =>
          sendPushToUser(Number(o.user_id), {
            title: isGroup ? groupName ?? 'Group chat' : sender.name,
            body: isGroup ? `${sender.name}: ${preview}` : preview,
            url: `/messages/${conversationId}`,
            tag: `conv-${conversationId}`,
          }),
        )
        .catch(() => {}),
    ),
  );
  return message;
}

/** Marks everything in the conversation as read by the user; returns the new last-read id. */
export async function markRead(conversationId: number, userId: number): Promise<number | null> {
  const [row] = await sql`select max(id) as max_id from messages where conversation_id = ${conversationId}`;
  const maxId = row?.max_id == null ? null : Number(row.max_id);
  if (maxId == null) return null;
  const [prev] = await sql`select last_read_message_id from conversation_members where conversation_id = ${conversationId} and user_id = ${userId}`;
  const prevId = prev?.last_read_message_id == null ? 0 : Number(prev.last_read_message_id);
  if (maxId <= prevId) return prevId;
  await sql`update conversation_members set last_read_message_id = ${maxId} where conversation_id = ${conversationId} and user_id = ${userId}`;
  await sql`
    insert into message_reads (message_id, user_id)
    select id, ${userId} from messages where conversation_id = ${conversationId} and id > ${prevId} and id <= ${maxId} and sender_id is distinct from ${userId}
    on conflict do nothing`;
  await sql`update notifications set is_read = true where user_id = ${userId} and type = 'message' and conversation_id = ${conversationId} and is_read = false`.catch(() => {});
  return maxId;
}
