import supertokens from 'supertokens-node';
import EmailPassword from 'supertokens-node/recipe/emailpassword';
import Session from 'supertokens-node/recipe/session';
import UserMetadata from 'supertokens-node/recipe/usermetadata';
import type {TypeInput} from 'supertokens-node/types';
import {getAppInfo} from '@/lib/supertokens/appInfo';
import {sql} from '@/lib/db';

/** New accounts start with Facebook's grey silhouette until they upload a photo. */
export const DEFAULT_AVATAR = '/auth/default-avatar.png';


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
    values (${supertokensId}, ${displayName}, ${email.toLowerCase()}, ${DEFAULT_AVATAR}, true)
    on conflict (email) do update set supertokens_id = excluded.supertokens_id, is_online = true
    returning *`;
  return rows[0];
}

const PASSWORD_ERROR = 'Enter a combination of at least six numbers, letters and punctuation marks (like ! and &).';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const PRONOUNS: Record<string, string> = {she: 'She/her', he: 'He/him', they: 'They/them'};

/** `2004-03-14` -> `March 14, 2004`, the format the seeded `user_details.birthday` rows use. */
export function formatBirthday(iso: string): string | null {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(iso);
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

export function formatGender(gender: string, custom: string): string | null {
  if (gender === 'female') return 'Female';
  if (gender === 'male') return 'Male';
  if (gender === 'custom') return custom.slice(0, 60) || 'Custom';
  return null;
}

/** Birthday / gender / pronouns picked on the sign-up form land in `user_details` (shown on the profile's About tab). */
export async function saveSignUpDetails(userId: number, d: {birthday: string | null; gender: string | null; pronouns: string | null}) {
  if (!d.birthday && !d.gender && !d.pronouns) return;
  await sql`
    insert into user_details (user_id, birthday, gender, pronouns)
    values (${userId}, ${d.birthday}, ${d.gender}, ${d.pronouns})
    on conflict (user_id) do update set
      birthday = coalesce(excluded.birthday, user_details.birthday),
      gender = coalesce(excluded.gender, user_details.gender),
      pronouns = coalesce(excluded.pronouns, user_details.pronouns)`;
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
          formFields: [
            // facebook.com/reg: "a combination of at least six numbers, letters and punctuation marks"
            {id: 'password', validate: async (v: unknown) => (typeof v === 'string' && v.length >= 6 && v.length < 100 ? undefined : PASSWORD_ERROR)},
            {id: 'firstName'},
            {id: 'lastName', optional: true},
            {id: 'birthday', optional: true},
            {id: 'gender', optional: true},
            {id: 'pronoun', optional: true},
            {id: 'customGender', optional: true},
          ],
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
                const row = await ensureUserRow(userId, email, `${firstName} ${lastName}`.trim());
                try {
                  await saveSignUpDetails(Number(row.id), {
                    birthday: formatBirthday(field('birthday')),
                    gender: formatGender(field('gender'), field('customGender')),
                    pronouns: field('gender') === 'custom' ? (PRONOUNS[field('pronoun')] ?? null) : null,
                  });
                } catch (err) {
                  console.error('sign-up: could not save user_details', err);
                }
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
