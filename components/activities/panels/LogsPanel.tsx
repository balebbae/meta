'use client';

import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {IconCamera, IconDownload, IconMicrophone, IconPlus} from '@tabler/icons-react';
import type {VaultEvent} from '@/lib/activities/vault';
import h from '../home/home.module.css';
import {LogWorkoutSheet, type LogTab} from '../LogWorkoutSheet';
import {VaultList} from '../VaultList';
import {useJson, usePanelNav} from './nav';
import p from './panels.module.css';

export const VAULT_URL = '/api/activities/vault?limit=500&all=1';

/** Logs panel: every workout in your vault (all sources, filter + delete), plus manual / photo / voice logging. Replaces /activities/log and the Muse page's vault. */
export function LogsPanel({tab}: {tab: string | null}) {
  const router = useRouter();
  const {open} = usePanelNav();
  const [sheet, setSheet] = useState<LogTab | null>(tab === 'manual' || tab === 'photo' || tab === 'voice' ? tab : null);
  const {data, error, reload} = useJson<{events: VaultEvent[]}>(VAULT_URL);
  const pill = `${h.pill} ${h.pillSm}`;
  return (
    <div className={p.stack}>
      <div className={p.actions}>
        <button type="button" className={`${pill} ${h.pillBlue}`} onClick={() => setSheet('manual')}>
          <IconPlus size={16} aria-hidden /> Log
        </button>
        <button type="button" className={`${pill} ${h.pillOutline}`} onClick={() => setSheet('photo')}>
          <IconCamera size={16} aria-hidden /> Photo
        </button>
        <button type="button" className={`${pill} ${h.pillOutline}`} onClick={() => setSheet('voice')}>
          <IconMicrophone size={16} aria-hidden /> Voice
        </button>
        <button type="button" className={`${pill} ${h.pillOutline}`} onClick={() => open({panel: 'settings', tab: 'sources'})}>
          <IconDownload size={16} aria-hidden /> Import
        </button>
      </div>
      {data ? <VaultList events={data.events} onChanged={reload} /> : error ? <p className={p.error}>{error}</p> : <p className={p.note}>Loading…</p>}
      <LogWorkoutSheet
        open={sheet != null}
        initialTab={sheet ?? 'manual'}
        onClose={() => setSheet(null)}
        onLogged={() => {
          reload();
          router.refresh();
        }}
      />
    </div>
  );
}
