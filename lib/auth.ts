import {cookies} from 'next/headers';
import supertokens from 'supertokens-node';
import {getSSRSession} from 'supertokens-node/nextjs';
import UserMetadata from 'supertokens-node/recipe/usermetadata';
import {sql} from '@/lib/db';
import {ensureSuperTokensInit, ensureUserRow} from '@/lib/supertokens/backend';
import type {User} from '@/lib/types';

/**
 * Returns the signed-in user, or null.
 *
 * Reads the SuperTokens access-token cookie (cookie-based sessions), verifies it, and maps
 * the SuperTokens user id to users.supertokens_id. On the first request for a new account
 * the users row is created (or a seeded row with the same email is linked).
 * Works in server components and route handlers.
 */
export async function getSessionUser(): Promise<User | null> {
  ensureSuperTokensInit();
  const cookieStore = await cookies();
  const {accessTokenPayload} = await getSSRSession(cookieStore.getAll());
  const supertokensId = accessTokenPayload?.sub;
  if (!supertokensId) return null;

  const rows = await sql`select * from users where supertokens_id = ${supertokensId} limit 1`;
  if (rows[0]) return mapUser(rows[0]);

  const stUser = await supertokens.getUser(supertokensId);
  const email = stUser?.emails[0];
  if (!email) return null;
  const {metadata} = await UserMetadata.getUserMetadata(supertokensId);
  const name = [metadata.first_name, metadata.last_name].filter(Boolean).join(' ');
  const created = await ensureUserRow(supertokensId, email, name);
  return created ? mapUser(created) : null;
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
