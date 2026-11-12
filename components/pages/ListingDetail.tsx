'use client';
import Image from 'next/image';
import Link from 'next/link';
import {useState, type FormEvent} from 'react';
import {Avatar} from '@/components/ui/Avatar';
import type {Listing} from '@/lib/secondary-queries';
import {CONDITION_LABELS, formatPrice, timeAgoLong} from '@/lib/secondary-data';
import {BookmarkIcon, BookmarkOutlineIcon, CloseIcon, MessengerIcon, MoreIcon, ShareIcon} from './icons';
import styles from './marketplace.module.css';

export function ListingDetail({listing}: {listing: Listing}) {
  const [saved, setSaved] = useState(listing.isSaved);
  const [message, setMessage] = useState('Is this still available?');
  const [sent, setSent] = useState(false);
  const sellerSince = new Date(listing.seller.createdAt).getFullYear();

  async function toggleSave() {
    const next = !saved;
    setSaved(next);
    const res = await fetch(`/api/marketplace/${listing.id}/save`, {method: next ? 'POST' : 'DELETE'});
    if (!res.ok) setSaved(!next);
  }

  function send(e: FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSent(true);
  }

  return (
    <div data-layout="wide" className={styles.detail}>
      <div className={styles.media}>
        <Image src={listing.imageUrl} alt="" fill className={styles.mediaBlur} sizes="100vw" aria-hidden />
        <Image src={listing.imageUrl} alt={listing.title} fill sizes="(max-width: 900px) 100vw, calc(100vw - 360px)" priority />
        <Link href="/marketplace" className={styles.closeBtn} aria-label="Back to Marketplace">
          <CloseIcon />
        </Link>
      </div>
      <aside className={styles.side}>
        <h1 className={styles.detailTitle}>{listing.title}</h1>
        <div className={styles.detailPrice}>{formatPrice(listing.priceCents)}</div>
        <div className={styles.detailMeta}>
          Listed {timeAgoLong(listing.createdAt)} in {listing.location}
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.primary}>
            <MessengerIcon size={16} />
            Message
          </button>
          <button type="button" className={saved ? styles.iconBtnActive : styles.iconBtn} onClick={toggleSave} aria-pressed={saved} aria-label={saved ? 'Unsave' : 'Save'}>
            {saved ? <BookmarkIcon /> : <BookmarkOutlineIcon />}
          </button>
          <button type="button" className={styles.iconBtn} aria-label="Share">
            <ShareIcon />
          </button>
          <button type="button" className={styles.iconBtn} aria-label="More">
            <MoreIcon />
          </button>
        </div>
        <div className={styles.divider} />
        <h2 className={styles.sectionTitle}>Details</h2>
        <dl className={styles.kv}>
          <dt>Condition</dt>
          <dd>{CONDITION_LABELS[listing.condition] ?? listing.condition}</dd>
          <dt>Category</dt>
          <dd>{listing.category}</dd>
        </dl>
        {listing.description && <p className={styles.desc}>{listing.description}</p>}
        <div className={styles.divider} />
        <h2 className={styles.sectionTitle}>Seller information</h2>
        <Link href={`/profile/${listing.seller.id}`} className={styles.seller}>
          <Avatar src={listing.seller.avatarUrl} alt={listing.seller.name} size={40} />
          <div>
            <div className={styles.sellerName}>{listing.seller.name}</div>
            <div className={styles.sellerSince}>Joined Facebook in {sellerSince}</div>
          </div>
        </Link>
        <div className={styles.divider} />
        <h2 className={styles.sectionTitle}>Send seller a message</h2>
        <form className={styles.msgForm} onSubmit={send}>
          <input value={message} onChange={e => setMessage(e.target.value)} aria-label="Message" />
          <button type="submit" className={styles.msgSend}>
            Send
          </button>
        </form>
        {sent && <div className={styles.sent}>Message sent to {listing.seller.name} (demo only).</div>}
      </aside>
    </div>
  );
}
