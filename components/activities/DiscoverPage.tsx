'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useCallback, useEffect, useState} from 'react';
import {Avatar} from '@/components/ui/Avatar';
import {Dialog} from '@/components/ui/Dialog';
import {PanelHeader, SecondaryLayout} from '@/components/pages/SecondaryLayout';
import type {DiscoverCard, DiscoverPayload, DiscoverSection} from '@/lib/activities/discover';
import type {InterestSuggestion} from '@/lib/activities/interests';
import sec from '@/components/pages/secondary.module.css';
import styles from './discover.module.css';

type Viewer = {id: number; name: string; avatarUrl: string};
type Props = {viewer: Viewer; data: DiscoverPayload; interests: {enabled: boolean; suggestions: InterestSuggestion[]}; showIntro: boolean; showInterests: boolean; start: string | null; eventId: number | null};

const json = (body: unknown) => ({method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)});

export function DiscoverPage({viewer, data, interests: initialInterests, showIntro, showInterests, start, eventId}: Props) {
  const router = useRouter();
  const [sections, setSections] = useState<DiscoverSection[]>(data.sections);
  const [tags, setTags] = useState<string[]>(data.tags);
  const [interests, setInterests] = useState(initialInterests);
  const [toast, setToast] = useState<string | null>(null);
  const [intro, setIntro] = useState(showIntro);
  const [startMode, setStartMode] = useState<string | null>(start);
  const [sentence, setSentence] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

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
      setTags(t => t.filter(x => x !== card.tag));
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
      const res = template === 'turf' ? await fetch('/api/games', json({gameType: 'turf', title: 'Turf with friends'})) : await fetch('/api/games/from-sentence', json({sentence: sentence.trim() || 'Run 3 km three times this week with friends'}));
      if (res.status === 404 || res.status === 501) {
        say(`${template === 'turf' ? 'Turf' : 'Quest from a sentence'} is coming soon.`);
        return;
      }
      const d = (await res.json().catch(() => ({}))) as {id?: number; game?: {id?: number}; gameId?: number; quest?: {id?: number}; questId?: number; error?: string; url?: string};
      if (!res.ok) {
        say(d.error ?? 'Could not start the game yet.');
        return;
      }
      const url = d.url ?? (template === 'turf' ? `/activities/turf/${d.game?.id ?? d.gameId ?? d.id ?? ''}` : `/activities/quests/${d.quest?.id ?? d.questId ?? d.id ?? ''}`);
      router.push(url);
    } finally {
      setBusy(null);
      setStartMode(null);
    }
  };

  const recap = async () => {
    setBusy('recap');
    const res = await fetch('/api/activities/recap', json({}));
    const d = (await res.json().catch(() => ({}))) as {postId?: number; museOffline?: boolean; error?: string};
    setBusy(null);
    if (res.ok) say(`Weekly recap posted to your feed${d.museOffline ? ' (Muse offline: template used)' : ''}.`);
    else say(d.error ?? 'Could not post the recap.');
  };

  const nudge = async () => {
    setBusy('nudge');
    const res = await fetch('/api/activities/nudge', json({kind: 'quest_drop'}));
    const d = (await res.json().catch(() => ({}))) as {message?: string; museOffline?: boolean};
    setBusy(null);
    say(res.ok ? `Notification sent: “${d.message}”${d.museOffline ? ' (Muse offline)' : ''}` : 'Could not send the nudge.');
  };

  const interestsAction = async (body: {action: string; tag?: string}) => {
    const res = await fetch('/api/activities/interests', json(body));
    if (res.ok) setInterests(await res.json());
  };
  const confirmTag = async (s: InterestSuggestion) => {
    await fetch('/api/activities/tags', json({tag: s.tag, origin: 'suggested', reason: s.reason}));
    setTags(t => (t.includes(s.tag) ? t : [...t, s.tag]));
    setInterests(i => ({...i, suggestions: i.suggestions.filter(x => x.tag !== s.tag)}));
    say(`Added "${s.tag}". Discover will refresh with it.`);
    router.refresh();
  };

  const panel = (
    <>
      <PanelHeader title="Activities" subtitle="Rally, Turf and your Muse — with friends." settings={false} />
      <nav>
        <Link href="/activities" className={`${sec.row} ${sec.rowActive}`}>
          <span className={sec.rowIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 2 7l10 5 10-5-10-5zm0 13L4.5 11.3 2 12.5l10 5 10-5-2.5-1.2L12 15z"/></svg>
          </span>
          <span className={sec.rowLabel}>Discover</span>
        </Link>
        <Link href="/activities/mentor" className={sec.row}>
          <span className={sec.rowIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-3.3 0-8 1.7-8 5v1h16v-1c0-3.3-4.7-5-8-5z"/></svg>
          </span>
          <span className={sec.rowLabel}>Mentors</span>
        </Link>
        <Link href="/reels" className={sec.row}>
          <span className={sec.rowIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16v16H4zM10 9v6l5-3z"/></svg>
          </span>
          <span className={sec.rowLabel}>Reels</span>
        </Link>
        <Link href="/closeness" className={sec.row}>
          <span className={sec.rowIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M5 20h3v-8H5zm5.5 0h3V4h-3zM16 20h3v-5h-3z"/></svg>
          </span>
          <span className={sec.rowLabel}>Leaderboard</span>
        </Link>
      </nav>
      <div className={sec.panelDivider} />
      <div className={sec.panelSection}>
        <span className={sec.panelSectionTitle}>Your tags</span>
      </div>
      <div className={styles.panelBox}>
        {tags.length ? (
          <div className={styles.chips}>
            {tags.map(t => (
              <span key={t} className={styles.chip}>
                {t}
              </span>
            ))}
          </div>
        ) : (
          <span>No tags yet. Pick some in Activities setup.</span>
        )}
      </div>
      {showInterests && (
        <div className={styles.panelBox}>
          <div className={styles.toggle}>
            <span>Suggest interests from what I do on Facebook</span>
            <button type="button" className={interests.enabled ? styles.switchOn : styles.switch} aria-pressed={interests.enabled} aria-label="Interest suggestions" onClick={() => interestsAction({action: interests.enabled ? 'disable' : 'enable'})} />
          </div>
          <div>Uses reels you watched, your groups and event RSVPs. Never health or body data. Turning it off clears every suggestion.</div>
          {interests.enabled &&
            interests.suggestions.map(s => (
              <div key={s.tag} className={styles.suggestion}>
                <span>
                  <strong>{s.tag}</strong>
                  <small>{s.reason}</small>
                </span>
                <span style={{display: 'flex', gap: 4}}>
                  <button type="button" className={styles.chipBtn} onClick={() => confirmTag(s)}>
                    Add
                  </button>
                  <button type="button" className={styles.chipBtn} style={{color: 'var(--fb-text-secondary)'}} onClick={() => interestsAction({action: 'dismiss', tag: s.tag})}>
                    Dismiss
                  </button>
                </span>
              </div>
            ))}
          {interests.enabled && !interests.suggestions.length && <div style={{marginTop: 6}}>Nothing new to suggest right now.</div>}
        </div>
      )}
      <div className={sec.panelDivider} />
      <div className={sec.panelSection}>
        <span className={sec.panelSectionTitle}>Demo tools</span>
      </div>
      <div style={{display: 'flex', flexDirection: 'column', gap: 6, padding: '0 8px 8px'}}>
        <button type="button" className={sec.panelButtonSecondary} onClick={recap} disabled={busy === 'recap'}>
          {busy === 'recap' ? 'Writing…' : 'Post my weekly recap'}
        </button>
        <button type="button" className={sec.panelButtonSecondary} onClick={nudge} disabled={busy === 'nudge'}>
          {busy === 'nudge' ? 'Sending…' : 'Send “your quest drops today”'}
        </button>
      </div>
    </>
  );

  return (
    <SecondaryLayout panel={panel}>
      <div className={styles.status}>
        <span>
          Ranked for you from your tags, friends and what&apos;s coming up. Other people appear only through privacy-safe answers they chose to share.
        </span>
        <span className={data.museOffline ? styles.offline : undefined}>{data.museOffline ? 'Muse offline · template reasons' : 'Muse · Ember reasons'}</span>
      </div>
      {sections.map(s => (
        <section key={s.id} className={styles.section} aria-label={s.title}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{s.title}</h2>
            {s.id === 'mentors' && <span className={styles.sectionSub}>Identity hidden until they accept · 18+</span>}
            {s.id === 'friends' && <span className={styles.sectionSub}>Yes/no answers only</span>}
          </div>
          <div className={s.id === 'first_move' ? undefined : styles.grid}>
            {s.cards.map(c => (
              <Card key={c.id} card={c} hero={s.id === 'first_move'} viewer={viewer} onNotInterested={() => notInterested(c)} onStart={c.kind === 'start' ? () => (c.meta?.template === 'sentence' ? setStartMode('sentence') : startGame(String(c.meta?.template ?? 'turf'))) : undefined} busy={busy === c.meta?.template} />
            ))}
          </div>
        </section>
      ))}
      {toast && (
        <div className={styles.toast} role="status">
          {toast}
        </div>
      )}
      <Dialog open={startMode === 'turf'} onClose={() => setStartMode(null)} title="Start Turf">
        <div className={styles.introBody}>
          Turf turns this week&apos;s runs and walks into a game: every street you cover becomes a cell you own. Friends only see the blocks you claim, never your route or your times.
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
            <li>You choose what friends, games and mentors can see. Nothing is on by default.</li>
          </ul>
          <div className={styles.actions}>
            <Link href="/activities/setup" className={styles.primary} onClick={() => setIntro(false)}>
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
    </SecondaryLayout>
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
          <span className={styles.pill}>Anonymous until accept</span>
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
