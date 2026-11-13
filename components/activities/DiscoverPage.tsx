'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import {useRouter} from 'next/navigation';
import {useCallback, useEffect, useRef, useState} from 'react';
import {MapPin, Play, Sparkles} from 'lucide-react';
import {AspectRatio} from '@astryxdesign/core/AspectRatio';
import {Avatar} from '@astryxdesign/core/Avatar';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Carousel} from '@astryxdesign/core/Carousel';
import {Center} from '@astryxdesign/core/Center';
import {ClickableCard} from '@astryxdesign/core/ClickableCard';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Grid} from '@astryxdesign/core/Grid';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {Icon} from '@astryxdesign/core/Icon';
import {Layout, LayoutContent, LayoutFooter} from '@astryxdesign/core/Layout';
import {Selector} from '@astryxdesign/core/Selector';
import {StackItem} from '@astryxdesign/core/Stack';
import {Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {useToast} from '@astryxdesign/core/Toast';
import {Token} from '@astryxdesign/core/Token';
import {VStack} from '@astryxdesign/core/VStack';
import {BossArt} from '@/components/rally/BossArt';
import {RallyAvatar} from '@/components/rally/Avatar';
import {StravaConnection} from '@/components/turf/StravaConnection';
import type {DiscoverCard, DiscoverPayload, DiscoverSection} from '@/lib/activities/discover';
import type {Goal} from '@/lib/activities/goals';
import {GoalSpotlight} from '@/components/activities/goals/GoalSpotlight';
import type {MuseActionsPayload} from '@/lib/activities/actions';
import type {ListingBrief} from '@/lib/rally/queries';
import type {FitnessLevel} from '@/lib/activities/level';
import {ActivityLeaderboard} from './ActivityLeaderboard';
import {CoachToggle} from './CoachMode';
import {LevelCard} from './LevelCard';
import {MuseActions} from './MuseActions';
import {StartReelGame, type ReelGameMode} from './StartReelGame';
import b from './reels-bento.module.css';

type Viewer = {id: number; name: string; avatarUrl: string};
/** boss = Rally boss art; hero = the viewer's Kingdom hero (Mirror Yoga/Dance idle, Castle Crossing running); neither = Turf pin. */
export type MyGame = {key: string; href: string; title: string; subtitle: string; boss: {kind: string; name: string} | null; hero?: 'idle' | 'run'};
type Props = {viewer: Viewer; data: DiscoverPayload; museActions: MuseActionsPayload; listings: ListingBrief[]; start: string | null; eventId: number | null; goal?: Goal | null; games?: MyGame[]; level?: FitnessLevel | null};
type Chat = {id: number; title: string; isGroup: boolean};

const CHAT_MODES = ['sentence', 'yoga', 'dance', 'swim'];
const REEL_GAMES: string[] = ['yoga', 'dance', 'swim'];
const json = (body: unknown) => ({method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)});
const TurfSetup = dynamic(() => import('@/components/turf/TurfSetup').then(m => m.TurfSetup), {loading: () => <Text>Loading Turf setup…</Text>});

/** Ranking feedback (discover_events). Fire-and-forget; keepalive so a click that navigates away still lands. */
const logEvents = (cards: DiscoverCard[], event: 'impression' | 'click' | 'dismiss') => {
  if (!cards.length) return;
  void fetch('/api/activities/discover/events', {...json({events: cards.slice(0, 100).map(c => ({cardId: c.id, cardType: c.kind, tag: c.tag ?? null, event}))}), keepalive: true}).catch(() => {});
};

/** Section title row: heading on the left, an optional note or "See all" on the right. */
export function SectionHead({title, sub, href}: {title: string; sub?: string; href?: string}) {
  return (
    <HStack gap={2} vAlign="center" justify="between" wrap="wrap">
      <Heading level={2}>{title}</Heading>
      {sub && (
        <Text type="supporting" color="secondary">
          {sub}
        </Text>
      )}
      {href && <Button label="See all" variant="ghost" size="sm" href={href} />}
    </HStack>
  );
}

