'use client';
import Link from 'next/link';
import {useState} from 'react';
import Image from '@/components/ui/SmartImage';
import {FriendsIcon, MobileNavIcon, MoreHorizontalIcon, CloseIcon, ChevronRightIcon, FeedPersonPlusIcon} from '@/components/icons';
import {Popover} from '@/components/ui/Popover';
import {profileApi} from '@/components/profile/api';
import type {FriendSummary} from '@/lib/profile-queries';
import type {Reel} from '@/lib/reels';
import styles from './FeedModules.module.css';

export type FeedReelPreview = Pick<Reel, 'id' | 'posterUrl' | 'caption'>;

function ModuleHeader({title, href, onHide, reels = false}: {title: string; href: string; onHide: () => void; reels?: boolean}) {
  const [more, setMore] = useState(false);
  return <header className={styles.header}>
    {reels ? <MobileNavIcon name="reels" size={20} /> : <FriendsIcon size={22} />}
    <h2>{title}</h2>
    <div className={styles.more}>
      <button aria-label={`More ${title} options`} onClick={() => setMore(v => !v)} aria-expanded={more}><MoreHorizontalIcon size={20} /></button>
      <Popover open={more} onClose={() => setMore(false)} width={180}><Link href={href}>See all</Link><button onClick={onHide}>Hide {title}</button></Popover>
    </div>
    <button aria-label={`Hide ${title}`} onClick={onHide}><CloseIcon size={22} /></button>
  </header>;
}

export function FeedModules({suggestions, reels}: {suggestions: FriendSummary[]; reels: FeedReelPreview[]}) {
  const [hidden, setHidden] = useState<number[]>([]);
  const [sent, setSent] = useState<number[]>([]);
  const [errors, setErrors] = useState<number[]>([]);
  const [hidePeople, setHidePeople] = useState(false);
  const [hideReels, setHideReels] = useState(false);
  const shown = suggestions.filter(s => !hidden.includes(s.id));
  async function add(id: number) {
    setSent(s => [...s, id]);
    setErrors(s => s.filter(x => x !== id));
    try { await profileApi.sendRequest(id); }
    catch { setSent(s => s.filter(x => x !== id)); setErrors(s => [...s, id]); }
  }
  return <div className={styles.modules}>
    {!hidePeople && shown.length > 0 && <section className={styles.module} aria-label="People you may know">
      <ModuleHeader title="People you may know" href="/friends?view=suggestions" onHide={() => setHidePeople(true)} />
      <div className={styles.people}>
        {shown.map(s => <div key={s.id} className={styles.person}>
          <Link href={`/profile/${s.id}`} className={styles.photo}><Image src={s.avatarUrl} alt={s.name} fill sizes="80vw" /></Link>
          <div className={styles.personBody}>
            <Link href={`/profile/${s.id}`} className={styles.name}>{s.name}</Link>
            <p>{s.mutualCount} {s.mutualCount === 1 ? 'friend' : 'friends'}</p>
            <div className={styles.buttons}>
              <button className={styles.add} disabled={sent.includes(s.id)} onClick={() => add(s.id)}>{sent.includes(s.id) ? 'Request sent' : <><FeedPersonPlusIcon size={18} />Add friend</>}</button>
              <button onClick={() => setHidden(h => [...h, s.id])}>Remove</button>
            </div>
            {errors.includes(s.id) && <p role="alert">Could not send request. Try again.</p>}
          </div>
        </div>)}
      </div>
      <Link href="/friends?view=suggestions" className={styles.footer}>See all <ChevronRightIcon size={16} /></Link>
    </section>}
    {!hideReels && reels.length > 0 && <section className={styles.module} aria-label="Reels">
      <ModuleHeader title="Reels" href="/reels" onHide={() => setHideReels(true)} reels />
      <div className={styles.reels}>
        {reels.map(r => <Link key={r.id} href={`/reels?feed=${r.id}`} className={styles.reel} aria-label={r.caption || 'Watch reel'}>
          {r.posterUrl && <Image src={r.posterUrl} alt="" fill sizes="55vw" unoptimized />}
          {r.caption && <span>{r.caption}</span>}
        </Link>)}
      </div>
      <Link href="/reels" className={styles.footer}>Go to Reels <ChevronRightIcon size={16} /></Link>
    </section>}
  </div>;
}
