/** Human names for vault sources; shared by server pages and client lists (no db import here). */
export const SOURCE_LABEL: Record<string, string> = {
  apple_health: 'Apple Health',
  health_connect: 'Health Connect',
  google_health: 'Google Health',
  strava: 'Strava',
  oura: 'Oura',
  whoop: 'WHOOP',
  garmin: 'Garmin',
  phone_steps: 'Phone steps',
  proof_photo: 'Photo proof',
  manual: 'Manual',
  mock: 'Demo watch',
  aggregator: 'Aggregator',
};

export function sourceLabel(s: string): string {
  return SOURCE_LABEL[s] ?? s.replace(/_/g, ' ');
}
