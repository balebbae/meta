import type {Metadata} from 'next';
import {notFound, redirect} from 'next/navigation';
import {TurfGame} from '@/components/turf/TurfGame';
import {getSessionUser} from '@/lib/auth';
import {buildState, canView, getGame} from '@/lib/turf/store';

export const metadata: Metadata = {title: 'Turf | Facebook'};
export const dynamic = 'force-dynamic';

export default async function GamePage({params, searchParams}: {params: Promise<{id: string}>; searchParams: Promise<{accept?: string; consent?: string}>}) {
  const user = await getSessionUser();
  if (!user) redirect('/auth');
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const game = await getGame(id);
  if (!game || game.type !== 'turf' || !(await canView(game, user.id))) notFound();
  const state = await buildState(game, user.id);
  const q = await searchParams;
  return <TurfGame gameId={id} initial={state} autoAccept={q.accept === '1' || q.consent === '1'} />;
}
