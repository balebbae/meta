import type {Metadata} from 'next';
import {GAMES} from '@/lib/secondary-data';
import {PanelDivider, PanelHeader, PanelRow, SecondaryLayout} from '@/components/pages/SecondaryLayout';
import {GamingContent} from '@/components/pages/GamingContent';
import {BellIcon, ChevronUpIcon, CompassIcon, HistoryIcon, PeopleIcon, PlayIcon, VideoCamIcon} from '@/components/pages/icons';
import panel from '@/components/pages/secondary.module.css';

export const metadata: Metadata = {title: 'Gaming | Facebook'};

export default async function GamingPage({searchParams}: {searchParams: Promise<{tab?: string}>}) {
  const {tab} = await searchParams;
  return (
    <SecondaryLayout
      panel={
        <>
          <PanelHeader title="Games" />
          <PanelRow icon={<PlayIcon />} label="Video" href="/gaming" active={!tab} trailing={<span style={{color: 'var(--fb-text-secondary)', display: 'inline-flex'}}><ChevronUpIcon /></span>} />
          <div style={{paddingLeft: 16}}>
            <PanelRow icon={<PeopleIcon size={20} />} label="Following" href="/gaming?tab=following" active={tab === 'following'} />
            <PanelRow icon={<CompassIcon size={20} />} label="Browse" href="/gaming?tab=browse" active={tab === 'browse'} />
            <PanelRow icon={<HistoryIcon size={20} />} label="Recently watched" href="/gaming?tab=recent" active={tab === 'recent'} />
          </div>
          <PanelRow icon={<BellIcon />} label="Notifications" href="/gaming?tab=notifications" active={tab === 'notifications'} />
          <PanelDivider />
          <button type="button" className={panel.panelButtonSecondary}>
            <VideoCamIcon size={16} />
            Start streaming
          </button>
          <PanelDivider />
        </>
      }>
      <GamingContent games={GAMES} />
    </SecondaryLayout>
  );
}
