import Image from 'next/image';
import Link from 'next/link';
import type {Photo} from '@/lib/profile-queries';
import styles from './profile.module.css';

export function PhotosCard({photos, userId}: {photos: Photo[]; userId: number}) {
  return (
    <section className={styles.card} aria-labelledby="photos-title">
      <div className={styles.cardHead}>
        <h2 id="photos-title" className={styles.cardTitle}>Photos</h2>
        <Link href={`/profile/${userId}?tab=photos`} className={styles.link}>See all photos</Link>
      </div>
      {photos.length === 0 ? (
        <p className={styles.empty}>No photos to show</p>
      ) : (
        <div className={styles.photoGrid}>
          {photos.slice(0, 9).map(p => (
            <Link key={p.postId} href={`/profile/${userId}?tab=photos`} className={styles.photoTile}>
              <Image src={p.imageUrl} alt="" fill sizes="160px" />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
