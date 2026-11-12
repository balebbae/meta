'use client';
import {useState} from 'react';
import {StepShell} from './StepShell';
import {ACTIVITY_TAGS, GOAL_TAGS, STYLE_TAGS, type TagKind, type UserTag} from '@/lib/activities/types';
import styles from '../activities.module.css';

const GROUPS: {kind: TagKind; title: string; hint: string; tags: string[]}[] = [
  {kind: 'activity', title: 'Activities', hint: 'Pick what you do or want to try.', tags: ACTIVITY_TAGS},
  {kind: 'goal', title: 'Goals', hint: 'What should the next few weeks do for you?', tags: GOAL_TAGS},
  {kind: 'style', title: 'Style', hint: 'How you like to move.', tags: STYLE_TAGS},
];

export function TagsStep({initial, invite}: {initial: UserTag[]; invite: number | null}) {
  const [picked, setPicked] = useState<Map<string, {tag: string; kind: TagKind}>>(() => new Map(initial.filter(t => t.kind !== 'constraint').map(t => [`${t.kind}:${t.tag}`, {tag: t.tag, kind: t.kind}])));
  const [custom, setCustom] = useState('');
  const [customKind, setCustomKind] = useState<TagKind>('activity');
  const constraints = initial.filter(t => t.kind === 'constraint');

  function toggle(kind: TagKind, tag: string) {
    const key = `${kind}:${tag}`;
    const m = new Map(picked);
    if (m.has(key)) m.delete(key);
    else m.set(key, {tag, kind});
    setPicked(m);
  }
  function addCustom() {
    const tag = custom.trim().replace(/\s+/g, ' ').slice(0, 40);
    if (!tag) return;
    toggle(customKind, tag[0].toUpperCase() + tag.slice(1));
    setCustom('');
  }

  async function save() {
    const tags = [...picked.values()];
    const res = await fetch('/api/activities/onboarding', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({tags})});
    if (!res.ok) throw new Error('Could not save tags');
  }

  return (
    <StepShell step="tags" invite={invite} save={save}>
      <p className={styles.sub}>Activities and goals are visible to friends by default; anything you mark as a limit is Muse-only. Change either later under Privacy.</p>
      {GROUPS.map(g => {
        const customs = [...picked.values()].filter(t => t.kind === g.kind && !g.tags.includes(t.tag));
        return (
          <div key={g.kind} className={styles.card}>
            <h2 className={styles.h2}>
              {g.title} <span className={styles.badge}>friends</span>
            </h2>
            <p className={styles.small} style={{marginBottom: 10}}>
              {g.hint}
            </p>
            <div className={styles.chips}>
              {[...g.tags, ...customs.map(c => c.tag)].map(tag => {
                const on = picked.has(`${g.kind}:${tag}`);
                return (
                  <button key={tag} className={on ? styles.chipOn : styles.chip} aria-pressed={on} onClick={() => toggle(g.kind, tag)}>
                    {on ? '✓ ' : ''}
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className={styles.card}>
        <h2 className={styles.h2}>Something else?</h2>
        <div className={styles.row} style={{flexWrap: 'nowrap'}}>
          <input className={styles.input} placeholder="Rowing, bouldering, dog walks…" value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustom())} aria-label="Custom tag" />
          <select className={styles.select} value={customKind} onChange={e => setCustomKind(e.target.value as TagKind)} aria-label="Tag group">
            <option value="activity">Activity</option>
            <option value="goal">Goal</option>
            <option value="style">Style</option>
          </select>
          <button className={styles.btn} onClick={addCustom} disabled={!custom.trim()}>
            Add
          </button>
        </div>
        {constraints.length > 0 && (
          <p className={styles.small} style={{marginTop: 10}}>
            Muse-only: {constraints.map(c => c.tag).join(', ')}
          </p>
        )}
      </div>
    </StepShell>
  );
}
