'use client';
import {ComposeIcon} from '@/components/icons';
import {Tooltip} from '@/components/ui/Tooltip';
import styles from './layout.module.css';

export const COMPOSE_EVENT = 'fb:compose';

export function ComposeFab() {
  return (
    <Tooltip label="Create post" position="top">
      <button
        className={styles.fab}
        aria-label="Create post"
        onClick={() => {
          window.scrollTo({top: 0, behavior: 'smooth'});
          window.dispatchEvent(new CustomEvent(COMPOSE_EVENT));
        }}>
        <ComposeIcon size={22} />
      </button>
    </Tooltip>
  );
}
