import {revokeConnection, upsertConnection} from '@/lib/activities/connections';
import {generateDemoWeek} from '@/lib/activities/demo-week';
import {deleteVaultSource, insertVaultEvent} from '@/lib/activities/vault';
import type {Connector, RawEvent} from '@/lib/activities/types';

/** One click seeds a realistic demo week so demos work without devices. Same generator as db/seed.sql. */
export async function seedDemoWeek(userId: number): Promise<RawEvent[]> {
  const events = generateDemoWeek(userId);
  for (const e of events) await insertVaultEvent(e);
  await upsertConnection(userId, 'mock', {status: 'connected', tokens: {last_sync: new Date().toISOString(), device: 'Demo watch'}});
  return events;
}

export const mockConnector: Connector = {
  id: 'mock',
  label: 'Demo watch (mock)',
  platforms: ['ios', 'android', 'web'],
  async connect(userId) {
    await seedDemoWeek(userId);
    return {type: 'connected'};
  },
  async ingest(userId): Promise<RawEvent[]> {
    return seedDemoWeek(userId);
  },
  async disconnect(userId, deleteData) {
    await revokeConnection(userId, 'mock');
    if (deleteData) await deleteVaultSource(userId, 'mock');
  },
};
