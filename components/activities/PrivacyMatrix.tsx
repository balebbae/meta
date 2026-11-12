'use client';
import {useState} from 'react';
import {ChevronDownIcon, ChevronUpIcon} from '@/components/icons';
import {AUDIENCE_LABEL, CATEGORY_EXAMPLE, CATEGORY_LABEL, LEVEL_HELP, LEVEL_LABEL, categorySummary} from '@/lib/activities/summary';
import type {PolicyMatrix} from '@/lib/activities/policies';
import {AUDIENCES, CATEGORIES, type Audience, type Category, type ShareLevel} from '@/lib/activities/types';
import styles from './activities.module.css';

const LEVELS: ShareLevel[] = ['exact', 'rounded', 'boolean', 'muse_only', 'none'];
const ICON: Record<Category, string> = {workouts: '🏃', steps: '👟', heart: '❤️', sleep: '😴', body: '⚖️', location: '📍'};

/** Category × audience grid with the five levels (§7.2). Saves each change with PUT /api/privacy/policies. */
export function PrivacyMatrix({initial, onChange, compact}: {initial: PolicyMatrix; onChange?: (m: PolicyMatrix) => void; compact?: boolean}) {
  const [matrix, setMatrix] = useState<PolicyMatrix>(initial);
  const [open, setOpen] = useState<Category | null>(compact ? null : 'heart');
  const [saving, setSaving] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function update(category: Category, audience: Audience, level: ShareLevel) {
    const next = {...matrix, [category]: {...matrix[category], [audience]: level}};
    setMatrix(next);
    onChange?.(next);
    setSaving(`${category}:${audience}`);
    setErr(null);
    const res = await fetch('/api/privacy/policies', {method: 'PUT', headers: {'content-type': 'application/json'}, body: JSON.stringify({category, audience, level})});
    if (!res.ok) setErr((await res.json().catch(() => ({error: 'Save failed'}))).error ?? 'Save failed');
    else onChange?.((await res.json()).policies);
    setSaving(null);
  }

  return (
    <div>
      {CATEGORIES.map(c => {
        const isOpen = open === c;
        return (
          <div key={c} className={styles.matrixRow}>
            <button className={styles.matrixHead} onClick={() => setOpen(isOpen ? null : c)} aria-expanded={isOpen}>
              <span className={styles.iconBox} aria-hidden>
                {ICON[c]}
              </span>
              <span className={styles.grow}>
                <span className={styles.title}>{CATEGORY_LABEL[c]}</span>
                <span className={styles.small} style={{display: 'block'}}>
                  {categorySummary(matrix, c)}
                </span>
              </span>
              <span className={styles.muted}>{isOpen ? <ChevronUpIcon size={20} /> : <ChevronDownIcon size={20} />}</span>
            </button>
            {isOpen && (
              <div className={styles.matrixGrid}>
                <span className={styles.small} style={{gridColumn: '1 / -1'}}>
                  {CATEGORY_EXAMPLE[c]}
                </span>
                {AUDIENCES.map(a => (
                  <AudienceRow key={a} audience={a} value={matrix[c][a]} busy={saving === `${c}:${a}`} onChange={l => void update(c, a, l)} />
                ))}
                <span className={styles.levelHelp}>{LEVELS.map(l => `${LEVEL_LABEL[l]}: ${LEVEL_HELP[l]}`).join(' · ')}</span>
              </div>
            )}
          </div>
        );
      })}
      {err && <div className={styles.err}>{err}</div>}
    </div>
  );
}

function AudienceRow({audience, value, busy, onChange}: {audience: Audience; value: ShareLevel; busy: boolean; onChange: (l: ShareLevel) => void}) {
  const owner = audience === 'only_me';
  const options = owner ? (['exact', 'none'] as ShareLevel[]) : LEVELS;
  return (
    <>
      <label className={styles.title} style={{fontWeight: 500}} htmlFor={`pol-${audience}`}>
        {AUDIENCE_LABEL[audience]}
        {owner && <span className={styles.small}> (you always see exact, or don&apos;t import it)</span>}
      </label>
      <select id={`pol-${audience}`} className={styles.select} value={value} disabled={busy} onChange={e => onChange(e.target.value as ShareLevel)} aria-label={`${AUDIENCE_LABEL[audience]} level`}>
        {options.map(l => (
          <option key={l} value={l}>
            {owner && l === 'none' ? 'Not imported' : LEVEL_LABEL[l]}
          </option>
        ))}
      </select>
    </>
  );
}
