import type {Metadata} from 'next';
import Link from 'next/link';
import {getSessionUser} from '@/lib/auth';
import {listNotifications} from '@/lib/queries';
import {listConversations} from '@/lib/messaging-queries';
import {listListings, listSavedListings} from '@/lib/secondary-queries';
import {MARKETPLACE_LOCATION, matchesQuery} from '@/lib/secondary-data';
import {SecondaryLayout} from '@/components/pages/SecondaryLayout';
import {MarketplacePanel} from '@/components/pages/MarketplacePanel';
import {ListingCard} from '@/components/pages/ListingCard';
import {PinIcon} from '@/components/pages/icons';
import styles from '@/components/pages/marketplace.module.css';

export const metadata: Metadata = {title: 'Marketplace | Facebook'};
export const dynamic = 'force-dynamic';

const TITLES: Record<string, string> = {
  jobs: 'Jobs',
  buying: 'Buying',
  selling: 'Selling',
  notifications: 'Notifications',
  inbox: 'Inbox',
  status: 'Marketplace status',
};

export default async function MarketplacePage({searchParams}: {searchParams: Promise<{category?: string; tab?: string; q?: string}>}) {
  const {category, tab, q} = await searchParams;
  const user = await getSessionUser();
  const viewerId = user?.id ?? 0;
  const [listings, saved, notes, chats] = await Promise.all([
    listListings(viewerId),
    listSavedListings(viewerId),
    user ? listNotifications(user.id) : Promise.resolve([]),
    user ? listConversations(user.id) : Promise.resolve([]),
  ]);
  const mine = listings.filter(listing => listing.seller.id === viewerId);
  let shown = listings.filter(listing => matchesQuery(q, listing.title, listing.description, listing.location, listing.category));
  if (category) shown = shown.filter(listing => listing.category === category);
  if (tab === 'jobs') shown = shown.filter(listing => listing.category === 'Jobs');
  if (tab === 'selling') shown = shown.filter(listing => listing.seller.id === viewerId);
  if (tab === 'buying') shown = saved.filter(listing => matchesQuery(q, listing.title, listing.description, listing.location, listing.category));
  const title = category ?? TITLES[tab ?? ''] ?? "Today's picks";
  const places = [...new Set(shown.map(listing => listing.location))].join(' · ') || MARKETPLACE_LOCATION.city;

  return (
    <SecondaryLayout panel={<MarketplacePanel activeCategory={category} activeTab={tab} />}>
      <nav className={styles.tabs} aria-label="Marketplace">
        {[['','Browse'],['jobs','Jobs'],['buying','Buying'],['selling','Selling'],['inbox','Inbox'],['notifications','Notifications'],['status','Status']].map(([id, label]) => (
          <Link key={label} href={id ? `/marketplace?tab=${id}` : '/marketplace'} className={tab === id || (!tab && !id) ? styles.tabOn : styles.tab}>{label}</Link>
        ))}
      </nav>
      <div className={styles.head}>
        <h2 className={styles.headTitle}>{title}</h2>
        {( !tab || tab === 'jobs' || tab === 'buying' || tab === 'selling') && (
          <a className={styles.headLocation} href="#location">
            <PinIcon size={16} />
            {places}
          </a>
        )}
      </div>
      {tab === 'notifications' ? (
        <div className={styles.notes}>
          {notes.filter(note => matchesQuery(q, note.message, note.type)).length === 0 && <div className={styles.empty}>No notifications yet.</div>}
          {notes.filter(note => matchesQuery(q, note.message, note.type)).map(note => (
            <Link key={note.id} href={note.postId ? `/posts/${note.postId}` : '/notifications'} className={styles.note}>{note.message}</Link>
          ))}
        </div>
      ) : tab === 'inbox' ? (
        <div className={styles.notes}>
          {chats.filter(chat => matchesQuery(q, chat.title, chat.lastMessage?.body)).length === 0 && <div className={styles.empty}>No messages yet.</div>}
          {chats.filter(chat => matchesQuery(q, chat.title, chat.lastMessage?.body)).map(chat => (
            <Link key={chat.id} href={`/messages/${chat.id}`} className={styles.note}>
              {chat.title}
              {chat.lastMessage ? ` · ${chat.lastMessage.body}` : ''}
            </Link>
          ))}
        </div>
      ) : tab === 'status' ? (
        <div className={styles.notes}>
          <div className={styles.note}>{mine.length === 1 ? '1 listing' : `${mine.length} listings`} you are selling.</div>
          <div className={styles.note}>{saved.length === 1 ? '1 item' : `${saved.length} items`} you saved.</div>
          <div className={styles.note}>Orders stay on this demo. Nothing is charged.</div>
        </div>
      ) : shown.length === 0 ? (
        <div className={styles.empty}>{tab === 'jobs' ? 'No job listings yet. Create one in the Jobs category.' : `No listings${category ? ` in ${category}` : ''} yet.`}</div>
      ) : (
        <div className={styles.grid}>
          {shown.map(listing => (
            <ListingCard key={listing.id} listing={listing} justListed={Date.now() - new Date(listing.createdAt).getTime() < 36 * 3600 * 1000} />
          ))}
        </div>
      )}
    </SecondaryLayout>
  );
}
