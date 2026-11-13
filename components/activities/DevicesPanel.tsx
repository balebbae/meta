'use client';
import {useEffect, useState} from 'react';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Collapsible} from '@astryxdesign/core/Collapsible';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {List, ListItem} from '@astryxdesign/core/List';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import {layoutHealth, type HealthReading} from '@/lib/health-format';

type Sample = HealthReading & {source: string};
type Summary = {whoop: {userId: string | null; connectedAt: string} | null; samples: Sample[]};

const SOURCES = [
  {id: 'whoop', label: 'Whoop'},
  {id: 'apple_health', label: 'Apple Health'},
  {id: 'health_connect', label: 'Google Health'},
];

declare global {
  interface Window {
    ReactNativeWebView?: {postMessage: (msg: string) => void};
    __onHealthSync?: (result: {ok: boolean; saved?: number; error?: string}) => void;
  }
}

/**
 * Devices (was the Health tab): connect + sync Whoop, sync Apple Health / Health Connect from the phone app, and the
 * latest raw readings, collapsed. Every sync also lands in the vault, which is what the level and Coach read.
 */
export function DevicesPanel() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [note, setNote] = useState<{ok: boolean; text: string} | null>(null);
  const [busy, setBusy] = useState<'whoop' | 'phone' | null>(null);
  const [source, setSource] = useState('whoop');

  const load = () =>
    fetch('/api/health/summary')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(setSummary)
      .catch(() => setNote({ok: false, text: 'Could not load your synced readings.'}));

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('whoop') === 'connected') setNote({ok: true, text: 'Whoop connected. Your Muse now plans from your Whoop workouts.'});
    if (q.get('whoop') === 'error') setNote({ok: false, text: q.get('msg') ?? 'Whoop connection failed.'});
    void load();
    // the phone app (mobile/App.tsx) calls this after reading Apple Health / Health Connect
    window.__onHealthSync = result => {
      setBusy(null);
      setNote(result.ok ? {ok: true, text: `Saved ${result.saved ?? 0} readings from your phone.`} : {ok: false, text: result.error ?? 'Sync failed'});
      if (result.ok) {
        setSource('apple_health');
        void load();
      }
    };
  }, []);

  const syncPhone = async () => {
    if (!window.ReactNativeWebView) {
      setNote({ok: false, text: 'Open Activities in the phone app to sync Apple Health or Google Health.'});
      return;
    }
    setBusy('phone');
    const res = await fetch('/api/health/token', {method: 'POST'});
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(null);
      setNote({ok: false, text: data.error ?? 'Could not start sync'});
      return;
    }
    window.ReactNativeWebView.postMessage(JSON.stringify({type: 'sync-health', token: data.token}));
  };

  const syncWhoop = async () => {
    setBusy('whoop');
    const res = await fetch('/api/whoop/sync', {method: 'POST'});
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    setNote(res.ok ? {ok: true, text: `Saved ${data.saved ?? 0} Whoop readings.`} : {ok: false, text: data.error ?? 'Whoop sync failed'});
    if (res.ok) {
      setSource('whoop');
      void load();
    }
  };

  const samples = summary?.samples ?? [];
  const linked = Boolean(summary?.whoop);
  const layout = layoutHealth(samples.filter(x => x.source === source));
  const count = (id: string) => samples.filter(x => x.source === id).length;
  return (
    <Card id="devices">
      <VStack gap={3}>
        <VStack gap={1}>
          <Heading level={2}>Devices</Heading>
          <Text type="supporting" color="secondary">
            {linked ? 'Whoop is linked. ' : ''}Apple Health and Google Health sync from the phone app. Every sync goes into your vault, which is what your level and Coach mode use.
          </Text>
        </VStack>
        {note && <Banner status={note.ok ? 'success' : 'error'} title={note.text} />}
        <HStack gap={2} wrap="wrap">
          <Button label={linked ? 'Reconnect Whoop' : 'Connect Whoop'} variant={linked ? 'secondary' : 'primary'} href="/api/whoop/connect" />
          {linked && <Button label="Sync Whoop" isLoading={busy === 'whoop'} isDisabled={busy === 'phone'} onClick={() => void syncWhoop()} />}
          <Button label="Sync phone" isLoading={busy === 'phone'} isDisabled={busy === 'whoop'} onClick={() => void syncPhone()} />
        </HStack>
        {samples.length > 0 && (
          <Collapsible trigger={`All synced readings (${samples.length})`}>
            <VStack gap={3}>
              <SegmentedControl label="Source" value={source} onChange={setSource}>
                {SOURCES.map(x => (
                  <SegmentedControlItem key={x.id} value={x.id} label={`${x.label}${count(x.id) ? ` ${count(x.id)}` : ''}`} />
                ))}
              </SegmentedControl>
              {layout.sections.length === 0 ? (
                <Text color="secondary">Nothing synced from this source yet.</Text>
              ) : (
                layout.sections.map(section => (
                  <VStack key={section.title} gap={1}>
                    <Heading level={3}>{section.title}</Heading>
                    <List hasDividers density="compact">
                      {section.rows.map(row => (
                        <ListItem key={row.key} label={row.label} description={row.when || undefined} endContent={<Text weight="bold">{row.value}</Text>} />
                      ))}
                    </List>
                  </VStack>
                ))
              )}
            </VStack>
          </Collapsible>
        )}
      </VStack>
    </Card>
  );
}
