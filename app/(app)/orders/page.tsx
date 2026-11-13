import type {Metadata} from 'next';
import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getSessionUser} from '@/lib/auth';
import {listListings, listSavedListings} from '@/lib/secondary-queries';
import styles from '@/components/pages/simple.module.css';

export const metadata: Metadata = {title: 'Orders and payments | Facebook'};
export const dynamic = 'force-dynamic';

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function OrdersPage() {
  const user = await getSessionUser();
  if (!user) redirect('/auth');
  const [listings, saved] = await Promise.all([listListings(user.id), listSavedListings(user.id)]);
  const mine = listings.filter(listing => listing.seller.id === user.id);
  return (
    <div className={styles.page}>
      <section className={styles.card}>
        <h1 className={styles.title}>Orders and payments</h1>
        <p className={styles.sub}>Your marketplace listings and items you saved. This demo does not charge a card.</p>
        <h2 className={styles.title} style={{fontSize: 20}}>Your listings</h2>
        {mine.length === 0 && <p className={styles.sub}>You have no listings.</p>}
        {mine.map(listing => (
          <Link key={listing.id} href={`/marketplace/item/${listing.id}`} className={styles.row}>
            <span>{listing.title}<span className={styles.hint}>{money(listing.priceCents)}</span></span>
          </Link>
        ))}
        <h2 className={styles.title} style={{fontSize: 20, marginTop: 16}}>Saved</h2>
        {saved.length === 0 && <p className={styles.sub}>No saved items.</p>}
        {saved.map(listing => (
          <Link key={listing.id} href={`/marketplace/item/${listing.id}`} className={styles.row}>
            <span>{listing.title}<span className={styles.hint}>{money(listing.priceCents)} · {listing.seller.name}</span></span>
          </Link>
        ))}
      </section>
    </div>
  );
}
