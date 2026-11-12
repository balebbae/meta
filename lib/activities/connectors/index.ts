import type {Connector, ConnectorId, Platform} from '@/lib/activities/types';
import {appleHealthConnector} from './apple_health';
import {whoopConnector, whoopConfigured} from './whoop';
import {stravaConnector, stravaConfigured} from './strava';
import {GOOGLE_HEALTH, OURA, makeOAuthStub, oauthConfigured} from './oauth-stubs';
import {garminConnector, healthConnectConnector, phoneStepsConnector} from './native-mocks';
import {manualConnector} from './manual';
import {mockConnector} from './mock';

export const ouraConnector = makeOAuthStub(OURA);
export const googleHealthConnector = makeOAuthStub(GOOGLE_HEALTH);

const REGISTRY: Partial<Record<ConnectorId, Connector>> = {
  apple_health: appleHealthConnector,
  health_connect: healthConnectConnector,
  google_health: googleHealthConnector,
  strava: stravaConnector,
  oura: ouraConnector,
  whoop: whoopConnector,
  garmin: garminConnector,
  phone_steps: phoneStepsConnector,
  manual: manualConnector,
  mock: mockConnector,
};

export function getConnector(id: string): Connector | null {
  return REGISTRY[id as ConnectorId] ?? null;
}

export type ConnectorMode = 'oauth' | 'shortcut' | 'native' | 'demo' | 'builtin';
export type ConnectorAvailability = 'ready' | 'not_configured' | 'needs_native' | 'other_platform';

export type ConnectorCard = {
  id: ConnectorId;
  label: string;
  tagline: string;
  mode: ConnectorMode;
  platforms: Platform[];
  availability: ConnectorAvailability;
  /** Shown when the source can't connect here: the other route (§4 step 3). */
  otherRoute: string | null;
  trust: 'verified' | 'device' | 'photo' | 'self_reported';
  ownerOnly: boolean;
};

const META: Record<ConnectorId, Omit<ConnectorCard, 'id' | 'availability' | 'platforms'>> = {
  apple_health: {label: 'Apple Health', tagline: 'Apple Watch, iPhone workouts and steps', mode: 'shortcut', otherRoute: 'Open this page on your iPhone to install the Shortcut, or upload export.zip from the Health app.', trust: 'device', ownerOnly: false},
  health_connect: {label: 'Health Connect', tagline: 'Samsung Health, Pixel Watch, Fitbit on Android', mode: 'native', otherRoute: 'Needs the native Facebook Android app. Use Google Health, Strava or WHOOP from the web.', trust: 'device', ownerOnly: false},
  google_health: {label: 'Google Health', tagline: 'Fitbit and Pixel Watch via Google OAuth', mode: 'oauth', otherRoute: null, trust: 'device', ownerOnly: false},
  strava: {label: 'Strava', tagline: 'Runs and rides. Shown only to you (Strava policy).', mode: 'oauth', otherRoute: null, trust: 'device', ownerOnly: true},
  oura: {label: 'Oura', tagline: 'Sleep, readiness and workouts', mode: 'oauth', otherRoute: null, trust: 'device', ownerOnly: false},
  whoop: {label: 'WHOOP', tagline: 'Verified workouts, strain and recovery', mode: 'oauth', otherRoute: null, trust: 'verified', ownerOnly: false},
  garmin: {label: 'Garmin', tagline: 'Sync through Apple Health or Health Connect', mode: 'native', otherRoute: 'Garmin paused new API apps. Sync Garmin into Apple Health or Health Connect instead.', trust: 'device', ownerOnly: false},
  aggregator: {label: 'Aggregator', tagline: 'Terra / Junction / Spike', mode: 'native', otherRoute: 'Not for the hackathon.', trust: 'device', ownerOnly: false},
  phone_steps: {label: 'Phone steps', tagline: 'Your phone already counts steps', mode: 'native', otherRoute: 'A web app cannot read the pedometer. On iPhone the Apple Health Shortcut sends steps today.', trust: 'device', ownerOnly: false},
  proof_photo: {label: 'Photo Proof', tagline: 'Snap a treadmill, watch or race bib', mode: 'builtin', otherRoute: null, trust: 'photo', ownerOnly: false},
  manual: {label: 'Manual log', tagline: 'Quick form or one sentence', mode: 'builtin', otherRoute: null, trust: 'self_reported', ownerOnly: false},
  mock: {label: 'Demo watch', tagline: 'Seeds a realistic week so you can try everything', mode: 'demo', otherRoute: null, trust: 'device', ownerOnly: false},
};

export function detectPlatform(userAgent: string | null | undefined): Platform {
  const ua = (userAgent ?? '').toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'web';
}

function availability(id: ConnectorId, platform: Platform): ConnectorAvailability {
  switch (id) {
    case 'whoop':
      return whoopConfigured() ? 'ready' : 'not_configured';
    case 'strava':
      return stravaConfigured() ? 'ready' : 'not_configured';
    case 'oura':
      return oauthConfigured(OURA) ? 'ready' : 'not_configured';
    case 'google_health':
      return oauthConfigured(GOOGLE_HEALTH) ? 'ready' : 'not_configured';
    case 'apple_health':
      return platform === 'ios' ? 'ready' : 'other_platform';
    case 'health_connect':
    case 'phone_steps':
    case 'garmin':
    case 'aggregator':
      return 'needs_native';
    default:
      return 'ready';
  }
}

/** Hub order (§4 step 3): the platform's health store first, then cloud wearables, then no-device paths. */
export function listConnectorCards(platform: Platform): ConnectorCard[] {
  const order: ConnectorId[] =
    platform === 'ios'
      ? ['apple_health', 'whoop', 'strava', 'oura', 'google_health', 'garmin', 'health_connect', 'phone_steps', 'proof_photo', 'manual', 'mock']
      : platform === 'android'
        ? ['health_connect', 'google_health', 'whoop', 'strava', 'oura', 'garmin', 'apple_health', 'phone_steps', 'proof_photo', 'manual', 'mock']
        : ['whoop', 'strava', 'oura', 'google_health', 'apple_health', 'health_connect', 'garmin', 'phone_steps', 'proof_photo', 'manual', 'mock'];
  return order.map(id => ({id, platforms: REGISTRY[id]?.platforms ?? ['ios', 'android', 'web'], availability: availability(id, platform), ...META[id]}));
}

export function connectorMeta(id: ConnectorId) {
  return META[id];
}
