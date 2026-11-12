import supertokens from 'supertokens-node';
import EmailPassword from 'supertokens-node/recipe/emailpassword';
import Session from 'supertokens-node/recipe/session';
import UserMetadata from 'supertokens-node/recipe/usermetadata';
import type {TypeInput} from 'supertokens-node/types';
import {getAppInfo} from '@/lib/supertokens/appInfo';
import {sql} from '@/lib/db';

export function defaultAvatar(email: string) {
  return `https://i.pravatar.cc/300?u=${encodeURIComponent(email.toLowerCase())}`;
}

/**
 * Makes sure a `users` row exists for a SuperTokens user id. A seeded row with the same
 * email (e.g. caleb@example.com) is linked instead of duplicated, so the demo feed keeps working.
 */
export async function ensureUserRow(supertokensId: string, email: string, name?: string | null) {
  const existing = await sql`select * from users where supertokens_id = ${supertokensId} limit 1`;
  if (existing[0]) return existing[0];
  const displayName = (name ?? '').trim() || email.split('@')[0];
  const rows = await sql`
    insert into users (supertokens_id, name, email, avatar_url, is_online)
    values (${supertokensId}, ${displayName}, ${email.toLowerCase()}, ${defaultAvatar(email)}, true)
    on conflict (email) do update set supertokens_id = excluded.supertokens_id, is_online = true
    returning *`;
  return rows[0];
}

export function backendConfig(): TypeInput {
  return {
    framework: 'custom',
    isInServerlessEnv: true,
    supertokens: {
      connectionURI: process.env.SUPERTOKENS_CONNECTION_URI ?? '',
      apiKey: process.env.SUPERTOKENS_API_KEY,
    },
    appInfo: getAppInfo(),
    recipeList: [
      EmailPassword.init({
        signUpFeature: {
          formFields: [{id: 'firstName'}, {id: 'lastName', optional: true}],
        },
        override: {
          apis: original => ({
            ...original,
            signUpPOST: async input => {
              if (!original.signUpPOST) throw new Error('signUpPOST disabled');
              const res = await original.signUpPOST(input);
              if (res.status === 'OK') {
                const field = (id: string) => String(input.formFields.find(f => f.id === id)?.value ?? '').trim();
                const firstName = field('firstName');
                const lastName = field('lastName');
                const email = field('email');
                const userId = res.user.id;
                await UserMetadata.updateUserMetadata(userId, {first_name: firstName, last_name: lastName});
                await ensureUserRow(userId, email, `${firstName} ${lastName}`.trim());
              }
              return res;
            },
          }),
        },
      }),
      Session.init({
        getTokenTransferMethod: () => 'cookie',
        exposeAccessTokenToFrontendInCookieBasedAuth: true,
      }),
      UserMetadata.init(),
    ],
  };
}

let initialised = false;
export function ensureSuperTokensInit() {
  if (initialised) return;
  supertokens.init(backendConfig());
  initialised = true;
}
