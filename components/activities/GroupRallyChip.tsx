'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import styles from './entry.module.css';

/** §3 group header chip: "This group runs a weekly Rally" when a quest has group_id = this group. */
export function GroupRallyChip({groupId}: {groupId: number}) {
  const [quest, setQuest] = useState<{id: number; title: string} | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/activities/groups/${groupId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => !cancelled && d?.hasRally && setQuest(d.quest))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [groupId]);
  if (!quest) return null;
  return (
    <Link href={`/activities/quests/${quest.id}`} className={styles.chip} title={quest.title}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2 2 7l10 5 10-5-10-5zm0 13L4.5 11.3 2 12.5l10 5 10-5-2.5-1.2L12 15z"/></svg>
      This group runs a weekly Rally
    </Link>
  );
}
