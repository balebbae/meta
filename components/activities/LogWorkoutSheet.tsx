'use client';
import {Glyph} from './glyphs';
import {blobToWav16k} from '@/lib/wav';
import {useEffect, useRef, useState} from 'react';
import {Dialog} from '@/components/ui/Dialog';
import {fileToDataUrlFit} from '@/lib/image-upload';
import type {EventKind} from '@/lib/activities/types';
import styles from './activities.module.css';

export type LogTab = 'manual' | 'photo' | 'voice';
type Form = {kind: EventKind; distanceKm: string; durationMin: string; steps: string};
const KINDS: {id: EventKind; label: string}[] = [
  {id: 'run', label: 'Run'}, {id: 'walk', label: 'Walk'}, {id: 'ride', label: 'Ride'}, {id: 'strength', label: 'Strength'}, {id: 'yoga', label: 'Yoga'}, {id: 'swim', label: 'Swim'}, {id: 'steps', label: 'Steps'}, {id: 'other', label: 'Other'},
];
const EMPTY: Form = {kind: 'run', distanceKm: '', durationMin: '', steps: ''};

export type LoggedEvent = {id: number; kind: EventKind; distanceKm?: number; durationMin?: number; steps?: number; trust: string; duplicateOf?: number | null};

/**
 * Reusable "Log a workout" sheet (§5.2): manual (form or one sentence), photo proof, voice.
 * Rally embeds it; the nav opens it from /activities/log. onLogged fires with the saved vault event.
 */
export function LogWorkoutSheet({open, onClose, initialTab = 'manual', onLogged, title = 'Log a workout'}: {open: boolean; onClose: () => void; initialTab?: LogTab; onLogged?: (e: LoggedEvent) => void; title?: string}) {
  const [tab, setTab] = useState<LogTab>(initialTab);
  const [done, setDone] = useState<LoggedEvent | null>(null);
  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setDone(null);
    }
  }, [open, initialTab]);

  function logged(e: LoggedEvent) {
    setDone(e);
    onLogged?.(e);
  }

  return (
    <Dialog open={open} onClose={onClose} title={title} width={520}>
      <div style={{padding: '0 16px 16px'}}>
        {done ? (
          <div style={{textAlign: 'center', padding: '24px 0'}}>
            <div style={{color: 'var(--fb-green)'}} aria-hidden>
              {Glyph.check(44)}
            </div>
            <div className={styles.title}>Saved to your vault</div>
            <p className={styles.sub}>
              {describe(done)} · trust: {done.trust.replace('_', ' ')}. Only your Muse sees the raw entry; others get what your privacy settings allow.
            </p>
            {done.duplicateOf && <p className={styles.sub}>This overlaps a workout already in your vault, so it was merged with that higher-trust entry (listed under it on your Muse page).</p>}
            <div className={styles.row} style={{justifyContent: 'center'}}>
              <button className={styles.btn} onClick={() => setDone(null)}>
                Log another
              </button>
              <button className={styles.btnPrimary} onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.tabs} role="tablist">
              {(['manual', 'photo', 'voice'] as LogTab[]).map(t => (
                <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? styles.tabOn : styles.tab} onClick={() => setTab(t)}>
                  {t === 'manual' ? 'Manual' : t === 'photo' ? 'Photo proof' : 'Voice'}
                </button>
              ))}
            </div>
            {tab === 'manual' && <ManualTab onLogged={logged} />}
            {tab === 'photo' && <PhotoTab onLogged={logged} />}
            {tab === 'voice' && <VoiceTab onLogged={logged} />}
          </>
        )}
      </div>
    </Dialog>
  );
}

function describe(e: {kind: EventKind; distanceKm?: number; durationMin?: number; steps?: number}): string {
  const bits = [e.kind, e.distanceKm ? `${e.distanceKm} km` : null, e.durationMin ? `${Math.round(e.durationMin)} min` : null, e.steps ? `${e.steps.toLocaleString()} steps` : null].filter(Boolean);
  return bits.join(' · ');
}

function toForm(p: {kind: EventKind; distanceKm?: number | null; durationMin?: number | null; steps?: number | null}): Form {
  return {kind: p.kind, distanceKm: p.distanceKm ? String(Math.round(p.distanceKm * 100) / 100) : '', durationMin: p.durationMin ? String(Math.round(p.durationMin)) : '', steps: p.steps ? String(p.steps) : ''};
}

