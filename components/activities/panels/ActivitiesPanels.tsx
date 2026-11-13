'use client';

import {useSearchParams} from 'next/navigation';
import {useEffect} from 'react';
import {IconChevronLeft} from '@tabler/icons-react';
import {Drawer, DrawerHeader} from '@astryxdesign/core/Drawer';
import {VStack} from '@astryxdesign/core/VStack';
import {GoalsPanel} from './GoalsPanel';
import {LogsPanel, VAULT_URL} from './LogsPanel';
import {MentorsPanel} from './MentorsPanel';
import {OnboardingPanel} from './OnboardingPanel';
import {SettingsPanel} from './SettingsPanel';
import type {PanelParams} from '@/lib/activities/panel-href';
import h from '../home/home.module.css';
import {prefetchJson, usePanelNav} from './nav';

const TITLE = {logs: 'Logs', settings: 'Settings', goals: 'Goals', mentors: 'Mentors', onboarding: 'Set up'} as const;
type Panel = keyof typeof TITLE;

/**
 * Everything that used to be its own /activities/* page opens here, over the Activities page: ?panel=logs|settings|goals|mentors|onboarding.
 * Side drawer on desktop, full width on phones. Old URLs redirect to these (see lib/activities/panel-href.ts).
 */
export function ActivitiesPanels({viewerName}: {viewerName: string}) {
  const sp = useSearchParams();
  const {close, update} = usePanelNav();
  // warm the two panels people open most, so their first open paints without a wait
  useEffect(() => {
    const t = window.setTimeout(() => {
      prefetchJson('/api/activities/connections');
      prefetchJson(VAULT_URL);
    }, 1200);
    return () => window.clearTimeout(t);
  }, []);
  const p = sp.get('panel');
  const panel = p && p in TITLE ? (p as Panel) : null;
  // a nested view (one source, one goal, one conversation) steps back to its list; at the top level back = close (phones only, desktop has the X)
  const up: PanelParams | null =
    panel === 'settings' && sp.get('source') ? {source: null, connected: null, imported: null, error: null} : panel === 'goals' && sp.get('goal') ? {goal: null} : panel === 'mentors' && sp.get('request') ? {request: null} : null;
  const back = (
    <button type="button" className={`${h.pill} ${h.pillSm} ${h.pillIcon} ${h.pillOutline} ${up ? '' : h.phoneOnly}`} onClick={() => (up ? update(up) : close())} aria-label="Back" title="Back">
      <IconChevronLeft size={18} aria-hidden />
    </button>
  );
  return (
    <Drawer isOpen={panel != null} onOpenChange={o => !o && close()} side="end" width={560} label={panel ? TITLE[panel] : 'Activities'} experimental={{isFullWidthOnMobile: true}}>
      {panel && (
        <>
          <DrawerHeader title={TITLE[panel]} startContent={back} onOpenChange={() => close()} hasDivider />
          <VStack gap={4} paddingBlock={4}>
            {panel === 'logs' && <LogsPanel tab={sp.get('tab')} />}
            {panel === 'settings' && <SettingsPanel sp={sp} />}
            {panel === 'goals' && <GoalsPanel goalId={sp.get('goal')} />}
            {panel === 'mentors' && <MentorsPanel request={sp.get('request')} offer={sp.get('offer')} />}
            {panel === 'onboarding' && <OnboardingPanel step={sp.get('step')} invite={Number(sp.get('invite')) > 0 ? Number(sp.get('invite')) : null} viewerName={viewerName} />}
          </VStack>
        </>
      )}
    </Drawer>
  );
}
