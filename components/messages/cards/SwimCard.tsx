'use client';
import {useEffect, useState} from 'react';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {FileInput} from '@astryxdesign/core/FileInput';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {Layout, LayoutContent, LayoutFooter} from '@astryxdesign/core/Layout';
import {NumberInput} from '@astryxdesign/core/NumberInput';
import {Text} from '@astryxdesign/core/Text';
import {Thumbnail} from '@astryxdesign/core/Thumbnail';
import {VStack} from '@astryxdesign/core/VStack';
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
              <RallyAvatar src="" name={lead.name} state="run" size={34} />
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

/** Log a swim: same sheet as Rally's "Log a move" (metres or a watch photo Ember reads). */
function SwimLogSheet({journeyId, onClose, onDone}: {journeyId: number; onClose: () => void; onDone: () => void}) {
  const [meters, setMeters] = useState<number | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SwimLogResult | null>(null);

  const submit = async () => {
    if (!image && !((meters ?? 0) >= 25)) {
      setError('At least 25 m, or add a photo.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/swim/${journeyId}/log`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(image ? {image} : {meters})});
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
  const pickPhoto = (files: File | File[] | null) => {
    const file = Array.isArray(files) ? files[0] : files;
    if (file) fileToDataUrl(file).then(setImage).catch(() => setError('Could not read that image'));
  };

  return (
    <Dialog isOpen onOpenChange={o => !o && onClose()} purpose="form" width={440}>
      <Layout
        header={<DialogHeader title="Log a swim" onOpenChange={() => onClose()} />}
        content={
          <LayoutContent>
            {result ? (
              <VStack gap={2}>
                <Heading level={2}>+{result.meters + result.bonus} m</Heading>
                <Text>
                  {Math.round((result.progressM / result.totalM) * 100)}% across
                  {result.bonus ? ` · +${result.bonus} m buddy bonus` : ''}
                  {result.checkpoints.length ? ` · 📍 ${result.checkpoints.join(', ')}` : ''}
                  {result.finished ? ' · 🎉 Crossed' : ''}
                </Text>
                {result.proof === 'photo' && (
                  <Text type="supporting" color="secondary">
                    Read from your photo
                  </Text>
                )}
              </VStack>
            ) : (
              <VStack gap={4}>
                <NumberInput label="Metres" description="At least 25 m" value={meters} onChange={setMeters} min={25} max={10000} placeholder="1000" isDisabled={!!image} />
                {image ? (
                  <HStack gap={2} vAlign="center">
                    <Thumbnail src={image} alt="Watch photo" label="Watch photo" onRemove={() => setImage(null)} />
                    <Text type="supporting" color="secondary">
                      Muse reads the distance
                    </Text>
                  </HStack>
                ) : (
                  <FileInput label="Watch photo" description="Instead of typing" isOptional accept="image/*" value={null} onChange={pickPhoto} />
                )}
                {error && <Banner status="error" title={error} />}
              </VStack>
            )}
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} hAlign="end">
              {result ? (
                <Button label="Done" variant="primary" onClick={onClose} />
              ) : (
                <>
                  <Button label="Cancel" variant="secondary" onClick={onClose} />
                  <Button label="Log" variant="primary" isLoading={busy} onClick={() => void submit()} />
                </>
              )}
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
