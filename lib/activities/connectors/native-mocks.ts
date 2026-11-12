import {revokeConnection} from '@/lib/activities/connections';
import {deleteVaultSource} from '@/lib/activities/vault';
import type {Connector, ConnectorId, Platform, RawEvent} from '@/lib/activities/types';

/** Sources that need the native Facebook app (Health Connect, phone pedometer) or a paused program (Garmin). */
export function makeNativeMock(id: ConnectorId, label: string, platforms: Platform[], reason: string): Connector {
  return {
    id,
    label,
    platforms,
    async connect() {
      return {type: 'unavailable', reason};
    },
    async ingest(): Promise<RawEvent[]> {
      return [];
    },
    async disconnect(userId, deleteData) {
      await revokeConnection(userId, id);
      if (deleteData) await deleteVaultSource(userId, id);
    },
  };
}

export const healthConnectConnector = makeNativeMock('health_connect', 'Health Connect', ['android'], 'Health Connect is an on-device store with no server endpoint. It arrives with the native Facebook Android app. Until then, use Google Health, Strava, WHOOP, Photo Proof or a manual log.');
export const phoneStepsConnector = makeNativeMock('phone_steps', 'Phone steps', ['ios', 'android'], 'A web app cannot read the pedometer in the background. Needs the native app; on iPhone the Apple Health Shortcut sends steps today.');
export const garminConnector = makeNativeMock('garmin', 'Garmin', ['ios', 'android', 'web'], 'Garmin paused new Connect Developer applications (Sept 2026). Sync Garmin into Apple Health or Health Connect instead.');
