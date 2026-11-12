'use client';

import {useCallback} from 'react';
import {NotificationsPanel} from '@/components/layout/NotificationsPanel';
import styles from './notifications.module.css';

export default function NotificationsPage() {
  const noop = useCallback(() => {}, []);
  return (
    <div data-layout="wide" className={styles.page}>
      <div className={styles.card}>
        <NotificationsPanel open onUnread={noop} />
      </div>
    </div>
  );
}
