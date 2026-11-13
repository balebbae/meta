import type {GpsPoint} from '../turf/engine.ts';

export type StravaStreams = {latlng?: {data?: unknown[]}; time?: {data?: unknown[]}};

export function stravaPoints(startDate: string, streams: StravaStreams): GpsPoint[] {
  const start = Date.parse(startDate);
  if (!Number.isFinite(start)) return [];
  return (streams.latlng?.data ?? []).flatMap((pair, i) => {
    const time = streams.time?.data?.[i];
    if (!Array.isArray(pair) || pair.length !== 2) return [];
    const [lat, lng] = pair;
    if (typeof lat !== 'number' || typeof lng !== 'number' || typeof time !== 'number' ||
      !Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(time) ||
      Math.abs(lat) > 90 || Math.abs(lng) > 180 || time < 0) return [];
    return [{lat, lng, t: start + time * 1000}];
  });
}

export function stravaGameEligible(activity: {start_date: string; sport_type?: string; type?: string}, game: {status: string; startsAt: string | null; endsAt: string | null}, playerStatus: string, now = Date.now()): boolean {
  const start = Date.parse(activity.start_date);
  return ['Run', 'TrailRun', 'Walk', 'Hike'].includes(activity.sport_type ?? activity.type ?? '') &&
    playerStatus === 'accepted' && game.status === 'live' && game.startsAt != null &&
    start >= Date.parse(game.startsAt) && (!game.endsAt || (start < Date.parse(game.endsAt) && now < Date.parse(game.endsAt)));
}
