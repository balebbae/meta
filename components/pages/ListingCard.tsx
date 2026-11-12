import Image from 'next/image';
import Link from 'next/link';
import type {Listing} from '@/lib/secondary-queries';
import {formatPrice} from '@/lib/secondary-data';
import styles from './marketplace.module.css';

export function ListingCard({listing, justListed}: {listing: Listing; justListed?: boolean}) {
  return (
    <Link href={`/marketplace/item/${listing.id}`} className={styles.card}>
      <div className={styles.cardImage}>
        <Image src={listing.imageUrl} alt={listing.title} fill sizes="(max-width: 900px) 50vw, 240px" />
        {justListed && <span className={styles.badge}>Just listed</span>}
      </div>
      <div className={styles.cardBody}>
        <div className={styles.price}>{formatPrice(listing.priceCents)}</div>
        <div className={styles.title}>{listing.title}</div>
        <div className={styles.loc}>{listing.location}</div>
      </div>
    </Link>
  );
}
