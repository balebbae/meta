'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useCallback, useEffect, useRef, useState} from 'react';
import {Play, Sparkles} from 'lucide-react';
import {Button} from '@astryxdesign/core/Button';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {HStack} from '@astryxdesign/core/HStack';
import {Layout, LayoutContent, LayoutFooter} from '@astryxdesign/core/Layout';
import {Selector} from '@astryxdesign/core/Selector';
import {Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {useToast} from '@astryxdesign/core/Toast';
import {VStack} from '@astryxdesign/core/VStack';
import type {DiscoverCard, DiscoverPayload, DiscoverSection} from '@/lib/activities/discover';
import type {Goal} from '@/lib/activities/goals';
import type {HomeProgress, Nearby} from '@/lib/activities/home';
import type {MuseActionsPayload} from '@/lib/activities/actions';
import type {ListingBrief} from '@/lib/rally/queries';
import type {FitnessLevel} from '@/lib/activities/level';
import {ActivityLeaderboard} from './ActivityLeaderboard';
import {CoachToggle} from './CoachMode';
import {MuseActions} from './MuseActions';
import {Communities} from './home/Communities';
import {EventsNearby} from './home/EventsNearby';
import {ProgressHero} from './home/ProgressHero';
import {YourGames} from './home/YourGames';
import h from './home/home.module.css';
import b from './reels-bento.module.css';

type Viewer = {id: number; name: string; avatarUrl: string};
export type MyGame = {key: string; href: string; title: string; subtitle: string; boss: {kind: string; name: string} | null};
type Props = {viewer: Viewer; data: DiscoverPayload; museActions: MuseActionsPayload; listings: ListingBrief[]; start: string | null; eventId: number | null; goal?: Goal | null; games?: MyGame[]; level?: FitnessLevel | null; progress?: HomeProgress | null; nearby?: Nearby | null};
type Chat = {id: number; title: string; isGroup: boolean};

const json = (body: unknown) => ({method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)});

/** Ranking feedback (discover_events). Fire-and-forget; keepalive so a click that navigates away still lands. */
const logEvents = (cards: DiscoverCard[], event: 'impression' | 'click' | 'dismiss') => {
  if (!cards.length) return;
  void fetch('/api/activities/discover/events', {...json({events: cards.slice(0, 100).map(c => ({cardId: c.id, cardType: c.kind, tag: c.tag ?? null, event}))}), keepalive: true}).catch(() => {});
};

/** Section title row: heading on the left, an optional note or "See all" on the right. */
export function SectionHead({title, sub, href}: {title: string; sub?: string; href?: string}) {
  return (
    <div className={h.head}>
      <div>
        <h2 className={h.h2}>{title}</h2>
        {sub && <span className={h.sub}>{sub}</span>}
      </div>
      {href && (
        <Link className={h.more} href={href}>
          See all
        </Link>
      )}
    </div>
  );
}

