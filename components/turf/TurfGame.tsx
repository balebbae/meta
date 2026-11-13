'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {useEffect, useMemo, useRef, useState} from 'react';
import {ArrowLeftIcon} from '@/components/icons';
import {NEUTRAL} from '@/lib/turf/colors';
import type {TurfState} from '@/lib/turf/types';
import {ConsentCopy} from './ConsentSheet';
import {HexMap} from './HexMap';
import {PrivacyZones} from './PrivacyZones';
import {StravaConnection} from './StravaConnection';
import {endsLabel, timeLeft, turfApi, useTurfState, type PointsResult} from './api';
import styles from './turf.module.css';
import {useTracker} from './useTracker';

const KingdomView = dynamic(() => import('./KingdomView'), {ssr: false});

const STATUS: Record<string, string> = {pending: 'Not started', live: 'Live', ended: 'Ended', cancelled: 'Cancelled'};
const INVITE: Record<string, string> = {invited: 'Invited', declined: 'Passed', left: 'Left', expired: 'Expired'};

function useNow(ms: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function TurfGame({gameId, initial, autoAccept}: {gameId: number; initial: TurfState; autoAccept?: boolean}) {
  const {state: polled, setState, refresh} = useTurfState(gameId, 3000, initial);
  const state = polled ?? initial;
  const now = useNow(15_000);
  const [busy, setBusy] = useState<string | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [myOuting, setMyOuting] = useState(state.me.outing);
  const fileRef = useRef<HTMLInputElement>(null);
  // Kingdom is the game board; Map is the same cells on real streets, which is what you want while you run.
  const [view, setView] = useState<'kingdom' | 'map'>('kingdom');
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches), []);

  useEffect(() => setMyOuting(state.me.outing), [state.me.outing]);

  const onResult = (r: PointsResult) => {
    setMyOuting(r.outing);
    if (r.recap) setNote(r.recap);
    else if (r.cut) setNote('Your trail was cut. This outing claims nothing.');
    else if (r.outing.status !== 'open' && r.gained === 0) setNote('Outing finished. No loop was closed, so no cells were claimed.');
    void refresh();
  };
  const tracker = useTracker(gameId, state.status === 'live' && state.me.status === 'accepted' ? state.me.outing : null, onResult);

  const run = async (key: string, fn: () => Promise<TurfState | void>) => {
    setBusy(key);
    setError(null);
    try {
      const s = await fn();
      if (s) setState(s);
      else await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(null);
    }
  };

  const colors = useMemo(() => Object.fromEntries(state.players.map(p => [p.id, p.color])), [state.players]);
  const cellsOf = useMemo(() => Object.fromEntries(state.scores.map(s => [s.playerId, s])), [state.scores]);
  const me = state.me;
  const accepted = me.status === 'accepted';
  const live = state.status === 'live';
  const players = [...state.players].sort((a, b) => (cellsOf[a.id]?.rank ?? 99) - (cellsOf[b.id]?.rank ?? 99));
  const neutral = state.cells.filter(([, o]) => !colors[o]).length;
  const winner = state.winnerId != null ? state.players.find(p => p.id === state.winnerId) : null;
  const trail = accepted && myOuting?.status === 'open' ? myOuting.trail : [];
  const back = state.conversationId ? `/messages/${state.conversationId}` : '/activities';

  return (
    <main className={styles.page}>
      <section className={styles.mapCard}>
        <div className={styles.head}>
          <Link href={back} className={styles.back} aria-label="Back to the chat">
            <ArrowLeftIcon size={20} />
          </Link>
          <div className={styles.titleBox}>
            <h1 className={styles.title}>Turf: {state.title}</h1>
            <div className={styles.sub}>
              {(state.arena.radiusKm * 2).toFixed(1)} km arena · {state.lengthDays} day{state.lengthDays === 1 ? '' : 's'}
              {state.endsAt && state.status !== 'ended' ? ` · ends ${endsLabel(state.endsAt)}` : ''}
            </div>
          </div>
          <span className={live ? styles.pillLive : styles.pill} aria-live="polite">
            {live ? timeLeft(state.endsAt, now) : STATUS[state.status]}
          </span>
        </div>
        <div className={styles.viewTabs} role="group" aria-label="How to show the arena">
          <button type="button" className={view === 'kingdom' ? styles.btnPrimary : styles.btn} aria-pressed={view === 'kingdom'} onClick={() => setView('kingdom')}>
            Kingdom
          </button>
          <button type="button" className={view === 'map' ? styles.btnPrimary : styles.btn} aria-pressed={view === 'map'} onClick={() => setView('map')}>
            Map
          </button>
        </div>
        {view === 'kingdom' ? (
          <div className={styles.kingdomWrap} role="img" aria-label={`Kingdom board of ${state.title}: ${players.map(p => `${p.name.split(' ')[0]} ${cellsOf[p.id]?.cells ?? 0} cells`).join(', ')}`}>
            <KingdomView arena={state.arena} players={state.players} cells={state.cells} trail={trail} viewerId={me.id} reducedMotion={reducedMotion} onError={() => setView('map')} />
          </div>
        ) : (
          <div className={styles.mapWrap}>
            <HexMap arena={state.arena} cells={state.cells} colors={colors} trail={trail} trailColor={colors[me.id]} me={tracker.position} label={`Turf map of ${state.title}`} />
          </div>
        )}
        <p className={styles.muted} style={{padding: '8px 4px 0'}}>
          {accepted ? 'Everyone in this game sees cells and who owns them. Routes and live positions are never shown; the dashed cells are your own open trail and only you can see them.' : 'Cells appear here once you join. Players only ever see cells, never routes.'}
        </p>
      </section>

      <aside className={styles.side}>
        {me.canAccept && (
          <section className={`${styles.panel} ${styles.span}`}>
            <h2 className={styles.panelTitle}>{me.status === 'declined' ? 'You passed on this game' : 'You are invited'}</h2>
            <div className={styles.consent} style={{padding: 0}}>
              <ConsentCopy title={state.title} />
              <div className={styles.row}>
                {me.status !== 'declined' && (
                  <button type="button" className={styles.btn} disabled={busy != null} onClick={() => void run('decline', () => turfApi.respond(gameId, 'declined'))}>
                    Decline
                  </button>
                )}
                <button type="button" className={styles.btnPrimary} autoFocus={autoAccept} disabled={busy != null} onClick={() => void run('accept', () => turfApi.respond(gameId, 'accepted', true))}>
                  {busy === 'accept' ? 'Joining…' : 'Allow location and join'}
                </button>
              </div>
              <p className={styles.muted}>Declining is quiet: only the host is told.</p>
            </div>
          </section>
        )}

        {accepted && (state.status === 'pending' || live) && (
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>{live ? 'Your outing' : 'Waiting to start'}</h2>
            <div className={styles.actions}>
              {state.status === 'pending' && <p className={styles.muted}>{me.isHost ? 'Start once at least two players are in.' : 'The host starts the game once enough players are in.'}</p>}
              {me.canStart && (
                <button type="button" className={`${styles.btnPrimary} ${styles.btnBig}`} disabled={busy != null} onClick={() => void run('start', () => turfApi.start(gameId))}>
                  {busy === 'start' ? 'Starting…' : 'Start game'}
                </button>
              )}
              {me.canResend && (
                <button type="button" className={styles.btn} disabled={busy != null} onClick={() => void run('resend', async () => (await turfApi.resend(gameId)).state)}>
                  Resend invite
                </button>
              )}
              {live &&
                (tracker.tracking ? (
                  <>
                    <div className={styles.tracker} role="status">
                      <span className={styles.pulse} />
                      <span>
                        Tracking · {tracker.sent} points sent · {trail.length} trail cells
                      </span>
                    </div>
                    <button type="button" className={`${styles.btnPrimary} ${styles.btnBig}`} disabled={tracker.busy} onClick={() => void tracker.finish()}>
                      {tracker.busy ? 'Finishing…' : 'Finish'}
                    </button>
                    <p className={styles.muted}>Keep this page open while you move. Close a loop back to your start or your own cells to claim everything inside it.</p>
                  </>
                ) : (
                  <>
                    <button type="button" className={`${styles.btnPrimary} ${styles.btnBig}`} disabled={tracker.busy || busy != null} onClick={() => void tracker.start()}>
                      {tracker.busy ? 'Starting…' : 'Start outing'}
                    </button>
                    <button type="button" className={styles.btn} disabled={busy != null} onClick={() => fileRef.current?.click()}>
                      {busy === 'gpx' ? 'Reading GPX…' : 'Upload GPX'}
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".gpx,application/gpx+xml,application/xml,text/xml"
                      className={styles.hidden}
                      onChange={e => {
                        const f = e.target.files?.[0];
                        e.target.value = '';
                        if (f) void run('gpx', async () => onResult(await turfApi.gpx(gameId, f)));
                      }}
                    />
                  </>
                ))}
              <StravaConnection>{live && <button type="button" className={styles.btn} disabled={busy != null || tracker.tracking} onClick={() => void run('strava', async () => {
                setNote(null);
                const result = await turfApi.importStrava(gameId);
                setNote(`Strava import: ${result.gained} cells gained.${result.gained === 0 ? ' No new loops in this arena since the game started (already imported runs are skipped).' : ''}`);
              })}>
                {busy === 'strava' ? 'Importing Strava runs…' : 'Import Strava runs'}
              </button>}</StravaConnection>
              {tracker.error && <p className={styles.error}>{tracker.error}</p>}
              {error && <p className={styles.error}>{error}</p>}
              {note && (
                <p className={styles.toast} role="status">
                  {note}
                </p>
              )}
            </div>
          </section>
        )}
        {!accepted && error && <p className={`${styles.error} ${styles.span}`}>{error}</p>}

        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>{state.status === 'ended' ? 'Final standings' : 'Players'}</h2>
          {winner && (
            <p className={styles.winner}>
              🏆 {winner.name} wins with {cellsOf[winner.id]?.cells ?? 0} cells
            </p>
          )}
          {players.map(p => (
            <div key={p.id} className={styles.legendRow}>
              <span className={styles.swatch} style={{background: p.status === 'accepted' ? p.color : NEUTRAL}} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.avatarUrl} alt="" className={p.status === 'accepted' ? undefined : styles.avatarPending} />
              <span className={styles.legendName}>
                {p.name}
                {p.id === me.id ? ' (you)' : ''}
                <small>{p.isHost ? 'Host' : (INVITE[p.status] ?? 'Playing')}</small>
              </span>
              {p.status === 'accepted' && accepted && (
                <span className={styles.legendCells}>
                  {cellsOf[p.id]?.cells ?? 0}
                  <small>cells</small>
                </span>
              )}
            </div>
          ))}
          {neutral > 0 && (
            <div className={styles.legendRow}>
              <span className={styles.swatch} style={{background: NEUTRAL}} />
              <span className={styles.legendName}>Neutral</span>
              <span className={styles.legendCells}>
                {neutral}
                <small>cells</small>
              </span>
            </div>
          )}
        </section>

        {accepted && live && (
          <details className={`${styles.panel} ${styles.span}`}>
            <summary className={styles.panelTitle} style={{cursor: 'pointer', marginBottom: 0}}>
              Stage demo
            </summary>
            <p className={styles.muted} style={{margin: '8px 0'}}>
              Replays a recorded Katy Trail route as you, through the same pipeline as a real outing (not live GPS).
            </p>
            <div className={styles.demoRow}>
              <button type="button" className={styles.btn} disabled={busy != null} onClick={() => void run('replay', async () => (await replay(gameId, 'priya_loop', setNote)).state)}>
                Loop + open trail
              </button>
              <button type="button" className={styles.btn} disabled={busy != null} onClick={() => void run('replay', async () => (await replay(gameId, 'sarah_cut', setNote)).state)}>
                Cut + take
              </button>
              {me.isHost && (
                <button type="button" className={styles.btnDanger} disabled={busy != null} onClick={() => void run('replay', async () => (await replay(gameId, 'reset', setNote)).state)}>
                  Reset board
                </button>
              )}
            </div>
          </details>
        )}

        {accepted && <PrivacyZones arena={state.arena} position={tracker.position} />}

        {accepted && state.status !== 'ended' && state.status !== 'cancelled' && (
          <button
            type="button"
            className={`${styles.btnDanger} ${styles.span}`}
            disabled={busy != null}
            onClick={() => setLeaveOpen(true)}
          >
            Leave game
          </button>
        )}
        <AlertDialog
          isOpen={leaveOpen}
          onOpenChange={open => busy !== 'leave' && setLeaveOpen(open)}
          title="Leave this Turf game?"
          description="Your cells turn neutral and you stop claiming ground in this game."
          actionLabel="Leave game"
          onAction={() => void run('leave', () => turfApi.leave(gameId)).then(() => setLeaveOpen(false))}
          isActionLoading={busy === 'leave'}
        />
      </aside>
    </main>
  );
}

async function replay(gameId: number, script: 'priya_loop' | 'sarah_cut' | 'reset', setNote: (s: string | null) => void) {
  const r = await turfApi.replay(gameId, script);
  setNote(script === 'reset' ? 'Board reset.' : (r.recap ?? null));
  return r;
}