function QuickForm({form, setForm, onSubmit, busy, submitLabel}: {form: Form; setForm: (f: Form) => void; onSubmit: () => void; busy: boolean; submitLabel: string}) {
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSubmit();
      }}>
      <div className={styles.chips} role="radiogroup" aria-label="Workout type">
        {KINDS.map(k => (
          <button type="button" key={k.id} role="radio" aria-checked={form.kind === k.id} className={form.kind === k.id ? styles.chipOn : styles.chip} onClick={() => setForm({...form, kind: k.id})}>
            {k.label}
          </button>
        ))}
      </div>
      <div className={styles.grid2} style={{marginTop: 8}}>
        {form.kind === 'steps' ? (
          <div>
            <label className={styles.label} htmlFor="lw-steps">
              Steps
            </label>
            <input id="lw-steps" className={styles.input} inputMode="numeric" placeholder="8,000" value={form.steps} onChange={e => setForm({...form, steps: e.target.value})} />
          </div>
        ) : (
          <>
            <div>
              <label className={styles.label} htmlFor="lw-dist">
                Distance (km)
              </label>
              <input id="lw-dist" className={styles.input} inputMode="decimal" placeholder="5" value={form.distanceKm} onChange={e => setForm({...form, distanceKm: e.target.value})} />
            </div>
            <div>
              <label className={styles.label} htmlFor="lw-dur">
                Duration (min)
              </label>
              <input id="lw-dur" className={styles.input} inputMode="numeric" placeholder="30" value={form.durationMin} onChange={e => setForm({...form, durationMin: e.target.value})} />
            </div>
          </>
        )}
      </div>
      <button type="submit" className={`${styles.btnPrimary} ${styles.btnFull}`} style={{marginTop: 12}} disabled={busy}>
        {busy ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}

function formToLog(form: Form) {
  return {kind: form.kind, distanceKm: parseFloat(form.distanceKm.replace(',', '.')) || undefined, durationMin: parseFloat(form.durationMin) || undefined, steps: parseInt(form.steps.replace(/,/g, ''), 10) || undefined};
}

function ManualTab({onLogged}: {onLogged: (e: LoggedEvent) => void}) {
  const [text, setText] = useState('');
  const [form, setForm] = useState<Form>(EMPTY);
  const [parsedNote, setParsedNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function parse() {
    if (!text.trim()) return;
    setBusy(true);
    setErr(null);
    const res = await fetch('/api/activities/log', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({text, parseOnly: true})});
    const j = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? 'Could not parse');
    setForm(toForm(j.parsed));
    setParsedNote(j.usedMuse ? 'Parsed by your Muse. Check and save.' : 'Muse offline: parsed with simple rules. Check and save.');
  }

  async function save() {
    setBusy(true);
    setErr(null);
    const res = await fetch('/api/activities/log', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({log: {...formToLog(form), note: text || undefined}})});
    const j = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? 'Could not save');
    onLogged(j.event);
  }

  return (
    <div>
      <label className={styles.label} htmlFor="lw-text">
        Say it in one line
      </label>
      <div className={styles.row} style={{flexWrap: 'nowrap'}}>
        <input id="lw-text" className={styles.input} placeholder="ran 2 miles this morning · 30 min yoga · 8,000 steps" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), void parse())} />
        <button className={styles.btn} type="button" onClick={() => void parse()} disabled={busy || !text.trim()}>
          Parse
        </button>
      </div>
      {parsedNote && (
        <div className={styles.small} style={{margin: '6px 0'}}>
          {parsedNote.startsWith('Muse offline') && <span className={styles.offline}>Muse offline</span>} {parsedNote}
        </div>
      )}
      <div className={styles.label}>Or fill the quick form</div>
      <QuickForm form={form} setForm={setForm} onSubmit={() => void save()} busy={busy} submitLabel="Save workout" />
      {err && <div className={styles.err}>{err}</div>}
      <p className={styles.small} style={{marginTop: 8}}>
        Saved as self-reported. Scores from self-reported entries count at 1× (device 1.2×, verified 1.5×).
      </p>
    </div>
  );
}

