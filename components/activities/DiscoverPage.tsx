'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useCallback, useEffect, useRef, useState} from 'react';
import {Avatar} from '@/components/ui/Avatar';
import {Dialog} from '@/components/ui/Dialog';
import {ChevronLeftIcon, ChevronRightIcon} from '@/components/icons';
import {Leaderboard} from '@/components/closeness/Leaderboard';
import {ListingCard} from '@/components/pages/ListingCard';
import type {DiscoverCard, DiscoverPayload, DiscoverSection} from '@/lib/activities/discover';
import type {Goal} from '@/lib/activities/goals';
import {GoalSpotlight} from '@/components/activities/goals/GoalSpotlight';
import type {MuseActionsPayload} from '@/lib/activities/actions';
import type {ListingBrief} from '@/lib/rally/queries';
import {MuseActions} from './MuseActions';
import styles from './discover.module.css';

type Viewer = {id: number; name: string; avatarUrl: string};
type Props = {viewer: Viewer; data: DiscoverPayload; museActions: MuseActionsPayload; listings: ListingBrief[]; showIntro: boolean; start: string | null; eventId: number | null; goal?: Goal | null};

const json = (body: unknown) => ({method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)});

export function DiscoverPage({viewer, data, museActions, listings, showIntro, start, eventId, goal = null}: Props) {
  const router = useRouter();
  const [sections, setSections] = useState<DiscoverSection[]>(data.sections);
  const rail = useRef<HTMLDivElement>(null);
  const [railEdge, setRailEdge] = useState({start: true, end: listings.length <= 4});
  const onRailScroll = () => {
    const el = rail.current;
    if (el) setRailEdge({start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8});
  };
  const slide = (dir: 1 | -1) => rail.current?.scrollBy({left: dir * rail.current.clientWidth * 0.75, behavior: 'smooth'});
  const [toast, setToast] = useState<string | null>(null);
  const [intro, setIntro] = useState(showIntro);
  const [startMode, setStartMode] = useState<string | null>(start);
  const [sentence, setSentence] = useState('');
  const [chats, setChats] = useState<{id: number; title: string; isGroup: boolean}[]>([]);
  const [chatId, setChatId] = useState<number | null>(null);
  useEffect(() => {
    if (!startMode || chats.length) return;
    fetch('/api/conversations')
      .then(r => (r.ok ? r.json() : {conversations: []}))
      .then((d: {conversations?: {id: number; title: string; isGroup: boolean}[]}) => {
        const list = [...(d.conversations ?? [])].sort((a, b) => Number(b.isGroup) - Number(a.isGroup));
        setChats(list);
        setChatId(prev => prev ?? list[0]?.id ?? null);
      })
      .catch(() => {});
  }, [startMode, chats.length]);
  const [busy, setBusy] = useState<string | null>(null);

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

  const say = useCallback((t: string) => {
    setToast(t);
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    if (eventId) say('Training plan for this event starts with the friends going. Pick a game below.');
  }, [eventId, say]);

  const notInterested = async (card: DiscoverCard) => {
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
        router.push('/reels?tab=fitness');
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
  const renderSection = (s: DiscoverSection) => (
    <section key={s.id} className={styles.section} aria-label={s.title}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{s.title}</h2>
        {s.id === 'mentors' && <span className={styles.sectionSub}>Talk through your Muses · names stay hidden · 18+</span>}
        {s.id === 'friends' && <span className={styles.sectionSub}>Yes/no answers only</span>}
      </div>
      <div className={s.id === 'first_move' ? styles.heroWrap : styles.grid}>
        {s.cards.map(c => (
          <Card key={c.id} card={c} hero={s.id === 'first_move'} viewer={viewer} onNotInterested={() => notInterested(c)} onStart={c.kind === 'start' ? () => (c.meta?.template === 'sentence' ? setStartMode('sentence') : startGame(String(c.meta?.template ?? 'turf'))) : undefined} busy={busy === c.meta?.template} />
        ))}
      </div>
    </section>
  );
  const firstMove = byId('first_move');
  const reels = byId('learn');

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Activities</h1>
      <div className={styles.goalWrap}>
        <GoalSpotlight goal={goal} />
      </div>
      <MuseActions initial={museActions} viewerName={viewer.name} say={say} />
      {firstMove && renderSection(firstMove)}
      {reels && (
        <section className={styles.section} aria-label="Suggested reels">
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Suggested reels</h2>
            <Link href="/reels?tab=fitness#activities" className={styles.seeAll}>
              See all
            </Link>
          </div>
          <div className={styles.bento}>
            {reels.cards.map(c => (
              <Link key={c.id} href={c.href ?? '/reels?tab=fitness#activities'} className={styles.reelTile}>
                {c.imageUrl && <img src={c.imageUrl} alt="" loading="lazy" />}
                <span className={styles.reelTag}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  For {String(c.meta?.label ?? 'Workouts')}
                </span>
                <span className={styles.reelCaption}>{c.title}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      {listings.length > 0 && (
        <section className={styles.section} aria-label="Suggested on Marketplace">
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Suggested on Marketplace</h2>
            <Link href="/marketplace?category=Sporting%20Goods" className={styles.seeAll}>
              See all
            </Link>
          </div>
          <div className={styles.carouselWrap}>
            <div ref={rail} className={styles.carousel} onScroll={onRailScroll}>
              {listings.map(l => (
                <div key={l.id} className={styles.slide}>
                  <ListingCard listing={l} />
                </div>
              ))}
            </div>
            {!railEdge.start && (
              <button type="button" className={`${styles.arrow} ${styles.arrowPrev}`} aria-label="Previous items" onClick={() => slide(-1)}>
                <ChevronLeftIcon size={24} />
              </button>
            )}
            {!railEdge.end && (
              <button type="button" className={`${styles.arrow} ${styles.arrowNext}`} aria-label="More items" onClick={() => slide(1)}>
                <ChevronRightIcon size={24} />
              </button>
            )}
          </div>
        </section>
      )}
      <div className={`${styles.section} ${styles.board}`}>
        <Leaderboard defaultTab="fitness" />
      </div>
      {sections.filter(s => s.id !== 'first_move' && s.id !== 'learn').map(renderSection)}
      {toast && (
        <div className={styles.toast} role="status">
          {toast}
        </div>
      )}
      <Dialog open={startMode === 'turf'} onClose={() => setStartMode(null)} title="Start Turf">
        <div className={styles.introBody}>
          Turf turns this week&apos;s runs and walks into a game: every street you cover becomes a cell you own. Friends only see the blocks you claim, never your route or your times.
          <label style={{display: 'block', margin: '10px 0 2px', fontSize: 13, color: 'var(--fb-text-secondary)'}}>
            Play in
            <select className={styles.input} style={{display: 'block', width: '100%', marginTop: 4}} value={chatId ?? ''} onChange={e => setChatId(Number(e.target.value))} aria-label="Chat to play in">
              {chats.length === 0 && <option value="">Loading chats…</option>}
              {chats.map(c => (
                <option key={c.id} value={c.id}>
                  {c.isGroup ? `Group: ${c.title}` : c.title}
                </option>
              ))}
            </select>
          </label>
          <div className={styles.actions}>
            <button type="button" className={styles.primary} disabled={busy === 'turf'} onClick={() => startGame('turf')}>
              {busy === 'turf' ? 'Starting…' : 'Create game & invite friends'}
            </button>
            <button type="button" className={styles.secondary} onClick={() => setStartMode(null)}>
              Not now
            </button>
          </div>
        </div>
      </Dialog>
      <Dialog open={startMode === 'sentence'} onClose={() => setStartMode(null)} title="Quest from a sentence">
        <div className={styles.introBody}>
          Describe the game in one line and Muse builds the rules, the boss and the weekly drop.
          <label style={{display: 'block', margin: '10px 0 2px', fontSize: 13, color: 'var(--fb-text-secondary)'}}>
            Play in
            <select className={styles.input} style={{display: 'block', width: '100%', marginTop: 4}} value={chatId ?? ''} onChange={e => setChatId(Number(e.target.value))} aria-label="Chat to play in">
              {chats.length === 0 && <option value="">Loading chats…</option>}
              {chats.map(c => (
                <option key={c.id} value={c.id}>
                  {c.isGroup ? `Group: ${c.title}` : c.title}
                </option>
              ))}
            </select>
          </label>
          <div className={styles.sentenceRow}>
            <input className={styles.input} value={sentence} onChange={e => setSentence(e.target.value)} placeholder="Run 3 km three times this week with friends" aria-label="Game sentence" />
            <button type="button" className={styles.primary} style={{flex: '0 0 auto'}} disabled={busy === 'sentence'} onClick={() => startGame('sentence')}>
              {busy === 'sentence' ? 'Building…' : 'Build it'}
            </button>
          </div>
        </div>
      </Dialog>
      <Dialog
        open={intro}
        onClose={() => {
          setIntro(false);
          void fetch('/api/activities/prompts', json({surface: 'intro', action: 'snooze'}));
        }}
        title="Activities">
        <div className={styles.introBody}>
          <strong>Move more, with the people you already talk to.</strong>
          <ul>
            <li>Play Rally and Turf with friends — games built from real workouts.</li>
            <li>Your Muse keeps the details private and only answers yes/no on your behalf.</li>
            <li>You choose what friends, games and other people's Muses can see. Nothing is on by default.</li>
          </ul>
          <div className={styles.actions}>
            <Link href="/activities/onboarding/tags" className={styles.primary} onClick={() => setIntro(false)}>
              Set up Activities
            </Link>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => {
                setIntro(false);
                void fetch('/api/activities/prompts', json({surface: 'intro', action: 'snooze'}));
              }}>
              Not now
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function Card({card, hero, viewer, onNotInterested, onStart, busy}: {card: DiscoverCard; hero: boolean; viewer: Viewer; onNotInterested: () => void; onStart?: () => void; busy: boolean}) {
  void viewer;
  const cta = card.cta ?? 'Open';
  const inner = (
    <>
      {card.imageUrl ? (
        <div className={styles.img}>
          <img src={card.imageUrl} alt="" loading="lazy" />
        </div>
      ) : card.avatarUrl ? (
        <div className={styles.avatarWrap}>
          <Avatar src={card.avatarUrl} alt="" size={hero ? 72 : 56} />
        </div>
      ) : card.kind === 'mentor' ? (
        <div className={styles.avatarWrap}>
          <span className={styles.pill}>Muse to Muse · name hidden</span>
        </div>
      ) : null}
      <div className={styles.body}>
        {card.meta?.bossFight ? <span className={styles.pillRed}>Boss fight IRL · counts double</span> : null}
        {card.meta?.rally ? <span className={styles.pill}>Weekly Rally</span> : null}
        <div className={styles.title}>{card.title}</div>
        {card.subtitle && <div className={styles.subtitle}>{card.subtitle}</div>}
        <div className={styles.why}>
          <span className={styles.whyDot} aria-hidden />
          <span>{card.why}</span>
        </div>
        <div className={styles.actions}>
          {onStart ? (
            <button type="button" className={styles.primary} onClick={onStart} disabled={busy}>
              {busy ? 'Starting…' : cta}
            </button>
          ) : (
            <Link href={card.href ?? '/activities'} className={styles.primary}>
              {cta}
            </Link>
          )}
          {card.kind !== 'start' && card.kind !== 'invite' && (
            <button type="button" className={styles.ghost} onClick={onNotInterested} title={card.tag ? `Removes the "${card.tag}" tag` : 'Hide'}>
              Not interested
            </button>
          )}
        </div>
      </div>
    </>
  );
  return <article className={hero ? styles.hero : styles.card}>{inner}</article>;
}
