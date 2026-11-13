'use client';

import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {Avatar} from '@astryxdesign/core/Avatar';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {CheckboxInput} from '@astryxdesign/core/CheckboxInput';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Grid} from '@astryxdesign/core/Grid';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {List, ListItem} from '@astryxdesign/core/List';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {Step, Stepper} from '@astryxdesign/core/Stepper';
import {Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import {VStack} from '@astryxdesign/core/VStack';
import {componentStatus, type ComponentStatus} from '@/lib/activities/goal-plan';
import type {Goal, GoalMatches} from '@/lib/activities/goals';

const json = (method: string, body: unknown) => ({method, headers: {'content-type': 'application/json'}, body: JSON.stringify(body)});

const STATUS_TOKEN: Record<ComponentStatus, {color: 'green' | 'blue' | 'default'; label: string}> = {
  ready: {color: 'green', label: 'Ready'},
  training: {color: 'blue', label: 'Training'},
  later: {color: 'default', label: 'Later'},
};
const CHECKIN_TOKEN = {ahead: {color: 'green', label: 'Ahead'}, on_track: {color: 'blue', label: 'On track'}, behind: {color: 'red', label: 'Behind'}} as const;

function formatDate(d: string) {
  return new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
}

function Stat({value, label}: {value: string | number; label: string}) {
  return (
    <VStack gap={0.5}>
      <Heading level={3}>{value}</Heading>
      <Text type="supporting" color="secondary">
        {label}
      </Text>
    </VStack>
  );
}

export function GoalRoadmap({goal: initial, matches}: {goal: Goal; matches: GoalMatches}) {
  const router = useRouter();
  const [goal, setGoal] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {plan, week, progress} = goal;
  const current = plan.phases.find(p => week >= p.startWeek && week <= p.endWeek) ?? plan.phases[0];
  const next = plan.milestones.find(m => !m.done);
  const weeksLeft = Math.max(0, plan.weeks - week);

  const run = async (key: string, fn: () => Promise<Response>, onOk: (d: Record<string, unknown>) => void) => {
    setBusy(key);
    setError(null);
    try {
      const res = await fn();
      const d = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) throw new Error((d.error as string) ?? 'Something went wrong. Try again.');
      onOk(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(null);
    }
  };

  const toggle = (id: string, done: boolean) => run(`m-${id}`, () => fetch(`/api/goals/${goal.id}`, json('PATCH', {milestoneId: id, done})), d => setGoal(d.goal as Goal));
  const checkIn = () => run('checkin', () => fetch(`/api/goals/${goal.id}/checkin`, json('POST', {})), d => setGoal(d.goal as Goal));
  const play = (conversationId?: number) => run(conversationId ? `chat-${conversationId}` : 'solo', () => fetch(`/api/goals/${goal.id}/game`, json('POST', conversationId ? {conversationId} : {})), d => router.push(String(d.url)));

  return (
    <VStack gap={4}>

      <Card aria-label="Goal">
        <VStack gap={4}>
          <HStack gap={2} vAlign="center" justify="between" wrap="wrap">
            <Heading level={1}>{goal.title}</Heading>
            {goal.status === 'done' ? <Token label="Goal reached" color="green" /> : <Token label={`${current.name} phase`} color="blue" />}
          </HStack>
          <Text color="secondary">{plan.summary}</Text>
          <Grid columns={{minWidth: 120}} gap={3}>
            <Stat value={`${week}/${plan.weeks}`} label="week" />
            <Stat value={weeksLeft} label={weeksLeft === 1 ? 'week to go' : 'weeks to go'} />
            <Stat value={`${progress.done}/${progress.total}`} label="milestones" />
            {goal.eventDate && <Stat value={formatDate(goal.eventDate)} label="goal date" />}
          </Grid>
          <ProgressBar label="Milestones done" isLabelHidden value={progress.pct} max={100} variant={goal.status === 'done' ? 'success' : 'accent'} />
          {!goal.museUsed && (
            <Text type="supporting" color="secondary">
              Muse was offline, so this is the standard plan. It still adapts as you tick milestones.
            </Text>
          )}
        </VStack>
      </Card>

      {error && <Banner status="error" title={error} isDismissable onDismiss={() => setError(null)} />}

      <Card aria-label="Roadmap">
        <VStack gap={4}>
          <HStack gap={2} vAlign="center" justify="between" wrap="wrap">
            <Heading level={2}>Roadmap</Heading>
            <Text type="supporting" color="secondary">
              Tick a milestone when you&apos;ve done it
            </Text>
          </HStack>
          <Stepper activeStep={Math.max(0, plan.phases.findIndex(p => p.id === current.id))} label="Training phases">
            {plan.phases.map((p, i) => (
              <Step key={p.id} step={i + 1} label={p.name} description={p.startWeek === p.endWeek ? `Week ${p.startWeek}` : `Weeks ${p.startWeek}–${p.endWeek}`} status={p.endWeek < week ? 'success' : 'accent'} />
            ))}
          </Stepper>
          <Grid columns={{minWidth: 220}} gap={3}>
            {plan.phases.map(p => {
              const ms = plan.milestones.filter(m => m.phaseId === p.id);
              return (
                <Card key={p.id} variant={p.id === current.id ? 'blue' : 'muted'} aria-label={`${p.name} phase`}>
                  <VStack gap={2}>
                    <Heading level={3}>{p.name}</Heading>
                    <Text type="supporting" color="secondary">
                      {p.focus}
                    </Text>
                    {ms.map(m => {
                      const part = plan.components.find(c => c.id === m.componentId);
                      const due = !m.done && m.week <= week;
                      return (
                        <CheckboxInput
                          key={m.id}
                          label={m.title}
                          description={`Week ${m.week}${part ? ` · ${part.name}` : ''}${due ? ' · due' : ''}`}
                          value={m.done}
                          isLoading={busy === `m-${m.id}`}
                          onChange={checked => void toggle(m.id, checked)}
                        />
                      );
                    })}
                  </VStack>
                </Card>
              );
            })}
          </Grid>
        </VStack>
      </Card>

      <Grid columns={{minWidth: 320, max: 2}} gap={4}>
        <VStack gap={4}>
          {plan.components.length > 0 && (
            <Card aria-label="What race day asks of you">
              <VStack gap={2}>
                <Heading level={2}>What race day asks of you</Heading>
                <List hasDividers>
                  {plan.components.map(c => {
                    const st = STATUS_TOKEN[componentStatus(plan, c.id, week)];
                    return <ListItem key={c.id} label={<Text weight="bold">{c.name}</Text>} description={c.detail} endContent={<Token label={st.label} size="sm" color={st.color} />} />;
                  })}
                </List>
              </VStack>
            </Card>
          )}

          <Card aria-label="Weekly check-in">
            <VStack gap={3}>
              <HStack gap={2} vAlign="center" justify="between">
                <Heading level={2}>Weekly check-in</Heading>
                {goal.checkin && <Token label={CHECKIN_TOKEN[goal.checkin.status].label} size="sm" color={CHECKIN_TOKEN[goal.checkin.status].color} />}
              </HStack>
              {goal.checkin ? (
                <VStack gap={2}>
                  <Text>{goal.checkin.headline}</Text>
                  <List listStyle="disc" density="compact">
                    {goal.checkin.adjustments.map(a => (
                      <ListItem key={a} label={a} />
                    ))}
                  </List>
                </VStack>
              ) : (
                <Text color="secondary">Your Muse compares the roadmap with your last two weeks and adjusts the next seven days.</Text>
              )}
              <HStack gap={2} vAlign="center" justify="between" wrap="wrap">
                <Text type="supporting" color="secondary">
                  {goal.checkin ? `Last check-in ${new Date(goal.checkin.at).toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'})}` : 'Uses only data you let your Muse see.'}
                </Text>
                <Button label={goal.checkin ? 'Check in again' : 'Check in with Muse'} isLoading={busy === 'checkin'} onClick={() => void checkIn()} />
              </HStack>
            </VStack>
          </Card>
        </VStack>

        <VStack gap={4}>
          <Card aria-label="This week's game">
            <VStack gap={3}>
              <Heading level={2}>This week&apos;s game</Heading>
              <Text color="secondary">{next ? `Muse turns week ${week} into a boss fight built around "${next.title}".` : 'Keep your streak alive with a weekly boss fight.'}</Text>
              {goal.questId ? (
                <HStack gap={2} wrap="wrap">
                  <Button label="Open your game" variant="primary" href={`/activities/games/${goal.questId}`} />
                  <Button label="New week" isLoading={busy === 'solo'} onClick={() => void play()} />
                </HStack>
              ) : (
                <Button label="Start my solo game" variant="primary" width="100%" isLoading={busy === 'solo'} onClick={() => void play()} />
              )}
              {matches.chats.length > 0 && (
                <VStack gap={1}>
                  <Heading level={4}>Train together</Heading>
                  <List hasDividers density="compact">
                    {matches.chats.map(c => (
                      <ListItem
                        key={c.id}
                        label={c.name}
                        description={c.sharing > 0 ? `${c.sharing} of ${c.members} share a matching goal` : `${c.members} people`}
                        endContent={<Button label="Play here" size="sm" isLoading={busy === `chat-${c.id}`} onClick={() => void play(c.id)} />}
                      />
                    ))}
                  </List>
                </VStack>
              )}
            </VStack>
          </Card>

          <Card aria-label="On the same path">
            <VStack gap={2}>
              <Heading level={2}>On the same path</Heading>
              {matches.friends.length + matches.groups.length + matches.events.length === 0 ? (
                <EmptyState title="Nobody yet" description="Nobody in your friends, groups or events is training for this yet. Start a game in a chat to bring them along." isCompact />
              ) : (
                <List hasDividers density="compact">
                  {matches.friends.map(f => (
                    <ListItem key={`f-${f.id}`} href={`/profile/${f.id}`} startContent={<Avatar src={f.avatarUrl} name={f.name} size="lg" />} label={f.name} description={`Tagged ${f.tag}`} />
                  ))}
                  {matches.groups.map(gr => (
                    <ListItem key={`g-${gr.id}`} href={`/groups/${gr.id}`} startContent={<Avatar src={gr.coverUrl} name={gr.name} size="lg" shape="rounded" />} label={gr.name} description={`Group · ${gr.members.toLocaleString()} members`} />
                  ))}
                  {matches.events.map(ev => (
                    <ListItem
                      key={`e-${ev.id}`}
                      href={`/events?id=${ev.id}`}
                      startContent={<Avatar src={ev.coverUrl} name={ev.title} size="lg" shape="rounded" />}
                      label={ev.title}
                      description={`${new Date(ev.startsAt).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} · ${ev.location}`}
                    />
                  ))}
                </List>
              )}
            </VStack>
          </Card>
          <Text type="supporting" color="secondary">
            Only you can see this roadmap. Friends see a goal tag, which you can remove in Activities setup. Planning help, not medical advice.
          </Text>
        </VStack>
      </Grid>
    </VStack>
  );
}
