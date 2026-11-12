import {sql} from '@/lib/db';
import type {User} from '@/lib/types';

/**
 * Returns the signed-in user, or null.
 *
 * AUTH SUBAGENT: replace the body with a SuperTokens session lookup
 * (supertokens-node getSession on the Next.js cookies), map session.getUserId()
 * to users.supertokens_id (creating the row on first sign-in), and return it.
 * Until then this returns the first seeded user so the UI can be built.
 */
export async function getSessionUser(): Promise<User | null> {
  const rows = await sql`select * from users order by id asc limit 1`;
  return rows[0] ? mapUser(rows[0]) : null;
}

export function mapUser(r: Record<string, unknown>): User {
  return {
    id: r.id as number,
    supertokensId: (r.supertokens_id as string | null) ?? null,
    name: r.name as string,
    email: r.email as string,
    avatarUrl: r.avatar_url as string,
    coverUrl: (r.cover_url as string | null) ?? null,
    bio: (r.bio as string | null) ?? null,
    isOnline: Boolean(r.is_online),
    createdAt: String(r.created_at),
  };
}
