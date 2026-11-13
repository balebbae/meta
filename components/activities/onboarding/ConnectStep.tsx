'use client';
import {StepShell} from './StepShell';
import type {PublicConnection} from '../ConnectorHub';
import {SourceList} from '../panels/SourceList';
import type {ConnectorCard} from '@/lib/activities/connectors';

export function ConnectStep({cards, connections, invite, onChanged}: {cards: ConnectorCard[]; connections: PublicConnection[]; invite: number | null; onChanged?: () => void}) {
  return (
    <StepShell step="connect" invite={invite}>
      <SourceList cards={cards} connections={connections} onChanged={onChanged} />
    </StepShell>
  );
}
