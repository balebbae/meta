'use client';
import styles from './boss.module.css';

export type BossKind = 'goblin' | 'golem' | 'dragon' | 'serpent' | 'yeti' | 'spectre' | 'beast';

const PALETTE: Record<BossKind, {body: string; dark: string; accent: string}> = {
  goblin: {body: '#5CB85C', dark: '#3C7D3C', accent: '#F2C200'},
  golem: {body: '#8D99AE', dark: '#5D677A', accent: '#F77F00'},
  dragon: {body: '#D62828', dark: '#8E1B1B', accent: '#FFD166'},
  serpent: {body: '#06A77D', dark: '#04755A', accent: '#F4F1BB'},
  yeti: {body: '#CFE8FF', dark: '#8FB8DE', accent: '#1877F2'},
  spectre: {body: '#9D4EDD', dark: '#5A189A', accent: '#E0AAFF'},
  beast: {body: '#B5651D', dark: '#7A4210', accent: '#FFD166'},
};

/** Boss art: Muse image when the quest has one, else one of seven drawn SVG bosses. `hurt` plays a shake, `down` greys it out. */
export function BossArt({kind, imageUrl, name, size = 160, hurt = false, down = false}: {kind: BossKind | string; imageUrl?: string | null; name: string; size?: number; hurt?: boolean; down?: boolean}) {
  const k = (kind in PALETTE ? kind : 'goblin') as BossKind;
  const p = PALETTE[k];
  const cls = `${styles.boss} ${hurt ? styles.hurt : ''} ${down ? styles.down : ''}`;
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt={name} width={size} height={size} className={cls} style={{borderRadius: 16, objectFit: 'cover'}} />;
  }
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={cls} role="img" aria-label={name}>
      <ellipse cx="60" cy="112" rx="34" ry="5" fill="rgba(0,0,0,0.12)" />
      {k === 'dragon' && (
        <g className={styles.wings}>
          <path d="M28 60 L4 36 L20 62 L4 70 Z" fill={p.dark} />
          <path d="M92 60 L116 36 L100 62 L116 70 Z" fill={p.dark} />
        </g>
      )}
      {k === 'serpent' ? <path d="M30 100 Q20 70 50 70 T90 50 Q100 30 80 24" stroke={p.body} strokeWidth="18" fill="none" strokeLinecap="round" /> : <rect x="30" y="40" width="60" height="64" rx={k === 'golem' ? 10 : 28} fill={p.body} />}
      {k === 'golem' && (
        <>
          <rect x="22" y="48" width="14" height="36" rx="5" fill={p.dark} />
          <rect x="84" y="48" width="14" height="36" rx="5" fill={p.dark} />
        </>
      )}
      {k === 'yeti' && <path d="M30 60 Q60 30 90 60 L90 104 Q60 112 30 104 Z" fill="#fff" opacity="0.5" />}
      {k === 'spectre' && <path d="M30 104 Q38 90 46 104 Q54 90 62 104 Q70 90 78 104 Q86 90 90 104 L90 70 L30 70 Z" fill={p.dark} />}
      {k === 'beast' && (
        <>
          <path d="M34 44 L26 22 L46 38 Z" fill={p.dark} />
          <path d="M86 44 L94 22 L74 38 Z" fill={p.dark} />
        </>
      )}
      {k === 'goblin' && (
        <>
          <path d="M32 52 L10 40 L34 62 Z" fill={p.body} />
          <path d="M88 52 L110 40 L86 62 Z" fill={p.body} />
        </>
      )}
      {/* eyes */}
      <g className={styles.eyes}>
        <circle cx="48" cy="62" r="8" fill="#fff" />
        <circle cx="72" cy="62" r="8" fill="#fff" />
        <circle cx="49" cy="63" r="3.5" fill="#1C1E21" />
        <circle cx="73" cy="63" r="3.5" fill="#1C1E21" />
        <path d="M40 54 L54 58 M80 54 L66 58" stroke={p.dark} strokeWidth="3" strokeLinecap="round" />
      </g>
      {/* mouth */}
      <path d="M46 82 Q60 92 74 82" stroke="#1C1E21" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M50 83 L53 89 L56 83 M64 83 L67 89 L70 83" fill="#fff" />
      {/* accent */}
      <circle cx="60" cy="100" r="5" fill={p.accent} />
    </svg>
  );
}
