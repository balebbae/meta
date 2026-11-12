import {PlusIcon} from '@/components/icons';
import styles from './feed.module.css';

export function CreateStoryCard() {
  return (
    <button className={styles.storyCard} aria-label="Create story">
      <span className={styles.storyCardPlus}>
        <PlusIcon size={22} />
      </span>
      <span>
        <span className={styles.storyCardTitle}>Create story</span>
        <span className={styles.storyCardSub}>Share a photo, video or write something</span>
      </span>
    </button>
  );
}
