'use client';
import {useEffect, useRef, useState} from 'react';
import {Dialog} from '@/components/ui/Dialog';
import {fileToDataUrl} from '@/components/rally/api';
import {RallyAvatar} from '@/components/rally/Avatar';
import type {SwimCardPayload} from '@/lib/activities/types';
import type {SwimLogResult, SwimState} from '@/lib/rally/swim-store';
import s from '@/components/rally/rally.module.css';
import m from '@/components/rally/mirror.module.css';
import type {CardProps} from './index';

const km = (meters: number) => `${(meters / 1000).toFixed(1)} km`;

/** swim_card: Castle Crossing, the chat's shared swim. The lead swimmer's hero moves along the route past checkpoints. */
export default function SwimCard({message}: CardProps) {
  const p = message.payload as unknown as SwimCardPayload;
  const [state, setState] = useState<SwimState | null>(null);
  const [open, setOpen] = useState(false);

  const load = () =>
    fetch(`/api/swim/${p.journeyId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(st => st && setState(st))
      .catch(() => {});
  useEffect(() => {
    void load();
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.journeyId]);

  const total = state?.route.totalM ?? p.totalM;
  const done = state?.progressM ?? 0;
  const pct = Math.min(100, (done / total) * 100);
  const top = state?.swimmers[0];
  const lead = top ?? (message.sender ? {name: message.sender.name, avatarUrl: message.sender.avatarUrl} : null);
  const crossed = state?.status === 'done';

  return (
    <div className={s.questCard} role="group" aria-label="Castle Crossing">
      <div className={s.questHero}>
        {lead && <RallyAvatar src={lead.avatarUrl} name={lead.name} state={crossed ? 'celebrate' : 'run'} size={84} />}
        <div style={{minWidth: 0}}>
          <div className={s.questTitle}>Castle Crossing</div>
          <p className={`${s.questStory} ${m.clamp2}`}>{state?.route.name ?? km(total)}</p>
        </div>
      </div>
      <div className={s.questBody}>
        <div className={m.swimTrack} role="progressbar" aria-label="Crossing progress" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
          <span className={m.swimLine} />
          <span className={m.swimDone} style={{width: `${pct}%`}} />
          {state?.route.checkpoints.map(c => (
            <span key={c.name} className={`${m.swimDot} ${done >= c.atM ? m.swimDotDone : ''}`} style={{left: `${(c.atM / total) * 100}%`}} title={c.name} />
          ))}
          {lead && (
            <span className={m.swimBoat} style={{left: `${pct}%`}} aria-hidden>
              <RallyAvatar src="" name={lead.name} state="run" size={30} />
            </span>
          )}
        </div>
        <div className={m.swimEnds}>
          <span>{state?.route.from ?? ''}</span>
          <span>{state?.route.to ?? ''}</span>
        </div>
        <div className={s.hpLabel} style={{marginTop: 8}}>
          <span>
            {km(done)} / {km(total)}
          </span>
          {top && (
            <span>
              Top: {top.name.split(' ')[0]} {km(top.meters)}
            </span>
          )}
        </div>
      </div>
      <div className={s.cardActions}>
        <button type="button" className={s.btnPrimary} onClick={() => setOpen(true)} disabled={state?.status === 'done'}>
          {crossed ? 'Crossed' : 'Log a swim'}
        </button>
      </div>
      {open && <SwimLogSheet journeyId={p.journeyId} onClose={() => setOpen(false)} onDone={load} />}
    </div>
  );
}

function SwimLogSheet({journeyId, onClose, onDone}: {journeyId: number; onClose: () => void; onDone: () => void}) {
  const [meters, setMeters] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SwimLogResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (!image && !(Number(meters) >= 25)) {
      setError('At least 25 m, or add a photo.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/swim/${journeyId}/log`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(image ? {image} : {meters: Number(meters)})});
      const data = (await res.json().catch(() => ({}))) as SwimLogResult & {error?: string};
      if (!res.ok) throw new Error(data.error ?? 'Could not log the swim');
      setResult(data);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not log the swim');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title="Log a swim" width={420}>
      {result ? (
        <div className={s.sheetResult}>
          <div className={s.sheetDamage}>+{result.meters + result.bonus} m</div>
          <p className={s.sheetNarration}>
            {Math.round((result.progressM / result.totalM) * 100)}% across
            {result.bonus ? ` · +${result.bonus} m buddy bonus` : ''}
            {result.checkpoints.length ? ` · 📍 ${result.checkpoints.join(', ')}` : ''}
            {result.finished ? ' · 🎉 Crossed' : ''}
          </p>
          <button type="button" className="fb-btn-primary" onClick={onClose} style={{marginTop: 12}}>
            Done
          </button>
        </div>
      ) : (
        <div className={s.sheetForm}>
          <p className={s.sheetLead}>Type metres or add a watch photo.</p>
          <label className={s.field}>
            Metres
            <input type="number" inputMode="numeric" min={25} max={10000} step={25} value={meters} disabled={!!image} onChange={e => setMeters(e.target.value)} placeholder="1000" />
          </label>
          <div className={m.actions}>
            <button type="button" className="fb-btn-secondary" onClick={() => fileRef.current?.click()}>
              {image ? 'Photo ✓' : 'Watch photo'}
            </button>
            {image && (
              <button type="button" className="fb-btn-secondary" onClick={() => setImage(null)}>
                Remove
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={async e => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) setImage(await fileToDataUrl(f));
          }} />
          {error && <p className={s.error}>{error}</p>}
          <button type="button" className="fb-btn-primary" onClick={submit} disabled={busy}>
            {busy ? 'Logging…' : 'Log'}
          </button>
        </div>
      )}
    </Dialog>
  );
}
