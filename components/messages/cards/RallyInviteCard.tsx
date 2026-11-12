'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import type {RallyInvitePayload} from '@/lib/activities/types';
import {ConsentSheet} from '@/components/turf/ConsentSheet';
import {HexMap} from '@/components/turf/HexMap';
import {endsLabel, timeLeft, turfApi, useTurfState} from '@/components/turf/api';
import turf from '@/components/turf/turf.module.css';
import type {CardProps} from './index';
import styles from './cards.module.css';

const STATUS: Record<string, string> = {pending: 'Waiting for players', live: 'Live', ended: 'Ended', cancelled: 'Cancelled'};

/** Turf invite in a thread. The payload is static, so the card polls the game state lightly. */
export default function RallyInviteCard({message}: CardProps) {
  const payload = (message.payload ?? {}) as Partial<RallyInvitePayload>;
  const gameId = Number(payload.gameId);
  const router = useRouter();
  const {state, setState, error} = useTurfState(gameId, 6000);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);

  const title = state?.title ?? payload.arenaLabel ?? payload.title ?? 'Turf';
  const endsAt = state?.endsAt ?? payload.endsAt ?? null;
  const players = state?.players ?? [];
  const inSoFar = players.filter(p => p.status === 'accepted');
  const waiting = players.filter(p => p.status === 'invited');
  const colors = Object.fromEntries(players.map(p => [p.id, p.color]));
  const me = state?.me;

  const accept = () => {
    // Not onboarded yet: Activities onboarding (scope A) takes over and returns to /games/<id>?consent=1,
    // which shows the same consent screen. Onboarded players get the consent sheet right here.
    if (me && !me.onboarded) router.push(`/activities?invite=${gameId}`);
    else setConsent(true);
  };
  const decline = async () => {
    setBusy(true);
    try {
      setState(await turfApi.respond(gameId, 'declined'));
    } catch {
      /* the next poll shows the real state */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.card} role="group" aria-label={`Turf invite: ${title}`}>
      <div className={styles.cardHead}>
        <span aria-hidden>⬢</span>
        <span style={{flex: 1, minWidth: 0}}>Turf: {title}</span>
        {state && <span className={state.status === 'live' ? turf.pillLive : turf.pill}>{STATUS[state.status]}</span>}
      </div>
      {state ? (
        <Link href={`/games/${gameId}`} aria-label="Open the Turf map" style={{display: 'block', padding: '0 12px'}}>
          <HexMap arena={state.arena} cells={state.cells} colors={colors} grid="preview" label={`Arena preview: ${title}`} />
        </Link>
      ) : (
        // same footprint as the loaded card, so the thread does not jump once the state arrives
        <div className={styles.cardBody} style={{aspectRatio: '1', margin: '0 12px', display: 'grid', placeItems: 'center'}}>
          <span className={styles.cardMeta}>{error ?? 'Loading the arena…'}</span>
        </div>
      )}
      <div className={styles.cardBody}>
        <div className={styles.cardMeta}>
          {state?.status === 'ended' ? 'Game over' : endsAt ? `Ends ${endsLabel(endsAt)} · ${timeLeft(endsAt)}` : ''}
          {state ? ` · ${(state.arena.radiusKm * 2).toFixed(1)} km wide` : ''}
        </div>
        {!state && !error && <div style={{height: 36, marginTop: 8}} />}
        {players.length > 0 && (
          <div style={{display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, minHeight: 36}}>
            <div className={turf.avatars}>
              {[...inSoFar, ...waiting].slice(0, 6).map(p => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.id} src={p.avatarUrl} alt={p.name} title={`${p.name}${p.status === 'accepted' ? '' : ' (invited)'}`} className={p.status === 'accepted' ? undefined : turf.avatarPending} style={{borderColor: p.status === 'accepted' ? p.color : undefined}} />
              ))}
            </div>
            <span className={styles.cardMeta}>
              {inSoFar.length} in{waiting.length ? ` · ${waiting.length} invited` : ''}
            </span>
          </div>
        )}
      </div>
      <div className={styles.cardActions}>
        {me?.canAccept ? (
          <>
            <Link href={`/games/${gameId}`} className={styles.btn} style={{display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none'}}>
              Open map
            </Link>
            <button type="button" className={styles.btn} onClick={() => void decline()} disabled={busy || me.status === 'declined'}>
              {me.status === 'declined' ? 'Declined' : 'Decline'}
            </button>
            <button type="button" className={styles.btnPrimary} onClick={accept} disabled={busy}>
              Accept
            </button>
          </>
        ) : (
          <Link href={`/games/${gameId}`} className={styles.btnPrimary} style={{display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none'}}>
            Open map
          </Link>
        )}
      </div>
      <ConsentSheet gameId={gameId} title={title} open={consent} onClose={() => setConsent(false)} onAccepted={setState} />
    </div>
  );
}
