'use client';
import {useEffect, useRef, useState} from 'react';
import {Camera, Mic} from 'lucide-react';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {FileInput} from '@astryxdesign/core/FileInput';
import {Grid} from '@astryxdesign/core/Grid';
import {HStack} from '@astryxdesign/core/HStack';
import {Icon} from '@astryxdesign/core/Icon';
import {Layout, LayoutContent} from '@astryxdesign/core/Layout';
import {Selector} from '@astryxdesign/core/Selector';
import {Tab, TabList} from '@astryxdesign/core/TabList';
import {Text} from '@astryxdesign/core/Text';
import {TextArea} from '@astryxdesign/core/TextArea';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Thumbnail} from '@astryxdesign/core/Thumbnail';
import {Token} from '@astryxdesign/core/Token';
import {VStack} from '@astryxdesign/core/VStack';
import {blobToWav16k} from '@/lib/wav';
import {fileToDataUrlFit} from '@/lib/image-upload';
import type {EventKind} from '@/lib/activities/types';

export type LogTab = 'manual' | 'photo' | 'voice';
type Form = {kind: EventKind; distanceKm: string; durationMin: string; steps: string};
const KINDS: {id: EventKind; label: string}[] = [
  {id: 'run', label: 'Run'}, {id: 'walk', label: 'Walk'}, {id: 'ride', label: 'Ride'}, {id: 'strength', label: 'Strength'}, {id: 'yoga', label: 'Yoga'}, {id: 'swim', label: 'Swim'}, {id: 'steps', label: 'Steps'}, {id: 'other', label: 'Other'},
];
const EMPTY: Form = {kind: 'run', distanceKm: '', durationMin: '', steps: ''};
const post = (body: unknown) => ({method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)});

export type LoggedEvent = {id: number; kind: EventKind; distanceKm?: number; durationMin?: number; steps?: number; trust: string; duplicateOf?: number | null};

