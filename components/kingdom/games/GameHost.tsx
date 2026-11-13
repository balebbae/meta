'use client';
/** Hosts one game: its canvas, HUD, intro/result cards and touch controls. Scenes report HUD snapshots; the host never touches game state. */
import {useCallback, useMemo, useRef, useState} from 'react';
import {Canvas} from '@react-three/fiber';
import {ACESFilmicToneMapping, SRGBColorSpace, type WebGLRenderer} from 'three';
import {GAME_INFO, type GameId, type Input} from '@/lib/kingdom/games/common';
import {useInput, type TouchBind} from '../useInput';
import {useKingdom} from '../store';
import type {Hud} from './scene';
import {JoustScene} from './JoustScene';
import {DashScene} from './DashScene';
import {DefenseScene} from './DefenseScene';
import {QuestScene} from './QuestScene';
import styles from '../kingdom.module.css';

const SCENES = {joust: JoustScene, dash: DashScene, defense: DefenseScene, quest: QuestScene} as const;
const IDLE: Hud = {phase: 'intro', score: 0, message: '', left: '', right: ''};

function Pad({bind, keys}: {bind: (name: keyof Input | (keyof Input)[]) => TouchBind; keys: ('up' | 'down' | 'left' | 'right')[]}) {
  const cell: Record<string, [number, number, string]> = {up: [2, 1, '▲'], left: [1, 2, '◀'], right: [3, 2, '▶'], down: [2, 3, '▼']};
  return (
    <div className={styles.pad} aria-label="Direction pad">
      {keys.map((k) => <button key={k} type="button" className={styles.padBtn} style={{gridColumn: cell[k][0], gridRow: cell[k][1]}} aria-label={k} {...bind(k)}>{cell[k][2]}</button>)}
    </div>
  );
}

export function GameHost({game}: {game: GameId}) {
  const info = GAME_INFO[game];
  const shadows = useKingdom((s) => s.shadows), best = useKingdom((s) => s.best[game] ?? 0), recordBest = useKingdom((s) => s.recordBest), openGame = useKingdom((s) => s.openGame);
  const [runId, setRunId] = useState(0);
  const [hud, setHud] = useState<Hud>(IDLE);
  const seed = useMemo(() => Math.floor(Math.random() * 1e9) + runId, [runId]);
  const {ref: input, bind} = useInput(hud.phase === 'playing');
  const last = useRef<Hud>(IDLE);
  const report = useCallback((h: Hud) => {
    const l = last.current;
    if (l.phase === h.phase && l.score === h.score && l.message === h.message && l.left === h.left && l.right === h.right) return;
    if ((h.phase === 'won' || h.phase === 'lost') && l.phase !== h.phase) recordBest(game, h.score);
    last.current = {...h}; setHud({...h});
  }, [game, recordBest]);
  const Scene = SCENES[game];
  const playing = hud.phase === 'playing';
  return (
    <section className={styles.arena} aria-label={info.title}>
      <Canvas dpr={[1, 2]} shadows={shadows !== 'off'} gl={{antialias: true, powerPreference: 'high-performance'}} camera={{fov: 45, near: 0.1, far: 200, position: [0, 5, 10]}}
        onCreated={({gl}: {gl: WebGLRenderer}) => { gl.toneMapping = ACESFilmicToneMapping; gl.outputColorSpace = SRGBColorSpace; gl.toneMappingExposure = 1.05; }}>
        <Scene runId={runId} input={input} report={report} seed={seed} />
      </Canvas>
      {game === 'dash' && playing ? <div className={styles.tapLayer} aria-hidden="true" {...bind(['jump', 'action'])} /> : null}
      <div className={styles.hud} aria-live="polite"><div className={styles.hudBox}>{hud.left}</div><div className={styles.hudBox}>Score {hud.score}</div><div className={styles.hudBox}>{hud.right}</div></div>
      {playing && hud.message ? <div className={styles.hudMsg} role="status">{hud.message}</div> : null}
      {playing ? (
        <div className={styles.touch}>
          {game === 'joust' ? <><Pad bind={bind} keys={['up', 'down']} /><button type="button" className={styles.bigBtn} {...bind('action')}>BRACE</button></> : null}
          {game === 'defense' ? <><Pad bind={bind} keys={['left', 'right']} /><button type="button" className={styles.bigBtn} {...bind('action')}>SWING</button></> : null}
          {game === 'quest' ? <Pad bind={bind} keys={['up', 'left', 'right', 'down']} /> : null}
          {game === 'dash' ? <><span /><button type="button" className={styles.bigBtn} {...bind(['jump', 'action'])}>FLAP</button></> : null}
        </div>
      ) : null}
      {hud.phase === 'intro' ? (
        <div className={styles.card}><div className={styles.cardInner} role="dialog" aria-labelledby="game-title">
          <h2 id="game-title">{info.title}</h2><p>{info.blurb}</p>
          <ol>{info.howTo.map((line) => <li key={line}>{line}</li>)}</ol>
          <p className={styles.hint}>Keyboard: {info.desktop}. Touch: {info.touch}. Best so far: {best}.</p>
          <div className={styles.row}><button type="button" className={styles.btn} autoFocus onClick={() => setRunId((r) => r + 1)}>Start</button><button type="button" className={styles.btn} onClick={() => openGame(null)}>Back to gallery</button></div>
        </div></div>
      ) : null}
      {hud.phase === 'won' || hud.phase === 'lost' ? (
        <div className={styles.card}><div className={styles.cardInner} role="dialog" aria-labelledby="result-title">
          <h2 id="result-title">{hud.phase === 'won' ? 'Victory!' : 'Defeated'}</h2><p>{hud.message}</p>
          <p><strong>Score {hud.score}</strong> · Best {Math.max(best, hud.score)}</p>
          <div className={styles.row}><button type="button" className={styles.btn} autoFocus onClick={() => setRunId((r) => r + 1)}>Play again</button><button type="button" className={styles.btn} onClick={() => openGame(null)}>Back to gallery</button></div>
        </div></div>
      ) : null}
    </section>
  );
}
