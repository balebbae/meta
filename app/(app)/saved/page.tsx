import type {Metadata} from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {getSessionUser} from '@/lib/auth';
import {listSavedListings, listSavedPosts} from '@/lib/secondary-queries';
import {formatPrice} from '@/lib/secondary-data';
import {PanelDivider, PanelHeader, PanelRow, PanelSection, SecondaryLayout} from '@/components/pages/SecondaryLayout';
import {SavedItemCard} from '@/components/pages/SavedItemCard';
import {BookmarkIcon, LockIcon, PlusIcon, SlidersIcon, StoreIcon} from '@/components/pages/icons';
import panel from '@/components/pages/secondary.module.css';
import styles from '@/components/pages/saved.module.css';

export const metadata: Metadata = {title: 'Saved | Facebook'};
export const dynamic = 'force-dynamic';

export default async function SavedPage({searchParams}: {searchParams: Promise<{tab?: string; collection?: string}>}) {
  const {tab, collection} = await searchParams;
  const user = await getSessionUser();
  const viewerId = user?.id ?? 0;
  const [allPosts, listings] = await Promise.all([listSavedPosts(viewerId), listSavedListings(viewerId)]);
  const collections = Array.from(new Set(allPosts.map(p => p.collection)));
  const posts = collection ? allPosts.filter(p => p.collection === collection) : allPosts;
  const showListings = tab === 'marketplace';
  return (
    <SecondaryLayout
      center
      panel={
        <>
          <PanelHeader title="Saved" />
          <PanelRow icon={<BookmarkIcon />} label="Saved Items" href="/saved" active={!showListings && !collection} />
          <PanelRow icon={<StoreIcon />} label="Marketplace listings" href="/saved?tab=marketplace" active={showListings} />
          <PanelDivider />
          <PanelSection title="My collections" />
          {collections.map(c => (
            <Link key={c} href={`/saved?collection=${encodeURIComponent(c)}`} className={styles.collectionRow} aria-current={collection === c ? 'page' : undefined}>
              <span className={styles.collectionTile}>{c[0]}</span>
              <span>
                <span className={styles.collectionName}>{c}</span>
                <span className={styles.collectionPriv}>
                  <LockIcon size={10} /> Only me
                </span>
              </span>
            </Link>
          ))}
          <button type="button" className={panel.panelButton}>
            <PlusIcon size={16} />
            Create new collection
          </button>
        </>
      }>
      <div className={styles.list}>
        <div className={styles.headRow}>
          <h2 className={styles.head}>{showListings ? 'Saved listings' : (collection ?? 'All')}</h2>
          <button type="button" className={styles.filterBtn} aria-label="Filter">
            <SlidersIcon />
          </button>
        </div>
        {showListings ? (
          listings.length === 0 ? (
            <div className={styles.empty}>No saved listings yet.</div>
          ) : (
            listings.map(l => (
              <Link key={l.id} href={`/marketplace/item/${l.id}`} className={styles.item} style={{color: 'inherit'}}>
                <div className={styles.thumb}>
                  <Image src={l.imageUrl} alt="" fill sizes="150px" />
                </div>
                <div className={styles.itemBody}>
                  <div className={styles.itemTitle}>{l.title}</div>
                  <div className={styles.itemMeta}>
                    {formatPrice(l.priceCents)} · {l.location}
                  </div>
                </div>
              </Link>
            ))
          )
        ) : posts.length === 0 ? (
          <div className={styles.empty}>Nothing saved yet. Save posts to see them here.</div>
        ) : (
          posts.map(item => <SavedItemCard key={item.id} item={item} />)
        )}
      </div>
    </SecondaryLayout>
  );
}
