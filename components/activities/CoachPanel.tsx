'use client';
import {useState} from 'react';
// Tabler icons, aliased to the names this file already uses
import {IconTrendingDown as TrendingDown, IconTrendingUp as TrendingUp} from '@tabler/icons-react';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {Icon} from '@astryxdesign/core/Icon';
import {Layout, LayoutContent, LayoutFooter} from '@astryxdesign/core/Layout';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {List, ListItem} from '@astryxdesign/core/List';
import {Spinner} from '@astryxdesign/core/Spinner';
import {Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import {VStack} from '@astryxdesign/core/VStack';
import type {CoachState} from '@/lib/activities/coach';
import type {GapStatus} from '@/lib/activities/coach-gaps';
import {panelHref} from '@/lib/activities/panel-href';
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
const STATUS: Record<GapStatus, {label: string; color: 'green' | 'blue' | 'purple' | 'red'}> = {closed: {label: 'Closed', color: 'green'}, on_track: {label: 'On track', color: 'blue'}, tight: {label: 'Tight', color: 'purple'}, behind: {label: 'Behind', color: 'red'}};
const COL = {display: 'inline-block', minWidth: 76, textAlign: 'end'} as const;

/** The Coach view inside Coach mode (CoachMode owns on/off): where you are against your goal with a bridge for every gap, then this week vs last week and the 7-day plan. */
export function CoachPanel({state, onState, error: outerError, onTurnOff}: {state: CoachState | null; onState: (s: CoachState) => void; error: string | null; onTurnOff: (deleteHistory: boolean) => void}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [turningOff, setTurningOff] = useState(false);

  const refresh = async () => {
    setBusy('refresh');
    setError(null);
    try {
      const res = await fetch('/api/activities/coach', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({action: 'refresh'})});
      if (!res.ok) throw new Error();
      onState(await res.json());
    } catch {
      setError('Could not reach your Muse. Try again in a moment.');
    } finally {
      setBusy(null);
    }
  };

  if (!state) return <Card>{outerError ? <EmptyState title="Coach is unavailable" description={outerError} isCompact /> : <Spinner label="Your Muse is comparing your weeks…" />}</Card>;

  const r = state.report;
  return (
    <>
      {state.blocked && <Banner status="warning" title={state.blocked} />}
      {r?.goalGaps && (
        <Card>
          <VStack gap={4}>
            <VStack gap={1}>
              <HStack gap={2} justify="between" vAlign="center" wrap="wrap">
                <Heading level={2}>{r.goal ? r.goal.title : 'Your base'}</Heading>
                <HStack gap={2} vAlign="center">
                  {r.goalGaps.weeksLeft != null && <Token label={`${r.goalGaps.weeksLeft} ${r.goalGaps.weeksLeft === 1 ? 'week' : 'weeks'} left`} size="sm" color="gray" />}
                  <Token label={`${r.goalGaps.readiness}% ready`} size="sm" color={r.goalGaps.readiness >= 95 ? 'green' : 'blue'} />
                </HStack>
              </HStack>
              <Text type="supporting" color="secondary">
                Your last four weeks against {r.goalGaps.measuredAgainst}.{r.phase ? ` You are in ${r.phase}.` : ''}
              </Text>
              <Text weight="bold">{r.goalGaps.verdict}</Text>
            </VStack>
            <List hasDividers>
              {r.goalGaps.gaps.map(g => (
                <ListItem
                  key={g.id}
                  align="start"
                  label={
                    <VStack gap={2}>
                      <HStack gap={2} justify="between" vAlign="center" wrap="wrap">
                        <Text weight="bold">{g.label}</Text>
                        <HStack gap={2} vAlign="center">
                          <Text hasTabularNumbers>{g.now > g.need ? `${g.now} ${g.unit} (needs ${g.need})` : `${g.now} of ${g.need} ${g.unit}`}</Text>
                          <Token label={STATUS[g.status].label} size="sm" color={STATUS[g.status].color} />
                        </HStack>
                      </HStack>
                      <ProgressBar label={`${g.label}: ${g.pct}% of what the goal needs`} isLabelHidden value={g.pct} max={100} />
                    </VStack>
                  }
                  description={
                    <VStack gap={2}>
                      <Text type="supporting" color="secondary">
                        {g.why}
                      </Text>
                      <Text>
                        <Text weight="bold">This week: </Text>
                        {g.next}
                      </Text>
                      {g.note && (
                        <Text type="supporting" color="secondary">
                          {g.note}
                        </Text>
                      )}
                      {g.ramp.length > 1 && (
                        <Text type="supporting" color="secondary" hasTabularNumbers>
                          Then {g.ramp.slice(1).map(w => `week ${w.week}: ${w.target}`).join(' · ')} {g.unit}
                          {g.weeksToClose != null ? `. Closed in about ${g.weeksToClose} ${g.weeksToClose === 1 ? 'week' : 'weeks'} at a safe rate.` : ''}
                        </Text>
                      )}
                    </VStack>
                  }
                />
              ))}
            </List>
            {r.goalGaps.overdue.length > 0 && (
              <HStack gap={2} justify="between" vAlign="center" wrap="wrap">
                <Text type="supporting" color="secondary">
                  Overdue in your plan: {r.goalGaps.overdue.map(m => `${m.title} (week ${m.week})`).join(', ')}.
                </Text>
                {r.goal && <Button label="Open goal" size="sm" href={panelHref({panel: 'goals', goal: r.goal.id})} />}
              </HStack>
            )}
          </VStack>
        </Card>
      )}
      {r && (
        <>
          <Card>
            <VStack gap={3}>
              <Heading level={3}>{r.headline}</Heading>
              {r.easyWeek && <Text color="secondary">Your Muse is keeping next week easy.</Text>}
              <List hasDividers density="compact" header={<HStack gap={4} justify="between"><Text type="label" color="secondary">Metric</Text><HStack gap={2}><span style={COL}><Text type="label">This week</Text></span><span style={COL}><Text type="label" color="secondary">Last week</Text></span></HStack></HStack>}>
                {ROWS.filter(row => (row.key !== 'km' && row.key !== 'longestKm' && row.key !== 'stepsPerDay' ? true : Boolean(r.thisWeek[row.key] || r.lastWeek[row.key]))).map(row => (
                  <ListItem
                    key={row.key}
                    label={row.label}
                    endContent={
                      <HStack gap={2}>
                        <span style={COL}>
                          <Text weight="bold" hasTabularNumbers>
                            {fmt(r.thisWeek[row.key] as number | null)}
                          </Text>
                        </span>
                        <span style={COL}>
                          <Text color="secondary" hasTabularNumbers>
                            {fmt(r.lastWeek[row.key] as number | null)}
                          </Text>
                        </span>
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
              <Heading level={2}>Slipped since last week</Heading>
              {r.gaps.length ? (
                <List density="compact">
                  {r.gaps.map(g => (
                    <ListItem key={g.metric} startContent={<Icon icon={TrendingDown} size="sm" color="error" />} label={g.metric === 'rest_days' ? 'No rest day this week' : `${g.label}: ${g.this} (was ${g.last})`} />
                  ))}
                </List>
              ) : (
                <Text color="secondary">Nothing slipped: you matched or beat last week everywhere.</Text>
              )}
            </VStack>
          </Card>

          <Card>
            <VStack gap={3}>
              <VStack gap={1}>
                <Heading level={2}>The next 7 days</Heading>
                <Text type="supporting" color="secondary">
                  {r.museUsed ? 'Planned by your Muse' : 'Planned from your numbers (Muse offline)'} within safe limits: at most {r.cap.sessions} workouts and about {r.cap.minutes} minutes over the next 7 days.
                </Text>
              </VStack>
              <List hasDividers>
                {r.bridge.map((s, i) => (
                  <ListItem
                    key={i}
                    align="start"
                    startContent={<Token label={String(i + 1)} size="sm" color="green" />}
                    label={<Text weight="bold">{s.title}</Text>}
                    description={
                      <VStack gap={2} hAlign="start">
                        <Text type="supporting" color="secondary">
                          {s.why}
                          {s.when ? ` · ${s.when}` : ''}
                        </Text>
                        {s.href && <Button label={s.kind === 'event' ? 'See event' : s.kind === 'ahead' ? 'Ask their Muse' : s.kind === 'rally' ? 'Start a game' : 'Open goal'} size="sm" href={s.href} />}
                      </VStack>
                    }
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
        <Button label="Refresh" isLoading={busy === 'refresh'} isDisabled={Boolean(state.blocked)} onClick={() => void refresh()} />
        <Button label="Delete my Coach history" variant="ghost" isDisabled={busy != null} onClick={() => setTurningOff(true)} />
      </HStack>
      {error && <Banner status="error" title={error} />}
      <Dialog isOpen={turningOff} onOpenChange={o => !o && setTurningOff(false)} width={440}>
        <Layout
          header={<DialogHeader title="Delete your Coach history?" onOpenChange={() => setTurningOff(false)} />}
          footer={
            <LayoutFooter>
              <HStack gap={2} hAlign="end" wrap="wrap">
                <Button label="Cancel" variant="ghost" onClick={() => setTurningOff(false)} />
                <Button label="Turn off and delete" variant="destructive" onClick={() => onTurnOff(true)} />
              </HStack>
            </LayoutFooter>
          }
          content={
            <LayoutContent>
              <Text>Coach mode turns off and your past weekly reports are deleted. To just leave Coach mode and keep them, use the X at the top.</Text>
            </LayoutContent>
          }
        />
      </Dialog>
    </>
  );
}
