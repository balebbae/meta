'use client';
import {useEffect, useState} from 'react';
import {TrendingDown, TrendingUp} from 'lucide-react';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {Icon} from '@astryxdesign/core/Icon';
import {Layout, LayoutContent, LayoutFooter} from '@astryxdesign/core/Layout';
import {List, ListItem} from '@astryxdesign/core/List';
import {Spinner} from '@astryxdesign/core/Spinner';
import {Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import {VStack} from '@astryxdesign/core/VStack';
import type {CoachState} from '@/lib/activities/coach';
import type {WeekStats} from '@/lib/activities/coach-math';

const ROWS: {key: keyof WeekStats; label: string}[] = [
  {key: 'sessions', label: 'Workouts'},
  {key: 'minutes', label: 'Active minutes'},
  {key: 'activeDays', label: 'Active days'},
  {key: 'km', label: 'Distance (km)'},
  {key: 'longestKm', label: 'Longest (km)'},
  {key: 'stepsPerDay', label: 'Steps a day'},
];
const fmt = (n: number | null) => (n == null ? '—' : n.toLocaleString());

/** Coach mode: opt-in toggle, then this week vs last week, improvements, gaps and the Muse's plan to bridge them. */
export function CoachPanel() {
  const [state, setState] = useState<CoachState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [turningOff, setTurningOff] = useState(false);

  const call = async (init?: {action: string; deleteHistory?: boolean}) => {
    setBusy(init?.action ?? 'load');
    setError(null);
    try {
      const res = await fetch('/api/activities/coach', init ? {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(init)} : undefined);
      if (!res.ok) throw new Error();
      setState(await res.json());
      setTurningOff(false);
    } catch {
      setError('Could not reach your Muse. Try again in a moment.');
    } finally {
      setBusy(null);
    }
  };
  useEffect(() => {
    void call();
  }, []);

  if (!state) return <Card>{error ? <EmptyState title="Coach is unavailable" description={error} isCompact /> : <Spinner label="Your Muse is comparing your weeks…" />}</Card>;

  if (!state.enabled)
    return (
      <Card>
        <VStack gap={3}>
          <Heading level={2}>Coach mode</Heading>
          <Text color="secondary">Compare my weeks and help me close the gaps. Your Muse uses your synced and logged workouts, rounded, and never your WHOOP numbers.</Text>
          <HStack>
            <Button label="Turn on Coach mode" variant="primary" isLoading={busy === 'enable'} onClick={() => void call({action: 'enable'})} />
          </HStack>
          {error && <Banner status="error" title={error} />}
        </VStack>
      </Card>
    );

  const r = state.report;
  return (
    <>
      {state.blocked && <Banner status="warning" title={state.blocked} />}
      {r && (
        <>
          <Card variant="blue">
            <VStack gap={3}>
              <Heading level={3}>{r.headline}</Heading>
              {r.easyWeek && <Text color="secondary">Your Muse is keeping next week easy.</Text>}
              <List hasDividers density="compact" header={<HStack gap={4} justify="between"><Text type="label" color="secondary">Metric</Text><HStack gap={4}><Text type="label">This week</Text><Text type="label" color="secondary">Last week</Text></HStack></HStack>}>
                {ROWS.filter(row => (row.key !== 'km' && row.key !== 'longestKm' && row.key !== 'stepsPerDay' ? true : Boolean(r.thisWeek[row.key] || r.lastWeek[row.key]))).map(row => (
                  <ListItem
                    key={row.key}
                    label={row.label}
                    endContent={
                      <HStack gap={4}>
                        <Text weight="bold" hasTabularNumbers>
                          {fmt(r.thisWeek[row.key] as number | null)}
                        </Text>
                        <Text color="secondary" hasTabularNumbers>
                          {fmt(r.lastWeek[row.key] as number | null)}
                        </Text>
                      </HStack>
                    }
                  />
                ))}
              </List>
              <Text type="supporting" color="secondary">
                This week = the last 7 days. Last week = the 7 days before.
              </Text>
            </VStack>
          </Card>

          <Card>
            <VStack gap={3}>
              <Heading level={2}>Improvements</Heading>
              {r.wins.length ? (
                <List density="compact">
                  {r.wins.map(w => (
                    <ListItem key={w.metric} startContent={<Icon icon={TrendingUp} size="sm" color="success" />} label={`${w.label}: ${w.this} (was ${w.last})`} />
                  ))}
                </List>
              ) : (
                <Text color="secondary">Nothing went up this week. That&apos;s fine; the plan below starts small.</Text>
              )}
              <Heading level={2}>Gaps</Heading>
              {r.gaps.length ? (
                <List density="compact">
                  {r.gaps.map(g => (
                    <ListItem key={g.metric} startContent={<Icon icon={TrendingDown} size="sm" color="error" />} label={g.metric === 'rest_days' ? 'No rest day this week' : `${g.label}: ${g.this} (was ${g.last})`} />
                  ))}
                </List>
              ) : (
                <Text color="secondary">No gaps: you matched or beat last week everywhere.</Text>
              )}
            </VStack>
          </Card>

          <Card>
            <VStack gap={3}>
              <VStack gap={1}>
                <Heading level={2}>Bridge the gaps</Heading>
                <Text type="supporting" color="secondary">
                  {r.museUsed ? 'Planned by your Muse' : 'Planned from your numbers (Muse offline)'} within safe limits: at most {r.cap.sessions} workouts and about {r.cap.minutes} minutes over the next 7 days.
                </Text>
              </VStack>
              <List hasDividers>
                {r.bridge.map((s, i) => (
                  <ListItem
                    key={i}
                    align="start"
                    startContent={<Token label={String(i + 1)} size="sm" color="blue" />}
                    label={<Text weight="bold">{s.title}</Text>}
                    description={`${s.why}${s.when ? ` · ${s.when}` : ''}`}
                    endContent={s.href ? <Button label={s.kind === 'event' ? 'See event' : s.kind === 'ahead' ? 'Ask their Muse' : s.kind === 'rally' ? 'Start a game' : 'Open goal'} size="sm" href={s.href} /> : undefined}
                  />
                ))}
              </List>
              <Text type="supporting" color="secondary">
                Not medical advice. If something hurts, rest and check with a professional.
              </Text>
            </VStack>
          </Card>
        </>
      )}
      <HStack gap={2} wrap="wrap">
        <Button label="Refresh" isLoading={busy === 'refresh'} isDisabled={(busy != null && busy !== 'refresh') || Boolean(state.blocked)} onClick={() => void call({action: 'refresh'})} />
        <Button label="Turn off Coach mode" variant="ghost" isDisabled={busy != null} onClick={() => setTurningOff(true)} />
      </HStack>
      {error && <Banner status="error" title={error} />}
      <Dialog isOpen={turningOff} onOpenChange={o => !o && busy !== 'disable' && setTurningOff(false)} width={440}>
        <Layout
          header={<DialogHeader title="Turn off Coach mode?" onOpenChange={() => busy !== 'disable' && setTurningOff(false)} />}
          footer={
            <LayoutFooter>
              <HStack gap={2} hAlign="end" wrap="wrap">
                <Button label="Cancel" variant="ghost" isDisabled={busy === 'disable'} onClick={() => setTurningOff(false)} />
                <Button label="Keep reports" isDisabled={busy === 'disable'} onClick={() => void call({action: 'disable', deleteHistory: false})} />
                <Button label="Delete reports" variant="destructive" isLoading={busy === 'disable'} onClick={() => void call({action: 'disable', deleteHistory: true})} />
              </HStack>
            </LayoutFooter>
          }
          content={
            <LayoutContent>
              <Text>Your Muse stops comparing your weeks. Keep your past Coach reports, or delete them too?</Text>
            </LayoutContent>
          }
        />
      </Dialog>
    </>
  );
}