/**
 * Reusable "Log a workout" sheet (§5.2): manual (form or one sentence), photo proof, voice.
 * The nav opens it from /activities/log. onLogged fires with the saved vault event.
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
    <Dialog isOpen={open} onOpenChange={o => !o && onClose()} purpose="form" width={520}>
      <Layout
        header={<DialogHeader title={title} onOpenChange={() => onClose()} />}
        content={
          <LayoutContent>
            {done ? (
              <VStack gap={4}>
                <Banner
                  status="success"
                  title="Saved to your vault"
                  description={`${describe(done)} · trust: ${done.trust.replace('_', ' ')}. Only your Muse sees the raw entry; others get what your privacy settings allow.`}
                />
                {done.duplicateOf && <Text type="supporting" color="secondary">This overlaps a workout already in your vault, so it was merged with that higher-trust entry (listed under it on your Muse page).</Text>}
                <HStack gap={2} hAlign="end">
                  <Button label="Log another" onClick={() => setDone(null)} />
                  <Button label="Done" variant="primary" onClick={onClose} />
                </HStack>
              </VStack>
            ) : (
              <VStack gap={4}>
                <TabList value={tab} onChange={v => setTab(v as LogTab)} layout="fill" hasDivider>
                  <Tab value="manual" label="Manual" />
                  <Tab value="photo" label="Photo proof" />
                  <Tab value="voice" label="Voice" />
                </TabList>
                {tab === 'manual' && <ManualTab onLogged={logged} />}
                {tab === 'photo' && <PhotoTab onLogged={logged} />}
                {tab === 'voice' && <VoiceTab onLogged={logged} />}
              </VStack>
            )}
          </LayoutContent>
        }
      />
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
    <VStack gap={3}>
      <Selector label="Workout type" options={KINDS.map(k => ({value: k.id, label: k.label}))} value={form.kind} onChange={v => setForm({...form, kind: v as EventKind})} />
      {form.kind === 'steps' ? (
        <TextInput label="Steps" inputMode="numeric" placeholder="8,000" value={form.steps} onChange={v => setForm({...form, steps: v})} onEnter={onSubmit} />
      ) : (
        <Grid columns={2} gap={3}>
          <TextInput label="Distance (km)" inputMode="decimal" placeholder="5" value={form.distanceKm} onChange={v => setForm({...form, distanceKm: v})} onEnter={onSubmit} />
          <TextInput label="Duration (min)" inputMode="numeric" placeholder="30" value={form.durationMin} onChange={v => setForm({...form, durationMin: v})} onEnter={onSubmit} />
        </Grid>
      )}
      <Button label={submitLabel} variant="primary" width="100%" isLoading={busy} onClick={onSubmit} />
    </VStack>
  );
}

function formToLog(form: Form) {
  return {kind: form.kind, distanceKm: parseFloat(form.distanceKm.replace(',', '.')) || undefined, durationMin: parseFloat(form.durationMin) || undefined, steps: parseInt(form.steps.replace(/,/g, ''), 10) || undefined};
}

function MuseOffline() {
  return <Token label="Muse offline" size="sm" color="gray" />;
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
    const res = await fetch('/api/activities/log', post({text, parseOnly: true}));
    const j = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? 'Could not parse');
    setForm(toForm(j.parsed));
    setParsedNote(j.usedMuse ? 'Parsed by your Muse. Check and save.' : 'Muse offline: parsed with simple rules. Check and save.');
  }

  async function save() {
    setBusy(true);
    setErr(null);
    const res = await fetch('/api/activities/log', post({log: {...formToLog(form), note: text || undefined}}));
    const j = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? 'Could not save');
    onLogged(j.event);
  }

  return (
    <VStack gap={3}>
      <HStack gap={2} vAlign="end">
        <TextInput label="Say it in one line" placeholder="ran 2 miles this morning · 30 min yoga · 8,000 steps" value={text} onChange={setText} onEnter={() => void parse()} width="100%" />
        <Button label="Parse" isDisabled={busy || !text.trim()} onClick={() => void parse()} />
      </HStack>
      {parsedNote && (
        <HStack gap={1.5} vAlign="center" wrap="wrap">
          {parsedNote.startsWith('Muse offline') && <MuseOffline />}
          <Text type="supporting" color="secondary">
            {parsedNote}
          </Text>
        </HStack>
      )}
      <Text type="label">Or fill the quick form</Text>
      <QuickForm form={form} setForm={setForm} onSubmit={() => void save()} busy={busy} submitLabel="Save workout" />
      {err && <Banner status="error" title={err} />}
      <Text type="supporting" color="secondary">
        Saved as self-reported. Scores from self-reported entries count at 1× (device 1.2×, verified 1.5×).
      </Text>
    </VStack>
  );
}

function PhotoTab({onLogged}: {onLogged: (e: LoggedEvent) => void}) {
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Form | null>(null);

  async function pick(files: File | File[] | null) {
    const file = Array.isArray(files) ? files[0] : files;
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
    const res = await fetch('/api/proof', post({image}));
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
    const res = await fetch('/api/proof', post({confirm: {...formToLog(confirm), confidence: 0, verdict: 'unclear'}}));
    const j = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? 'Could not save');
    onLogged(j.event);
  }

  return (
    <VStack gap={3}>
      {image ? (
        <HStack gap={3} vAlign="center" wrap="wrap">
          <Thumbnail src={image} alt="Your proof photo" label="Proof photo" onRemove={() => (setImage(null), setConfirm(null), setStatus(null))} />
          {!confirm && <Button label="Read with Muse" variant="primary" isLoading={busy} onClick={() => void analyze()} />}
        </HStack>
      ) : (
        <FileInput label="Proof photo" description="Snap your treadmill, watch, bike computer or race bib" mode="dropzone" accept="image/*" value={null} onChange={files => void pick(files)} placeholder="Choose a photo" />
      )}
      {status && (
        <HStack gap={1.5} vAlign="center" wrap="wrap">
          {status.startsWith('Muse offline') && <MuseOffline />}
          <Text type="supporting" color="secondary">
            {status}
          </Text>
        </HStack>
      )}
      {confirm && <QuickForm form={confirm} setForm={setConfirm} onSubmit={() => void saveConfirm()} busy={busy} submitLabel="Confirm and save as photo proof" />}
      {err && <Banner status="error" title={err} />}
      <HStack gap={1.5} vAlign="start">
        <Icon icon={Camera} size="sm" color="secondary" />
        <Text type="supporting" color="secondary">
          Muse only reads the device readout, never people. Photos are not stored; the numbers go to your vault with trust &ldquo;photo&rdquo;.
        </Text>
      </HStack>
    </VStack>
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
    const res = await fetch('/api/activities/log', post({text: transcript, parseOnly: true}));
    const j = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? 'Could not parse');
    setForm(toForm(j.parsed));
    if (!j.usedMuse) setOffline(true);
  }

  async function save() {
    if (!form) return;
    setBusy(true);
    const res = await fetch('/api/activities/log', post({log: {...formToLog(form), note: transcript}}));
    const j = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? 'Could not save');
    onLogged(j.event);
  }

  return (
    <VStack gap={3}>
      <HStack hAlign="center">
        <Button
          label={recording ? 'Stop' : busy ? 'Transcribing…' : 'Tell your Muse what you did'}
          variant={recording ? 'destructive' : 'primary'}
          size="lg"
          icon={<Icon icon={Mic} />}
          isLoading={busy && !recording}
          onClick={() => void toggle()}
        />
      </HStack>
      {offline && <MuseOffline />}
      <TextArea label="Transcript" value={transcript} onChange={setTranscript} placeholder="“Did a 5k this morning, about 28 minutes.”" rows={3} />
      <HStack>
        <Button label="Turn into a workout" isDisabled={busy || !transcript.trim()} onClick={() => void parse()} />
      </HStack>
      {form && <QuickForm form={form} setForm={setForm} onSubmit={() => void save()} busy={busy} submitLabel="Save workout" />}
      {err && <Banner status="error" title={err} />}
    </VStack>
  );
}
