import Image from 'next/image';
import type {Photo} from '@/lib/profile-queries';
import styles from './profile.module.css';

export function PhotosTab({photos, isOwn}: {photos: Photo[]; isOwn: boolean}) {
  return (
    <section className={styles.card} aria-label="Photos">
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle}>Photos</h2>
        {isOwn && <button type="button" className="fb-btn-secondary">Add photos/video</button>}
      </div>
      <div className={styles.friendsSubTabs}>
        {['Your photos', 'Albums'].map((t, i) => (
          <button key={t} type="button" className={`${styles.friendsSubTab} ${i === 0 ? styles.friendsSubTabActive : ''}`}>{isOwn || i === 1 ? t : 'Photos'}</button>
        ))}
      </div>
      {photos.length === 0 ? (
        <p className={styles.empty}>No photos to show</p>
      ) : (
        <div className={styles.photosTabGrid}>
          {photos.map(p => (
            <div key={p.postId} className={styles.photoTile} style={{borderRadius: 8}}>
              <Image src={p.imageUrl} alt="" fill sizes="(max-width: 900px) 33vw, 200px" />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
