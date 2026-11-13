import type {Metadata} from 'next';
import {getSessionUser} from '@/lib/auth';
import {listListings} from '@/lib/secondary-queries';
import {MARKETPLACE_LOCATION} from '@/lib/secondary-data';
import {SecondaryLayout} from '@/components/pages/SecondaryLayout';
import {MarketplacePanel} from '@/components/pages/MarketplacePanel';
import {ListingCard} from '@/components/pages/ListingCard';
import {PinIcon} from '@/components/pages/icons';
import styles from '@/components/pages/marketplace.module.css';

export const metadata: Metadata = {title: 'Marketplace | Facebook'};
export const dynamic = 'force-dynamic';

export default async function MarketplacePage({searchParams}: {searchParams: Promise<{category?: string}>}) {
  const {category} = await searchParams;
  const user = await getSessionUser();
  const listings = await listListings(user?.id ?? 0, category);
  return (
    <SecondaryLayout panel={<MarketplacePanel activeCategory={category} />}>
      <div className={styles.head}>
        <h2 className={styles.headTitle}>{category ?? "Today's picks"}</h2>
        <a className={styles.headLocation} href="#location">
          <PinIcon size={16} />
          {[...new Set(listings.map(listing => listing.location))].join(' · ') || MARKETPLACE_LOCATION.city}
        </a>
      </div>
      {listings.length === 0 ? (
        <div className={styles.empty}>No listings in {category} yet.</div>
      ) : (
        <div className={styles.grid}>
          {listings.map(l => (
            <ListingCard key={l.id} listing={l} justListed={Date.now() - new Date(l.createdAt).getTime() < 36 * 3600 * 1000} />
          ))}
        </div>
      )}
    </SecondaryLayout>
  );
}
