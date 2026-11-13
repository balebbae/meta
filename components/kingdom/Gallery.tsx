'use client';
/** Beta Kingdom gallery: category tabs, asset list, one 3D canvas, controls, and the games launcher. */
import {useEffect, useMemo, useState} from 'react';
import {CATALOG, CATEGORIES, assetById, assetsIn} from '@/lib/kingdom/catalog';
import {GAME_INFO, type GameId} from '@/lib/kingdom/games/common';
import {KINGDOM_THEME} from '@/lib/kingdom/theme/kingdom';
import type {BuildOptions, Rig} from '@/lib/kingdom/types';
import {Controls} from './Controls';
import {GameHost} from './games/GameHost';
import {Preview} from './Preview';
import {getRig, releaseAllRigs, rigKey} from './rigCache';
import {useKingdom} from './store';
import styles from './kingdom.module.css';

const GAMES: GameId[] = ['joust', 'dash', 'defense', 'quest'];

export function Gallery() {
  const st = useKingdom();
  const def = assetById(st.selectedId) ?? CATALOG[0];
  const options = useMemo<BuildOptions>(() => {
    const o: BuildOptions = {};
    if (def.customizable.includes('hero')) o.hero = st.hero;
    if (def.customizable.includes('variant')) o.variant = st.variant;
    if (def.customizable.includes('mount')) { o.rider = st.rider; if (st.rider) o.hero = st.hero; }
    if (def.category === 'world') o.seed = st.seed;
    return o;
  }, [def, st.hero, st.variant, st.rider, st.seed]);
  const key = rigKey(def, options);
  const [view, setView] = useState<{status: 'loading' | 'ready' | 'error'; rig: Rig | null; error: string}>({status: 'loading', rig: null, error: ''});

  useEffect(() => {
    let cancelled = false;
    setView((v) => ({...v, status: 'loading', error: ''}));
    const id = requestAnimationFrame(() => {
      try { const rig = getRig(def, options); if (!cancelled) setView({status: 'ready', rig, error: ''}); }
      catch (e) { if (!cancelled) setView({status: 'error', rig: null, error: e instanceof Error ? e.message : 'Could not build this asset.'}); }
    });
    return () => { cancelled = true; cancelAnimationFrame(id); };
    // `key` is the full identity of (def, options); options is rebuilt only when its inputs change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => st.setReducedMotion(mq.matches); apply(); mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => () => releaseAllRigs(), []);

  const list = assetsIn(st.category);
  const theme = KINGDOM_THEME;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{theme.labels.gallery}</h1>
          <p className={styles.tagline}>{theme.labels.tagline}</p>
        </div>
        <nav className={styles.headerNav} aria-label="Games">
          {st.game ? <button type="button" className={styles.btn} onClick={() => st.openGame(null)}>← Back to gallery</button> : GAMES.map((g) => <button key={g} type="button" className={styles.btn} onClick={() => st.openGame(g)}>{GAME_INFO[g].title}</button>)}
        </nav>
      </header>
      {st.game ? <GameHost game={st.game} key={st.game} /> : (
        <div className={styles.grid}>
          <nav className={styles.side} aria-label="Assets">
            <div className={styles.tabs} role="tablist" aria-label="Categories">
              {CATEGORIES.map((c) => <button key={c.id} type="button" role="tab" aria-selected={st.category === c.id} className={styles.tab} onClick={() => { st.setCategory(c.id); const first = assetsIn(c.id)[0]; if (first && assetById(st.selectedId)?.category !== c.id) st.select(first.id, c.id); }}>{c.label}</button>)}
            </div>
            <p className={styles.hint}>{CATEGORIES.find((c) => c.id === st.category)?.blurb}</p>
            <ul className={styles.list}>
              {list.map((a) => (
                <li key={a.id}><button type="button" className={styles.item} aria-current={a.id === def.id ? 'true' : undefined} onClick={() => st.select(a.id, a.category)}><span className={styles.itemName}>{a.name}</span><span className={styles.itemSub}>{a.subtitle}</span></button></li>
              ))}
            </ul>
          </nav>
          <section className={styles.stage} aria-label="3D preview">
            <div className={styles.canvas}><Preview rig={view.status === 'ready' ? view.rig : null} onError={(error) => setView({status: 'error', rig: null, error})} /></div>
            <div className={styles.caption} aria-hidden="true"><strong>{def.name}</strong><span>{def.subtitle}</span></div>
            {view.status === 'loading' ? <div className={styles.overlay} role="status">Building {def.name}…</div> : null}
            {view.status === 'error' ? <div className={styles.overlay} role="alert"><p>{view.error}</p><button type="button" className={styles.btn} onClick={() => st.select(def.id)}>Try again</button></div> : null}
            <p className={styles.srOnly}>Drag to orbit, scroll to zoom. Use the View controls for camera presets.</p>
          </section>
          <Controls def={def} rig={view.status === 'ready' ? view.rig : null} />
        </div>
      )}
      {!st.game ? (
        <section className={styles.games} aria-label="Mini games">
          {GAMES.map((g) => (
            <article key={g} className={styles.gameCard}>
              <h3>{GAME_INFO[g].title}</h3><p>{GAME_INFO[g].blurb}</p>
              <div className={styles.row}><button type="button" className={styles.btn} onClick={() => st.openGame(g)}>Play</button><span className={styles.hint}>Best: {st.best[g] ?? 0}</span></div>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}
