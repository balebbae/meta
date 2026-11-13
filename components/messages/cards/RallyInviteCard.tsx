'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {Hexagon} from 'lucide-react';
import type {RallyInvitePayload} from '@/lib/activities/types';
import {ConsentSheet} from '@/components/turf/ConsentSheet';
import {HexMap} from '@/components/turf/HexMap';
import {endsLabel, timeLeft, turfApi, useTurfState} from '@/components/turf/api';
import h from '@/components/activities/home/home.module.css';
import type {CardProps} from './index';
import {MemberRing} from './MemberRing';
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
  // ring per player: their share of the leader's cells once anyone holds some; before that, full once they are in
  const cells = Object.fromEntries((state?.scores ?? []).map(sc => [sc.playerId, sc.cells]));
  const top = Math.max(0, ...Object.values(cells));
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
      <div className={styles.hero}>
        <span className={styles.glyph} aria-hidden>
          <Hexagon size={20} />
        </span>
        <div className={styles.heroText}>
          <p className={h.eyebrow}>Turf{state ? ` · ${STATUS[state.status]}` : ''}</p>
          <div className={styles.title}>{title}</div>
          {state?.status !== 'ended' && endsAt && (
            <div className={`${styles.live} ${styles.liveSm}`}>
              <b>{timeLeft(endsAt)}</b>
            </div>
          )}
        </div>
      </div>
      {state ? (
        <Link href={`/games/${gameId}`} aria-label="Open the Turf map" style={{display: 'block'}}>
          <HexMap arena={state.arena} cells={state.cells} colors={colors} grid="preview" label={`Arena preview: ${title}`} />
        </Link>
      ) : (
        // same footprint as the loaded card, so the thread does not jump once the state arrives
        <div className={styles.cardBody} style={{aspectRatio: '1', display: 'grid', placeItems: 'center'}}>
          <span className={styles.cardMeta}>{error ?? 'Loading the arena…'}</span>
        </div>
      )}
      <div className={styles.cardBody}>
        <div className={styles.cardMeta}>
          {state?.status === 'ended' ? 'Game over' : endsAt ? `Ends ${endsLabel(endsAt)}` : ''}
          {state ? ` · ${(state.arena.radiusKm * 2).toFixed(1)} km wide` : ''}
          {players.length > 0 && ` · ${inSoFar.length} in${waiting.length ? `, ${waiting.length} invited` : ''}`}
        </div>
        {!state && !error && <div style={{height: 36, marginTop: 10}} />}
        {players.length > 0 && (
          <div className={styles.squad} style={{minHeight: 36}} aria-label="Players">
            {[...inSoFar, ...waiting].slice(0, 6).map(p => (
              <MemberRing key={p.id} size={36} color={p.color} pct={p.status !== 'accepted' ? 0 : top ? ((cells[p.id] ?? 0) / top) * 100 : 100} label={`${p.name}${p.status === 'accepted' ? (top ? `: ${cells[p.id] ?? 0} cells` : '') : ' (invited)'}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.avatarUrl} alt="" width={28} height={28} className={p.status === 'accepted' ? undefined : styles.ringPending} />
              </MemberRing>
            ))}
          </div>
        )}
      </div>
      <div className={styles.cardActions}>
        {me?.canAccept ? (
          <>
            <Link href={`/games/${gameId}`} className={`${h.pill} ${h.pillQuiet}`}>
              Open map
            </Link>
            <button type="button" className={`${h.pill} ${h.pillGhost}`} onClick={() => void decline()} disabled={busy || me.status === 'declined'}>
              {me.status === 'declined' ? 'Declined' : 'Decline'}
            </button>
            <button type="button" className={`${h.pill} ${h.pillEmber}`} onClick={accept} disabled={busy}>
              Accept
            </button>
          </>
        ) : (
          <Link href={`/games/${gameId}`} className={`${h.pill} ${h.pillEmber}`}>
            Open map
          </Link>
        )}
      </div>
      <ConsentSheet gameId={gameId} title={title} open={consent} onClose={() => setConsent(false)} onAccepted={setState} />
    </div>
  );
}