export function DiscoverPage({viewer, data, museActions, listings, start, eventId, goal = null, games = [], level = null}: Props) {
  const router = useRouter();
  const showToast = useToast();
  const [sections, setSections] = useState<DiscoverSection[]>(data.sections);
  const [startMode, setStartMode] = useState<string | null>(start);
  const [sentence, setSentence] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatId, setChatId] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const loggedAt = useRef<string | null>(null);

  // one impression batch per server render (the ref keeps StrictMode's double effect from logging twice)
  useEffect(() => {
    if (loggedAt.current === data.generatedAt) return;
    loggedAt.current = data.generatedAt;
    logEvents(data.sections.flatMap(s => s.cards), 'impression');
  }, [data]);

  useEffect(() => {
    if (!startMode || !CHAT_MODES.includes(startMode) || chats.length) return;
    fetch('/api/conversations')
      .then(r => (r.ok ? r.json() : {conversations: []}))
      .then((d: {conversations?: Chat[]}) => {
        const list = [...(d.conversations ?? [])].sort((a, b) => Number(b.isGroup) - Number(a.isGroup));
        setChats(list);
        setChatId(prev => prev ?? list[0]?.id ?? null);
      })
      .catch(() => {});
  }, [startMode, chats.length]);

  // Ember's "why you see this" lines arrive after first paint: one batched request for every card
  // still carrying its deterministic fallback, so the page itself never waits on Muse.
  useEffect(() => {
    const pending = data.sections.flatMap(s => s.cards.filter(c => c.whyPending));
    if (!pending.length) return;
    const ctrl = new AbortController();
    fetch('/api/activities/why', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      signal: ctrl.signal,
      body: JSON.stringify({cards: pending.map(c => ({id: c.id, kind: c.kind, title: c.title, subtitle: c.subtitle, tag: c.tag, meta: c.meta, fallback: c.fallback ?? c.why}))}),
    })
      .then(r => (r.ok ? r.json() : null))
      .then((d: {why?: Record<string, string>} | null) => {
        if (!d?.why) return;
        setSections(list => list.map(s => ({...s, cards: s.cards.map(c => (d.why![c.id] ? {...c, why: d.why![c.id], whyPending: false} : c))})));
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [data.sections]);

  const say = useCallback((t: string) => void showToast({body: t, autoHideDuration: 3500}), [showToast]);

  useEffect(() => {
    if (eventId) say('Training plan for this event starts with the friends going. Pick a game below.');
  }, [eventId, say]);

  const notInterested = async (card: DiscoverCard) => {
    logEvents([card], 'dismiss');
    setSections(list => list.map(s => ({...s, cards: s.cards.filter(c => c.id !== card.id)})).filter(s => s.cards.length));
    if (card.tag) {
      await fetch('/api/activities/tags', {...json({tag: card.tag}), method: 'DELETE'});
      say(`Removed "${card.tag}" from your tags.`);
    } else say('Hidden.');
  };

  /** Rally library: call the owning endpoints; 404/501 → "coming soon". */
  const startGame = async (template: 'sentence' | 'reel') => {
    setBusy(template);
    try {
      if (template === 'reel') {
        router.push('/reels');
        return;
      }
      if (chatId == null) {
        say('Pick a chat to play in first.');
        return;
      }
      const res = await fetch('/api/games/from-sentence', json({text: sentence.trim() || 'Run 3 km three times this week with friends', conversationId: chatId}));
      if (res.status === 404 || res.status === 501) {
        say('Quest from a sentence is coming soon.');
        return;
      }
      const d = (await res.json().catch(() => ({}))) as {id?: number; game?: {id?: number}; gameId?: number; quest?: {id?: number}; questId?: number; error?: string; url?: string};
      if (!res.ok) {
        say(d.error ?? 'Could not start the game yet.');
        return;
      }
      const url = d.url ?? `/activities/games/${d.quest?.id ?? d.questId ?? d.id ?? ''}`;
      router.push(url);
    } finally {
      setBusy(null);
      setStartMode(null);
    }
  };

  const startCard = (template: string) => (template === 'reel' ? void startGame('reel') : setStartMode(template === 'sentence' || REEL_GAMES.includes(template) ? template : 'turf'));
  const byId = (id: DiscoverSection['id']) => sections.find(s => s.id === id);
  const renderSection = (s: DiscoverSection) => (
    <VStack key={s.id} gap={3} as="section" aria-label={s.title}>
      <SectionHead title={s.title} sub={s.id === 'mentors' ? 'Talk through your Muses · names stay hidden · 18+' : s.id === 'friends' ? 'Yes/no answers only' : undefined} />
      <Grid columns={s.id === 'first_move' ? 1 : {minWidth: 220}} gap={3}>
        {s.cards.map(c => (
          <DiscoverCardView
            key={c.id}
            card={c}
            hero={s.id === 'first_move'}
            onNotInterested={() => notInterested(c)}
            onOpen={() => logEvents([c], 'click')}
            onStart={c.kind === 'start' ? () => startCard(String(c.meta?.template ?? 'turf')) : undefined}
            busy={busy === c.meta?.template}
          />
        ))}
      </Grid>
    </VStack>
  );
  const firstMove = byId('first_move');
  const reels = byId('learn');
  const chatPicker = (
    <Selector
      label="Play in"
      options={chats.map(c => ({value: String(c.id), label: c.isGroup ? `Group: ${c.title}` : c.title}))}
      value={chatId == null ? '' : String(chatId)}
      onChange={v => setChatId(Number(v))}
      placeholder={chats.length ? 'Pick a chat' : 'Loading chats…'}
      isLoading={!chats.length}
    />
  );

  return (
    <VStack gap={6} paddingBlock={4}>
      <HStack gap={3} vAlign="center" justify="between" wrap="wrap">
        <Heading level={1}>Activities</Heading>
        <CoachToggle />
      </HStack>

      <VStack gap={3} as="section" aria-label="Your games">
        <SectionHead title="Your games" />
        {games.length === 0 ? (
          <Card>
            <EmptyState title="You're not in any games right now" description="Start one below or from a group chat." isCompact />
          </Card>
        ) : (
          <Grid columns={{minWidth: 200}} gap={3}>
            {games.map(g => (
              <ClickableCard key={g.key} href={g.href} label={g.title}>
                <VStack gap={2} hAlign="center">
                  {g.boss ? <BossArt kind={g.boss.kind} name={g.boss.name} size={72} /> : g.hero ? <RallyAvatar src={viewer.avatarUrl} name={viewer.name} state={g.hero} size={72} /> : <Icon icon={MapPin} size="lg" color="accent" />}
                  <VStack gap={0.5} hAlign="center">
                    <Text weight="bold" justify="center">
                      {g.title}
                    </Text>
                    <Text type="supporting" color="secondary">
                      {g.subtitle}
                    </Text>
                  </VStack>
                </VStack>
              </ClickableCard>
            ))}
          </Grid>
        )}
      </VStack>

      {level && <LevelCard level={level} />}
      <GoalSpotlight goal={goal} />
      <MuseActions initial={museActions} viewerName={viewer.name} say={say} />
      {firstMove && renderSection(firstMove)}

      {reels && (
        <VStack gap={3} as="section" aria-label="Suggested reels">
          <SectionHead title="Suggested reels" href="/reels" />
          <nav className={b.bento} aria-label="Suggested reels">
            {reels.cards.map(c => (
              <Link key={c.id} href={c.href ?? '/reels'} className={b.reelTile} onClick={() => logEvents([c], 'click')}>
                {c.imageUrl && <img src={c.imageUrl} alt="" loading="lazy" />}
                <span className={b.reelTag}>
                  <Icon icon={Play} size="xsm" color="inherit" />
                  For {String(c.meta?.label ?? 'Workouts')}
                </span>
                <span className={b.reelCaption}>{c.title}</span>
              </Link>
            ))}
          </nav>
        </VStack>
      )}

      {listings.length > 0 && (
        <VStack gap={3} as="section" aria-label="Suggested on Marketplace">
          <SectionHead title="Suggested on Marketplace" href="/marketplace?category=Sporting%20Goods" />
          <Carousel gap={2} hasButtons hasEdgeFade aria-label="Suggested on Marketplace">
            {listings.map(l => (
              <ClickableCard key={l.id} href={`/marketplace/${l.id}`} label={l.title} padding={0} width={200}>
                <VStack>
                  <AspectRatio ratio={1}>
                    <img src={l.imageUrl} alt="" loading="lazy" />
                  </AspectRatio>
                  <VStack gap={0.5} padding={2}>
                    <Text weight="bold">${(l.priceCents / 100).toFixed(0)}</Text>
                    <Text maxLines={1}>{l.title}</Text>
                    <Text type="supporting" color="secondary" maxLines={1}>
                      {l.location}
                    </Text>
                  </VStack>
                </VStack>
              </ClickableCard>
            ))}
          </Carousel>
        </VStack>
      )}

      <ActivityLeaderboard />
      {sections.filter(s => s.id !== 'first_move' && s.id !== 'learn').map(renderSection)}

      <Dialog isOpen={startMode === 'turf'} onOpenChange={o => !o && setStartMode(null)} purpose="form" width={680}>
        <Layout
          header={<DialogHeader title="Start Turf" onOpenChange={() => setStartMode(null)} />}
          content={
            <LayoutContent>
              {startMode === 'turf' && <TurfSetup viewerId={viewer.id} />}
            </LayoutContent>
          }
          footer={
            <LayoutFooter>
              <HStack gap={2} hAlign="end">
                <Button label="Not now" onClick={() => setStartMode(null)} />
              </HStack>
            </LayoutFooter>
          }
        />
      </Dialog>
      <StartReelGame mode={startMode && REEL_GAMES.includes(startMode) ? (startMode as ReelGameMode) : null} viewer={viewer} chatPicker={chatPicker} chatId={chatId} onClose={() => setStartMode(null)} say={say} />
      <Dialog isOpen={startMode === 'sentence'} onOpenChange={o => !o && setStartMode(null)} purpose="form" width={480}>
        <Layout
          header={<DialogHeader title="Quest from a sentence" subtitle="Describe the game in one line and Muse builds the rules, the boss and the weekly drop." onOpenChange={() => setStartMode(null)} />}
          content={
            <LayoutContent>
              <VStack gap={4}>
                {chatPicker}
                <TextInput label="Game sentence" value={sentence} onChange={setSentence} placeholder="Run 3 km three times this week with friends" onEnter={() => void startGame('sentence')} />
              </VStack>
            </LayoutContent>
          }
          footer={
            <LayoutFooter>
              <HStack gap={2} hAlign="end">
                <Button label="Cancel" onClick={() => setStartMode(null)} />
                <Button label="Build it" variant="primary" isLoading={busy === 'sentence'} onClick={() => void startGame('sentence')} />
              </HStack>
            </LayoutFooter>
          }
        />
      </Dialog>
    </VStack>
  );
}

function DiscoverCardView({card, hero, onNotInterested, onOpen, onStart, busy}: {card: DiscoverCard; hero: boolean; onNotInterested: () => void; onOpen: () => void; onStart?: () => void; busy: boolean}) {
  const cta = card.cta ?? 'Open';
  const media = card.imageUrl ? (
    <AspectRatio ratio={16 / 9}>
      <img src={card.imageUrl} alt="" loading="lazy" />
    </AspectRatio>
  ) : card.avatarUrl ? (
    <Center paddingBlockStart={4}>
      <Avatar src={card.avatarUrl} name={card.title} size={hero ? 72 : 60} />
    </Center>
  ) : null;
  const body = (
    <VStack gap={2} padding={4} width="100%">
      {(card.meta?.bossFight || card.meta?.rally || card.kind === 'mentor') && (
        <HStack gap={1.5} wrap="wrap">
          {card.meta?.bossFight ? <Token label="Boss fight IRL · counts double" size="sm" color="red" /> : null}
          {card.meta?.rally ? <Token label="Weekly Rally" size="sm" color="blue" /> : null}
          {card.kind === 'mentor' && <Token label="Muse to Muse · name hidden" size="sm" color="purple" />}
        </HStack>
      )}
      <Heading level={3}>{card.title}</Heading>
      {card.subtitle && (
        <Text type="supporting" color="secondary">
          {card.subtitle}
        </Text>
      )}
      <HStack gap={1.5} vAlign="center">
        <Icon icon={Sparkles} size="xsm" color="accent" />
        <StackItem size="fill">
          <Text type="supporting" color="secondary">
            {card.why}
          </Text>
        </StackItem>
      </HStack>
      <HStack gap={2} wrap="wrap">
        {onStart ? (
          <Button
            label={cta}
            variant="primary"
            size="sm"
            isLoading={busy}
            onClick={() => {
              onOpen();
              onStart();
            }}
          />
        ) : (
          <Button label={cta} variant="primary" size="sm" href={card.href ?? '/activities'} onClick={onOpen} />
        )}
        {card.kind !== 'start' && card.kind !== 'invite' && <Button label="Not interested" variant="ghost" size="sm" tooltip={card.tag ? `Removes the "${card.tag}" tag` : 'Hide'} onClick={onNotInterested} />}
      </HStack>
      {card.kind === 'start' && (card.meta?.template === 'turf' || !card.meta?.template) && <StravaConnection />}
    </VStack>
  );
  return (
    <Card padding={0}>
      {hero && card.imageUrl ? (
        <Grid columns={{minWidth: 240, max: 2}}>
          {media}
          {body}
        </Grid>
      ) : (
        <VStack>
          {media}
          {body}
        </VStack>
      )}
    </Card>
  );
}
