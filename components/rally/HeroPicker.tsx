'use client';
/** The hero picker: a grid of catalog heroes (silhouette × skin tone). Clicking selects; the save is the caller's job. */
import {HERO_CHOICES, castHero, type HeroPick} from '@/lib/kingdom/cast';
import {useSprite} from '@/components/kingdom/sprite';
import styles from './heropicker.module.css';

const samePick = (a: HeroPick | null, b: HeroPick) => a != null && a.gender === b.gender && a.skin === b.skin && a.seed === b.seed;

function Option({pick, selected, onSelect}: {pick: HeroPick; selected: boolean; onSelect: (p: HeroPick) => void}) {
  const url = useSprite(castHero('hero', [], pick));
  const failed = url === 'error';
  return (
    <button type="button" role="radio" aria-checked={selected} aria-label="Hero option" className={`${styles.option} ${selected ? styles.selected : ''}`} onClick={() => onSelect(pick)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- data URL sprites */}
      {url && !failed ? <img className={styles.sprite} src={url} alt="" draggable={false} /> : <span className={styles.pending} />}
    </button>
  );
}

export function HeroPicker({value, onChange}: {value: HeroPick | null; onChange: (p: HeroPick) => void}) {
  return (
    <div className={styles.grid} role="radiogroup" aria-label="Choose your hero">
      {HERO_CHOICES.map(p => (
        <Option key={`${p.gender}:${p.skin}:${p.seed}`} pick={p} selected={samePick(value, p)} onSelect={onChange} />
      ))}
    </div>
  );
}
