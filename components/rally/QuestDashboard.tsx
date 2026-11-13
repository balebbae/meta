'use client';
import dynamic from 'next/dynamic';
import {useRouter} from 'next/navigation';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {AspectRatio} from '@astryxdesign/core/AspectRatio';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {ClickableCard} from '@astryxdesign/core/ClickableCard';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Grid} from '@astryxdesign/core/Grid';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {List} from '@astryxdesign/core/List';
import {ListItem} from '@astryxdesign/core/List';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {Step, Stepper} from '@astryxdesign/core/Stepper';
import {Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import {useToast} from '@astryxdesign/core/Toast';
import {VStack} from '@astryxdesign/core/VStack';
import {castBoss, castHero} from '@/lib/kingdom/cast';
import type {QuestState} from '@/lib/rally/queries';
import {RallyAvatar, type AvatarState} from './Avatar';
import {BossArt} from './BossArt';
import {LogMoveSheet} from './LogMoveSheet';
import {ShareToGroupsDialog} from './ShareToGroupsDialog';
import {rallyApi, type OkMove} from './api';
import s from './dashboard.module.css';

// One live WebGL scene for the fight; every other character on the page is a cached sprite.
const Arena = dynamic(() => import('@/components/kingdom/Arena'), {ssr: false});
type ArenaStrike = import('@/components/kingdom/Arena').ArenaStrike;

const POLL_MS = 3000;
const exerciseLine = (e: {name: string; reps?: number | null; seconds?: number | null}) => `${e.name}${e.reps ? ` ×${e.reps}` : ''}${e.seconds ? ` ${e.seconds}s` : ''}`;

/** §17.2 dashboard: Boss arena (polls state every 3s), Quest map, Squad, Locker, recent moves. */
export function QuestDashboard({initial}: {initial: QuestState}) {
  const router = useRouter();
  const showToast = useToast();
  const [state, setState] = useState<QuestState>(initial);
  const [logOpen, setLogOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [dare, setDare] = useState<QuestState['dares'][number] | null>(null);
  const [anim, setAnim] = useState<{userId: number; state: AvatarState; hurt: boolean} | null>(null);
  const [arenaFailed, setArenaFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches), []);
  const bossCast = useMemo(() => castBoss(state.quest.bossKind), [state.quest.bossKind]);
  const heroKey = state.members.map(m => `${m.id}:${m.name}:${m.gear.length}`).join('|');
  const arenaHeroes = useMemo(() => state.members.map(m => ({id: m.id, name: m.name, cast: castHero(m.name, m.gear)})), [heroKey]); // eslint-disable-line react-hooks/exhaustive-deps -- state is replaced on every poll
  const lastMoveId = useRef(initial.moves[initial.moves.length - 1]?.id ?? 0);
  // Moves logged since this page opened, for the arena to play. My own carry the reps I typed; a teammate's set is shown at their personal target.
  const [strikes, setStrikes] = useState<ArenaStrike[]>([]);
  const mine = useRef(new Map<number, {reps: number | null; critical: boolean}>());

  const refresh = useCallback(async () => {
    try {
      const next = await rallyApi.state(initial.quest.id);
      const newest = next.moves[next.moves.length - 1];
      if (newest && newest.id > lastMoveId.current) {
        const fresh = next.moves.filter(m => m.id > lastMoveId.current && m.damage > 0).map(m => {
          const own = mine.current.get(m.id);
          return {id: m.id, userId: m.userId, damage: m.damage, reps: own?.reps ?? next.members.find(x => x.id === m.userId)?.target ?? 6, critical: own?.critical ?? false};
        });
        if (fresh.length) setStrikes(prev => [...prev.slice(-20), ...fresh]);
        lastMoveId.current = newest.id;
        setAnim({userId: newest.userId, state: next.quest.status === 'completed' ? 'celebrate' : 'attack', hurt: true});
        setTimeout(() => setAnim(null), 1800);
      }
      setState(next);
    } catch {
      /* keep last good state */
    }
  }, [initial.quest.id]);

  useEffect(() => {
    const t = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  const onMove = (res: OkMove, reps: number | null) => {
    mine.current.set(res.move.id, {reps, critical: res.critical});
    showToast({body: `Game Master: ${res.narration}`, autoHideDuration: 5000});
    void refresh();
  };

  const q = state.quest;
  const spec = q.spec;
  const hpPct = q.bossHp ? Math.max(0, Math.min(100, (q.bossHpLeft / q.bossHp) * 100)) : 0;
  const done = q.status === 'completed';
  const me = state.members.find(m => m.id === state.viewerId);
  const level = spec.levels[state.levelDay - 1];
  const myRewards = state.rewards.filter(x => x.userId === state.viewerId);
  const maxDamage = state.members.reduce((mx, x) => Math.max(mx, x.damage), 0);
  const myGear = me ? state.gear.filter(g => g.userId === me.id) : [];

  const leave = async () => {
    setLeaving(true);
    try {
      await rallyApi.leave(q.id);
      router.push('/activities');
    } catch (err) {
      setLeaving(false);
      setLeaveOpen(false);
      showToast({body: err instanceof Error ? err.message : 'Could not leave the game', type: 'error'});
    }
  };
  const claim = async (id: number) => {
    try {
      await rallyApi.claim(id);
      void refresh();
    } catch {
      showToast({body: 'Could not claim that reward', type: 'error'});
    }
  };

  return (
    <VStack gap={3} paddingBlock={3}>
      <Card aria-label="Boss arena">
        <VStack gap={4}>
          <HStack gap={3} vAlign="start" justify="between" wrap="wrap">
            <VStack gap={2} maxWidth={560}>
              <Heading level={1}>{q.title}</Heading>
              <Text color="secondary">{spec.story}</Text>
              <HStack gap={1.5} wrap="wrap">
                <Token label={spec.template} size="sm" />
                <Token label={`Day ${state.levelDay} of ${spec.levels.length}`} size="sm" color="blue" />
                {q.buffed && <Token label="Boss buffed +10%" size="sm" color="orange" />}
                {!state.museUsed && <Token label="Muse offline · template quest" size="sm" color="gray" />}
                {state.myReadiness && <Token label={state.myReadiness.fit === 'good' ? 'Good match for you' : 'A stretch for you'} size="sm" color={state.myReadiness.fit === 'good' ? 'green' : 'orange'} />}
              </HStack>
            </VStack>
            <HStack gap={2} wrap="wrap">
              <Button label="Post to groups" variant="primary" isDisabled={done} onClick={() => setShareOpen(true)} />
              {q.conversationId && <Button label="Open chat" href={`/messages/${q.conversationId}`} />}
            </HStack>
          </HStack>

          {spec.boss && (
            <VStack gap={4} hAlign="center" padding={4} className={s.arenaStage}>
              <VStack gap={2} hAlign="center" width="100%" maxWidth={560}>
                {arenaFailed ? (
                  <BossArt kind={q.bossKind} name={spec.boss.name} size={150} hurt={Boolean(anim?.hurt)} down={done} />
                ) : (
                  <div className={s.arenaCanvas} role="img" aria-label={`${spec.boss.name}${done ? ', defeated,' : ''} facing the squad: ${state.members.map(m => m.name.split(' ')[0]).join(', ')}`}>
                    <Arena boss={bossCast} bossName={spec.boss.name} hp={q.bossHp} hpLeft={done ? 0 : q.bossHpLeft} heroes={arenaHeroes} strikes={strikes} reducedMotion={reducedMotion} onError={() => setArenaFailed(true)} />
                  </div>
                )}
                <Heading level={3}>{spec.boss.name}</Heading>
                <ProgressBar
                  label={done ? 'Defeated' : `Boss HP · ${Math.round(hpPct)}%`}
                  value={q.bossHpLeft}
                  max={q.bossHp || 1}
                  variant="error"
                  hasValueLabel
                  formatValueLabel={(v, m) => `${v} / ${m} HP`}
                />
              </VStack>
              <HStack gap={4} hAlign="center" wrap="wrap" aria-label="Squad">
                {state.members.map(m => (
                  <VStack key={m.id} gap={1} hAlign="center">
                    <RallyAvatar src={m.avatarUrl} name={m.name} gear={m.gear} size={64} mvp={state.mvp === m.id} state={anim?.userId === m.id ? anim.state : done ? 'celebrate' : 'idle'} />
                    <Text type="supporting" weight="bold">
                      {m.name.split(' ')[0]}
                    </Text>
                  </VStack>
                ))}
              </HStack>
            </VStack>
          )}

          {q.template === 'relay' && (
            <VStack gap={2}>
              {(['A', 'B'] as const).map(t => (
                <ProgressBar key={t} label={`Team ${t}`} value={state.relay.legs[t]} max={state.relay.totalLegs} variant={t === 'A' ? 'accent' : 'success'} hasValueLabel formatValueLabel={(v, m) => `${v}/${m} legs`} />
              ))}
              {state.relay.winner && <Text color="secondary">Winner: {state.relay.winner === 'tie' ? 'tie' : `Team ${state.relay.winner}`}</Text>}
            </VStack>
          )}

          {(state.fairness || state.myHandicap) && (
            <Card variant="muted">
              <VStack gap={2}>
                <HStack gap={2} vAlign="center" justify="between" wrap="wrap">
                  <Heading level={3}>Fair play</Heading>
                  {state.fairness && <Token label={`Predicted finish: ${state.fairness.label}`} size="sm" color="green" />}
                </HStack>
                {state.fairness?.summary && <Text color="secondary">{state.fairness.summary}</Text>}
                {state.myHandicap && (
                  <Text color="secondary">
                    <Text weight="bold">Only you see this:</Text> target ×{state.myHandicap.targetScale}, each move hits ×{state.myHandicap.damageScale}
                    {state.myHandicap.why ? `. ${state.myHandicap.why}` : '.'}
                  </Text>
                )}
              </VStack>
            </Card>
          )}

          <VStack gap={2}>
            {me && level && !done && (
              <Text type="supporting" color="secondary">
                Today: {level.name} · {level.exercises.map(exerciseLine).join(', ')}
                {me.target != null && <> · your target {me.target}</>}
              </Text>
            )}
            <HStack gap={2} vAlign="center" justify="between" wrap="wrap">
              <HStack gap={2} wrap="wrap">
                <Button label="Log a move" variant="primary" isDisabled={done} onClick={() => setLogOpen(true)} />
                <Button label="Do a dare" isDisabled={done || !state.dares.length} onClick={() => setDare(state.dares.find(d => !d.doneBy.includes(state.viewerId)) ?? state.dares[0])} />
              </HStack>
              <Button label="Leave game" variant="destructive" onClick={() => setLeaveOpen(true)} />
            </HStack>
          </VStack>
        </VStack>
      </Card>

      <Card aria-label="Quest map">
        <VStack gap={3}>
          <Heading level={2}>Quest map</Heading>
          <Stepper activeStep={Math.max(0, state.levelDay - 1)} orientation="vertical" label="Quest map">
            {spec.levels.map(l => {
              const here = state.members.filter(m => m.level === l.day);
              return (
                <Step
                  key={l.day}
                  step={l.day}
                  label={l.name}
                  description={l.exercises.map(exerciseLine).join(' · ')}
                  status={l.day < state.levelDay || done ? 'success' : 'accent'}
                  endContent={
                    here.length > 0 ? (
                      <HStack gap={1}>
                        {here.map(m => (
                          <RallyAvatar key={m.id} src={m.avatarUrl} name={m.name} gear={m.gear} size={28} state={l.day === state.levelDay && !done ? 'run' : 'idle'} />
                        ))}
                      </HStack>
                    ) : undefined
                  }
                />
              );
            })}
          </Stepper>
        </VStack>
      </Card>

      <Grid columns={{minWidth: 320, max: 2}} gap={3}>
        <Card aria-label="Squad">
          <VStack gap={3}>
            <Heading level={2}>Squad</Heading>
            <List hasDividers>
              {[...state.members]
                .sort((a, b) => b.damage - a.damage)
                .map(m => (
                  <ListItem
                    key={m.id}
                    startContent={<RallyAvatar src={m.avatarUrl} name={m.name} gear={m.gear} size={32} />}
                    label={
                      <HStack gap={1.5} vAlign="center" wrap="wrap">
                        <Text weight="bold">{m.name}</Text>
                        {state.mvp === m.id && <Token label="MVP" size="sm" color="yellow" />}
                        {m.team && <Token label={`Team ${m.team}`} size="sm" />}
                      </HStack>
                    }
                    description={
                      <>
                        {m.moves} {m.moves === 1 ? 'move' : 'moves'} · {m.damage} dmg
                        {state.streak[m.id] && ` · streak ${state.streak[m.id].streak} · ${state.streak[m.id].livesLeft} lives`}
                      </>
                    }
                    endContent={
                      <VStack width={88}>
                        <ProgressBar label={`${m.name} damage share`} isLabelHidden value={m.damage} max={maxDamage || 1} />
                      </VStack>
                    }
                  />
                ))}
            </List>
            <Heading level={3}>Dares</Heading>
            <List hasDividers>
              {state.dares.map(d => {
                const mine = d.doneBy.includes(state.viewerId);
                return (
                  <ListItem
                    key={d.id}
                    label={d.text}
                    description={
                      <>
                        +{d.bonus} bonus{d.needsProof ? ' · photo' : ''}
                        {d.doneBy.length > 0 && ` · done by ${d.doneBy.map(id => state.members.find(m => m.id === id)?.name.split(' ')[0] ?? '?').join(', ')}`}
                      </>
                    }
                    endContent={<Button label={mine ? 'Done' : 'Do it'} size="sm" isDisabled={done || mine} onClick={() => setDare(d)} />}
                  />
                );
              })}
            </List>
          </VStack>
        </Card>

        <Card aria-label="Locker">
          <VStack gap={3}>
            <Heading level={2}>Locker</Heading>
            {me && (
              <HStack gap={3} vAlign="center">
                <RallyAvatar src={me.avatarUrl} name={me.name} gear={me.gear} size={96} state={done ? 'celebrate' : 'idle'} />
                <VStack gap={1.5}>
                  <Text weight="bold">Your gear</Text>
                  {myGear.length ? (
                    <HStack gap={1.5} wrap="wrap">
                      {myGear.map(g => (
                        <Token key={g.slug} label={g.label} description={g.description ?? undefined} size="sm" color="purple" />
                      ))}
                    </HStack>
                  ) : (
                    <Text type="supporting" color="secondary">
                      Beat the boss to unlock gear for everyone.
                    </Text>
                  )}
                </VStack>
              </HStack>
            )}
            <Heading level={3}>Rewards</Heading>
            <List hasDividers>
              {myRewards.length === 0
                ? spec.rewards.map((rw, i) => <ListItem key={i} startContent={<Token label={rw.tier} size="sm" />} label={rw.label} isDisabled endContent={<Text type="supporting" color="secondary">locked</Text>} />)
                : myRewards.map(rw => (
                    <ListItem
                      key={rw.id}
                      startContent={<Token label={rw.tier} size="sm" color="green" />}
                      label={rw.label}
                      description={
                        rw.sponsor || (rw.status === 'claimed' && rw.code) ? (
                          <VStack gap={1}>
                            {rw.sponsor && (
                              <Text type="supporting" color="secondary">
                                Sponsored · {rw.sponsor}
                                {rw.tier === 'equipment' && ' · 18+ only, demo offer'}
                              </Text>
                            )}
                            {rw.status === 'claimed' && rw.code && <Text type="code">{rw.code}</Text>}
                          </VStack>
                        ) : undefined
                      }
                      endContent={<Button label={rw.status === 'claimed' ? 'Claimed' : 'Claim'} size="sm" variant={rw.status === 'claimed' ? 'secondary' : 'primary'} isDisabled={rw.status === 'claimed'} clickAction={() => claim(rw.id)} />}
                    />
                  ))}
            </List>
            {state.listings.length > 0 && (
              <>
                <Heading level={3}>Gear for your next quest</Heading>
                <Grid columns={{minWidth: 120}} gap={2}>
                  {state.listings.map(l => (
                    <ClickableCard key={l.id} href={`/marketplace/${l.id}`} label={l.title} padding={0}>
                      <VStack>
                        <AspectRatio ratio={1}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={l.imageUrl} alt="" />
                        </AspectRatio>
                        <VStack gap={0.5} padding={2}>
                          <Text weight="bold" maxLines={1}>
                            {l.title}
                          </Text>
                          <Text type="supporting" color="secondary" maxLines={1}>
                            ${(l.priceCents / 100).toFixed(0)} · {l.location}
                          </Text>
                        </VStack>
                      </VStack>
                    </ClickableCard>
                  ))}
                </Grid>
              </>
            )}
          </VStack>
        </Card>
      </Grid>

      <Card aria-label="Recent moves">
        <VStack gap={3}>
          <Heading level={2}>Recent moves</Heading>
          {state.moves.length === 0 ? (
            <EmptyState title="No moves yet" description="Be the first to hit the boss." isCompact />
          ) : (
            <List hasDividers>
              {[...state.moves]
                .reverse()
                .slice(0, 12)
                .map(m => {
                  const who = state.members.find(x => x.id === m.userId);
                  return (
                    <ListItem
                      key={m.id}
                      startContent={<RallyAvatar src={who?.avatarUrl ?? ''} name={who?.name ?? ''} gear={who?.gear ?? []} size={28} />}
                      label={
                        <HStack gap={1.5} vAlign="center" wrap="wrap">
                          <Text>
                            <Text weight="bold">{who?.name.split(' ')[0] ?? 'Someone'}</Text> {m.kind === 'dare' ? 'completed a dare' : 'hit the boss'} for <Text weight="bold">{m.damage}</Text>
                          </Text>
                          {m.hasProof && <Token label={m.proofStatus === 'pending' ? 'proof pending' : m.proofStatus === 'approved' ? 'proof ✓' : 'photo'} size="sm" color={m.proofStatus === 'approved' ? 'green' : 'default'} />}
                        </HStack>
                      }
                      endContent={
                        <Text type="supporting" color="secondary">
                          {new Date(m.createdAt).toLocaleDateString(undefined, {weekday: 'short', hour: 'numeric', minute: '2-digit'})}
                        </Text>
                      }
                    />
                  );
                })}
            </List>
          )}
        </VStack>
      </Card>

      <LogMoveSheet questId={q.id} open={logOpen} onClose={() => setLogOpen(false)} levelName={level?.name} exercises={level?.exercises.map(exerciseLine)} target={me?.target ?? null} onDone={onMove} />
      <LogMoveSheet questId={q.id} open={Boolean(dare)} onClose={() => setDare(null)} dare={dare} onDone={onMove} />
      <ShareToGroupsDialog questId={q.id} open={shareOpen} onClose={() => setShareOpen(false)} />
      <AlertDialog
        isOpen={leaveOpen}
        onOpenChange={open => !leaving && setLeaveOpen(open)}
        title={`Leave ${q.title}?`}
        description="Your moves stay in the log, but you can't rejoin unless someone shares the game again."
        actionLabel="Leave game"
        onAction={() => void leave()}
        isActionLoading={leaving}
      />
    </VStack>
  );
}
