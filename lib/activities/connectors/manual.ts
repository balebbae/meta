import {revokeConnection} from '@/lib/activities/connections';
import {deleteVaultSource, insertVaultEvent} from '@/lib/activities/vault';
import type {Connector, EventKind, RawEvent} from '@/lib/activities/types';

export type ManualLog = {kind: EventKind; startedAt?: string; distanceKm?: number; durationMin?: number; steps?: number; note?: string};

export function manualEvent(userId: number, log: ManualLog, trust: 'self_reported' | 'photo' = 'self_reported', source: 'manual' | 'proof_photo' = 'manual'): RawEvent {
  const start = log.startedAt ? new Date(log.startedAt) : new Date();
  const durationMin = log.durationMin && log.durationMin > 0 ? Math.round(log.durationMin) : undefined;
  return {
    userId,
    source,
    externalId: `${source}:${userId}:${start.getTime()}:${Math.random().toString(36).slice(2, 7)}`,
    kind: log.kind,
    startedAt: start.toISOString(),
    endedAt: durationMin ? new Date(start.getTime() + durationMin * 60_000).toISOString() : undefined,
    distanceKm: log.distanceKm && log.distanceKm > 0 ? Math.round(log.distanceKm * 100) / 100 : undefined,
    durationMin,
    steps: log.steps && log.steps > 0 ? Math.round(log.steps) : undefined,
    trust,
    displayScope: 'normal',
    raw: log.note ? {note: log.note.slice(0, 280)} : undefined,
  };
}

export const manualConnector: Connector = {
  id: 'manual',
  label: 'Manual log',
  platforms: ['ios', 'android', 'web'],
  async connect() {
    return {type: 'connected'};
  },
  async ingest(userId, payload): Promise<RawEvent[]> {
    const e = manualEvent(userId, payload as ManualLog);
    await insertVaultEvent(e);
    return [e];
  },
  async disconnect(userId, deleteData) {
    await revokeConnection(userId, 'manual');
    if (deleteData) await deleteVaultSource(userId, 'manual');
  },
};