export function DiscoverPage({viewer, data, museActions, listings, start, eventId, goal = null, games = [], level = null, progress = null, nearby = null}: Props) {
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
    if (!startMode || chats.length) return;
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
  const startGame = async (template: string) => {
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
      const res =
        template === 'turf'
          ? await fetch('/api/games', json({type: 'turf', gameType: 'turf', conversationId: chatId, settings: {lengthDays: 7, radiusKm: 1.5, arenaLabel: 'Turf with friends'}, invitees: 'all'}))
          : await fetch('/api/games/from-sentence', json({text: sentence.trim() || 'Run 3 km three times this week with friends', conversationId: chatId}));
      if (res.status === 404 || res.status === 501) {
        say(`${template === 'turf' ? 'Turf' : 'Quest from a sentence'} is coming soon.`);
        return;
      }
      const d = (await res.json().catch(() => ({}))) as {id?: number; game?: {id?: number}; gameId?: number; quest?: {id?: number}; questId?: number; error?: string; url?: string};
      if (!res.ok) {
        say(d.error ?? 'Could not start the game yet.');
        return;
      }
      const url = d.url ?? (template === 'turf' ? `/games/${d.game?.id ?? d.gameId ?? d.id ?? ''}` : `/activities/games/${d.quest?.id ?? d.questId ?? d.id ?? ''}`);
      router.push(url);
    } finally {
      setBusy(null);
      setStartMode(null);
    }
  };

  const byId = (id: DiscoverSection['id']) => sections.find(s => s.id === id);
  let order = 0;
  const section = (key: string, title: string, body: React.ReactNode, sub?: string, href?: string) => (
    <section key={key} className={h.section} style={{'--i': order++} as React.CSSProperties} aria-label={title}>
      <SectionHead title={title} sub={sub} href={href} />
      {body}
    </section>
  );
  const renderSection = (s: DiscoverSection) =>
    section(
      s.id,
      s.title,
      <div className={h.grid3} style={s.id === 'first_move' ? {gridTemplateColumns: '1fr'} : undefined}>
        {s.cards.map(c => (
          <DiscoverCardView
            key={c.id}
            card={c}
            hero={s.id === 'first_move'}
            onNotInterested={() => notInterested(c)}
            onOpen={() => logEvents([c], 'click')}
            onStart={c.kind === 'start' ? () => (c.meta?.template === 'sentence' ? setStartMode('sentence') : startGame(String(c.meta?.template ?? 'turf'))) : undefined}
            busy={busy === c.meta?.template}
          />
        ))}
      </div>,
      s.id === 'mentors' ? 'Talk through your Muses · names stay hidden · 18+' : s.id === 'friends' ? 'Yes/no answers only' : undefined,
    );
  const firstMove = byId('first_move');
  const reels = byId('learn');
  const groups = byId('groups');
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
    <div className={h.page}>
      <div className={h.titleRow}>
        <h1 className={h.h1}>Activities</h1>
        <CoachToggle />
      </div>

      {progress && (
        <div className={h.section} style={{'--i': order++} as React.CSSProperties}>
          <ProgressHero name={viewer.name} progress={progress} goal={goal} level={level} />
        </div>
      )}
      <MuseActions initial={museActions} viewerName={viewer.name} say={say} />
      {section('games', 'Your games', <YourGames games={games} onStart={() => setStartMode('sentence')} />, games.length ? undefined : 'Co-op with a group chat')}
      {groups && section('groups', 'Communities', <Communities cards={groups.cards} onOpen={c => logEvents([c], 'click')} onHide={c => void notInterested(c)} />, 'Clubs your friends are in', '/groups')}

      {reels &&
        section(
          'reels',
          'Suggested reels',
          <nav className={b.bento} aria-label="Suggested reels">
            {reels.cards.map(c => (
              <Link key={c.id} href={c.href ?? '/reels'} className={b.reelTile} onClick={() => logEvents([c], 'click')}>
                {c.imageUrl && <img src={c.imageUrl} alt="" loading="lazy" />}
                <span className={b.reelTag}>
                  <Play size={12} />
                  For {String(c.meta?.label ?? 'Workouts')}
                </span>
                <span className={b.reelCaption}>{c.title}</span>
              </Link>
            ))}
          </nav>,
          undefined,
          '/reels',
        )}

      {nearby && nearby.events.length > 0 && section('nearby', 'Near you', <EventsNearby events={nearby.events} home={nearby.home} />, nearby.home ? 'Distances from your city' : 'Add your city for distances', '/events')}

      {listings.length > 0 &&
        section(
          'shop',
          'Gear on Marketplace',
          <div className={h.strip}>
            {listings.map(l => (
              <Link key={l.id} href={`/marketplace/item/${l.id}`} className={`${h.card} ${h.shopTile}`}>
                <img src={l.imageUrl} alt="" loading="lazy" />
                <span className={h.cardBody} style={{padding: 12, gap: 2}}>
                  <span className={h.price}>${(l.priceCents / 100).toFixed(0)}</span>
                  <span className={h.cardTitle} style={{fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                    {l.title}
                  </span>
                  <span className={h.cardSub} style={{fontSize: 12}}>
                    {l.location}
                  </span>
                </span>
              </Link>
            ))}
          </div>,
          undefined,
          '/marketplace?category=Sporting%20Goods',
        )}

      {firstMove && renderSection(firstMove)}
      {sections.filter(s => !['first_move', 'learn', 'groups'].includes(s.id)).map(renderSection)}
      <div className={`${h.section} ${h.board}`} style={{'--i': order++} as React.CSSProperties}>
        <ActivityLeaderboard />
      </div>

      <Dialog isOpen={startMode === 'turf'} onOpenChange={o => !o && setStartMode(null)} purpose="form" width={480}>
        <Layout
          header={<DialogHeader title="Start Turf" onOpenChange={() => setStartMode(null)} />}
          content={
            <LayoutContent>
              <VStack gap={4}>
                <Text>Turf turns this week&apos;s runs and walks into a game: every street you cover becomes a cell you own. Friends only see the blocks you claim, never your route or your times.</Text>
                {chatPicker}
              </VStack>
            </LayoutContent>
          }
          footer={
            <LayoutFooter>
              <HStack gap={2} hAlign="end">
                <Button label="Not now" onClick={() => setStartMode(null)} />
                <Button label="Create game & invite friends" variant="primary" isLoading={busy === 'turf'} onClick={() => void startGame('turf')} />
              </HStack>
            </LayoutFooter>
          }
        />
      </Dialog>
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
    </div>
  );
}

