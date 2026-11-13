'use client';

import {useState} from 'react';
import {Dialog} from '@/components/ui/Dialog';
import {QuestsPanel} from './QuestsPanel';
import styles from './closeness.module.css';

/** Right rail: the Closeness weekly quests, opened in a dialog instead of a nav tab. */
export function WeeklyQuestsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={`${styles.tab} ${styles.tabBlue}`} onClick={() => setOpen(true)} aria-haspopup="dialog">
        Weekly quests
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Closeness" width={548}>
        <QuestsPanel />
      </Dialog>
    </>
  );
}