function PhotoTab({onLogged}: {onLogged: (e: LoggedEvent) => void}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Form | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setErr(null);
    setConfirm(null);
    try {
      setImage(await fileToDataUrlFit(file, 1280));
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function analyze() {
    if (!image) return;
    setBusy(true);
    setErr(null);
    setStatus(null);
    const res = await fetch('/api/proof', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({image})});
    const j = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? 'Could not read the photo');
    if (j.saved) return onLogged(j.event);
    setConfirm(j.result ? toForm(j.result) : EMPTY);
    setStatus(j.museOffline ? 'Muse offline: confirm the workout yourself and it will be saved as photo proof.' : j.result?.verdict === 'not_a_workout' ? 'That did not look like a workout screen. Fill in what it showed.' : 'Muse was not sure. Check the numbers and save.');
  }

  async function saveConfirm() {
    if (!confirm) return;
    setBusy(true);
    const res = await fetch('/api/proof', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({confirm: {...formToLog(confirm), confidence: 0, verdict: 'unclear'}})});
    const j = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? 'Could not save');
    onLogged(j.event);
  }

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={e => void pick(e.target.files?.[0])} />
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="Your proof photo" className={styles.preview} />
      ) : (
        <div className={styles.dropzone} role="button" tabIndex={0} onClick={() => fileRef.current?.click()} onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}>
          <div style={{color: 'var(--fb-blue)'}} aria-hidden>
            {Glyph.camera(36)}
          </div>
          Snap your treadmill, watch, bike computer or race bib
        </div>
      )}
      <div className={styles.row} style={{marginTop: 10}}>
        <button className={styles.btn} type="button" onClick={() => fileRef.current?.click()}>
          {image ? 'Choose another' : 'Choose photo'}
        </button>
        {image && !confirm && (
          <button className={styles.btnPrimary} type="button" onClick={() => void analyze()} disabled={busy}>
            {busy ? 'Reading…' : 'Read with Muse'}
          </button>
        )}
      </div>
      {status && (
        <div className={styles.small} style={{margin: '10px 0 4px'}}>
          {status.startsWith('Muse offline') && <span className={styles.offline}>Muse offline</span>} {status}
        </div>
      )}
      {confirm && <QuickForm form={confirm} setForm={setConfirm} onSubmit={() => void saveConfirm()} busy={busy} submitLabel="Confirm and save as photo proof" />}
      {err && <div className={styles.err}>{err}</div>}
      <p className={styles.small} style={{marginTop: 8}}>
        Muse only reads the device readout, never people. Photos are not stored; the numbers go to your vault with trust &ldquo;photo&rdquo;.
      </p>
    </div>
  );
}

function VoiceTab({onLogged}: {onLogged: (e: LoggedEvent) => void}) {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  async function toggle() {
    if (recording) {
      rec.current?.stop();
      setRecording(false);
      return;
    }
    setErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio: true});
      const r = new MediaRecorder(stream);
      chunks.current = [];
      r.ondataavailable = e => chunks.current.push(e.data);
      r.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setBusy(true);
        const wav = await blobToWav16k(new Blob(chunks.current, {type: r.mimeType || 'audio/webm'}));
        const fd = new FormData();
        fd.append('file', new File([wav], 'note.wav', {type: 'audio/wav'}));
        const res = await fetch('/api/muse/transcribe', {method: 'POST', body: fd});
        setBusy(false);
        if (!res.ok) {
          setOffline(true);
          setErr('Muse offline: transcription unavailable. Type what you did instead.');
          return;
        }
        const j = await res.json();
        setTranscript(j.transcript ?? '');
      };
      r.start();
      rec.current = r;
      setRecording(true);
    } catch {
      setErr('Microphone not available. Type what you did instead.');
    }
  }

  async function parse() {
    if (!transcript.trim()) return;
    setBusy(true);
    const res = await fetch('/api/activities/log', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({text: transcript, parseOnly: true})});
    const j = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? 'Could not parse');
    setForm(toForm(j.parsed));
    if (!j.usedMuse) setOffline(true);
  }

  async function save() {
    if (!form) return;
    setBusy(true);
    const res = await fetch('/api/activities/log', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({log: {...formToLog(form), note: transcript}})});
    const j = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? 'Could not save');
    onLogged(j.event);
  }

  return (
    <div>
      <div style={{textAlign: 'center', padding: '8px 0 12px'}}>
        <button type="button" className={recording ? styles.btnDanger : styles.btnPrimary} onClick={() => void toggle()} disabled={busy} style={{height: 48, borderRadius: 24, padding: '0 20px'}}>
          {recording ? 'Stop' : busy ? 'Transcribing…' : 'Tell your Muse what you did'}
        </button>
      </div>
      <label className={styles.label} htmlFor="lw-voice">
        Transcript {offline && <span className={styles.offline}>Muse offline</span>}
      </label>
      <textarea id="lw-voice" className={styles.textarea} value={transcript} onChange={e => setTranscript(e.target.value)} placeholder="“Did a 5k this morning, about 28 minutes.”" />
      <div className={styles.row} style={{marginTop: 8}}>
        <button type="button" className={styles.btn} onClick={() => void parse()} disabled={busy || !transcript.trim()}>
          Turn into a workout
        </button>
      </div>
      {form && (
        <div style={{marginTop: 10}}>
          <QuickForm form={form} setForm={setForm} onSubmit={() => void save()} busy={busy} submitLabel="Save workout" />
        </div>
      )}
      {err && <div className={styles.err}>{err}</div>}
    </div>
  );
}