function DiscoverCardView({card, hero, onNotInterested, onOpen, onStart, busy}: {card: DiscoverCard; hero: boolean; onNotInterested: () => void; onOpen: () => void; onStart?: () => void; busy: boolean}) {
  const cta = card.cta ?? 'Open';
  const media = card.imageUrl ? (
    <img className={h.cover} src={card.imageUrl} alt="" loading="lazy" style={hero ? {aspectRatio: 'auto', height: '100%', minHeight: 180} : undefined} />
  ) : card.avatarUrl ? (
    <div className={h.avatarWrap}>
      <img className={h.avatar} src={card.avatarUrl} alt="" />
    </div>
  ) : null;
  const tags = [card.meta?.bossFight ? ['Boss fight IRL · counts double', h.chipEmber] : null, card.meta?.rally ? ['Weekly Rally', ''] : null, card.kind === 'mentor' ? ['Muse to Muse · name hidden', ''] : null].filter(Boolean) as [string, string][];
  const body = (
    <div className={h.cardBody}>
      {tags.length > 0 && (
        <div className={h.chips}>
          {tags.map(([t, cls]) => (
            <span key={t} className={`${h.chip} ${cls}`}>
              {t}
            </span>
          ))}
        </div>
      )}
      <h3 className={h.cardTitle}>{card.title}</h3>
      {card.subtitle && <p className={h.cardSub}>{card.subtitle}</p>}
      <p className={h.why}>
        <Sparkles size={14} />
        <span>{card.why}</span>
      </p>
      <div className={h.cardBtns}>
        {onStart ? (
          <button
            type="button"
            className={`${h.pill} ${h.pillSm} ${h.pillBlue}`}
            disabled={busy}
            onClick={() => {
              onOpen();
              onStart();
            }}
          >
            {busy ? 'Starting…' : cta}
          </button>
        ) : (
          <Link className={`${h.pill} ${h.pillSm} ${h.pillBlue}`} href={card.href ?? '/activities'} onClick={onOpen}>
            {cta}
          </Link>
        )}
        {card.kind !== 'start' && card.kind !== 'invite' && (
          <button type="button" className={`${h.pill} ${h.pillSm} ${h.pillGhost}`} title={card.tag ? `Removes the "${card.tag}" tag` : 'Hide'} onClick={onNotInterested}>
            Not interested
          </button>
        )}
      </div>
    </div>
  );
  return (
    <article className={h.card} style={hero && card.imageUrl ? {display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)'} : undefined}>
      {media}
      {body}
    </article>
  );
}
