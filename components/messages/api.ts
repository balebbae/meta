import type {Conversation, Message} from '@/lib/messaging-types';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {error?: string};
    throw new Error(err.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

const post = (url: string, body?: unknown, method = 'POST') =>
  fetch(url, {method, headers: {'content-type': 'application/json'}, body: body === undefined ? undefined : JSON.stringify(body)});

export const chatApi = {
  listConversations: () => fetch('/api/conversations', {cache: 'no-store'}).then(r => json<{conversations: Conversation[]; unreadCount: number}>(r)),
  unreadCount: () => fetch('/api/conversations/unread-count', {cache: 'no-store'}).then(r => json<{unreadCount: number}>(r)),
  getConversation: (id: number) => fetch(`/api/conversations/${id}`, {cache: 'no-store'}).then(r => json<{conversation: Conversation}>(r)),
  createConversation: (memberIds: number[], name?: string, imageUrl?: string) =>
    post('/api/conversations', {memberIds, name, imageUrl}).then(r => json<{conversation: Conversation; created: boolean}>(r)),
  listMessages: (id: number, q: {after?: number; before?: number; limit?: number} = {}) => {
    const params = new URLSearchParams();
    if (q.after != null) params.set('after', String(q.after));
    if (q.before != null) params.set('before', String(q.before));
    if (q.limit != null) params.set('limit', String(q.limit));
    return fetch(`/api/conversations/${id}/messages?${params}`, {cache: 'no-store'}).then(r => json<{messages: Message[]}>(r));
  },
  sendMessage: (id: number, body: string, imageUrl?: string | null) => post(`/api/conversations/${id}/messages`, {body, imageUrl}).then(r => json<{message: Message}>(r)),
  markRead: (id: number) => post(`/api/conversations/${id}/read`).then(r => json<{lastReadMessageId: number | null}>(r)),
  update: (id: number, patch: {name?: string | null; imageUrl?: string | null}) => post(`/api/conversations/${id}`, patch, 'PATCH').then(r => json<{conversation: Conversation}>(r)),
  addMembers: (id: number, userIds: number[]) => post(`/api/conversations/${id}/members`, {userIds}).then(r => json<{conversation: Conversation}>(r)),
  leave: (id: number) => post(`/api/conversations/${id}/members/me`, undefined, 'DELETE').then(r => json<{ok: boolean}>(r)),
  searchUsers: (q: string) => fetch(`/api/users/search?q=${encodeURIComponent(q)}`).then(r => json<{users: {id: number; name: string; avatarUrl: string; isOnline: boolean}[]}>(r)),
};
