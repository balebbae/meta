'use client';

import type {FriendshipState} from '@/lib/profile-queries';

async function parse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as {error?: string}).error ?? `Request failed (${res.status})`);
  return data as T;
}

export const profileApi = {
  patchUser: (id: number, patch: {bio?: string | null; coverUrl?: string | null; avatarUrl?: string}) =>
    fetch(`/api/users/${id}`, {method: 'PATCH', headers: {'content-type': 'application/json'}, body: JSON.stringify(patch)}).then(r => parse(r)),
  sendRequest: (userId: number) =>
    fetch('/api/friends/request', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({userId})}).then(r => parse<{friendship: FriendshipState}>(r)),
  accept: (userId: number) =>
    fetch('/api/friends/accept', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({userId})}).then(r => parse<{friendship: FriendshipState}>(r)),
  remove: (userId: number) => fetch(`/api/friends/${userId}`, {method: 'DELETE'}).then(r => parse<{friendship: FriendshipState}>(r)),
};
