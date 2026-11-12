import {sql} from '@/lib/db';
import {shouldShowIntro} from '@/lib/activities/onboarding';
import {IntroModal, type IntroInvite} from './IntroModal';

/**
 * Server helper for any /activities route: renders the IntroModal when the user hasn't onboarded (and isn't
 * snoozed), when ?intro=1 is present, or when ?invite=<gameId> points at a real game.
 * Usage (server component): <OnboardingGate userId={user.id} searchParams={await searchParams} />
 */
export async function OnboardingGate({userId, searchParams}: {userId: number; searchParams?: Record<string, string | string[] | undefined>}) {
  const q = (k: string) => {
    const v = searchParams?.[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const inviteId = Number(q('invite'));
  let invite: IntroInvite | null = null;
  if (inviteId > 0) {
    const rows = await sql`select g.id, g.game_type, g.settings->>'title' as title, g.settings->>'arena' as arena, coalesce(u.name, 'A friend') as inviter
      from games g left join users u on u.id = g.host_id where g.id = ${inviteId} limit 1`.catch(() => []);
    const g = rows[0] as {id: number; game_type: string; title: string | null; arena: string | null; inviter: string} | undefined;
    if (g) invite = {gameId: g.id, inviterName: g.inviter, gameTitle: `${g.game_type === 'turf' ? 'Turf' : 'Rally'}: ${g.title ?? g.arena ?? 'a game'}`, mode: g.game_type};
  }
  const forced = q('intro') === '1';
  const show = forced || invite != null || (await shouldShowIntro(userId));
  if (!show) return null;
  return <IntroModal open invite={invite} />;
}
