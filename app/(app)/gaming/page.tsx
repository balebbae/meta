import type {Metadata} from 'next';
import {GAMES} from '@/lib/secondary-data';
import {PanelDivider, PanelHeader, PanelRow, PanelSearch, SecondaryLayout} from '@/components/pages/SecondaryLayout';
import {GamingContent} from '@/components/pages/GamingContent';
import {CompassIcon, GamepadIcon, PlayIcon} from '@/components/pages/icons';

export const metadata: Metadata = {title: 'Gaming | Facebook'};

export default async function GamingPage({searchParams}: {searchParams: Promise<{tab?: string}>}) {
  const {tab} = await searchParams;
  return (
    <SecondaryLayout
      panel={
        <>
          <PanelHeader title="Gaming" />
          <PanelSearch placeholder="Search games" />
          <PanelRow icon={<PlayIcon />} label="Play" href="/gaming" active={!tab} />
          <PanelRow icon={<GamepadIcon />} label="Your games" href="/gaming?tab=yours" active={tab === 'yours'} />
          <PanelRow icon={<CompassIcon />} label="Browse" href="/gaming?tab=browse" active={tab === 'browse'} />
          <PanelDivider />
        </>
      }>
      <GamingContent games={GAMES} />
    </SecondaryLayout>
  );
}
