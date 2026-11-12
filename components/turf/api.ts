'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import type {GpsPoint} from '@/lib/turf/engine';
import type {MyOuting, TurfState} from '@/lib/turf/types';

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {credentials: 'same-origin', ...init});
  const data = (await res.json().catch(() => ({}))) as T & {error?: string};
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}
const post = (body?: unknown, method = 'POST'): RequestInit => ({method, headers: {'content-type': 'application/json'}, body: JSON.stringify(body ?? {})});

export type PointsResult = {outing: MyOuting; gained: number; cut: boolean; recap: string | null; state?: TurfState};
export type Zone = {id: number; label: string; lat: number; lng: number; radiusM: number};
export type CreateBody = {type: 'turf'; conversationId: number; settings: {center: {lat: number; lng: number}; radiusKm: number; lengthDays: number; arenaLabel: string}; invitees: number[] | 'all'};

export const turfApi = {
  state: (id: number) => call<TurfState>(`/api/games/${id}/state`, {cache: 'no-store'}),
  create: (body: CreateBody) => call<{id: number; state: TurfState}>('/api/games', post(body)),
  respond: (id: number, status: 'accepted' | 'declined', locationConsent = false) => call<TurfState>(`/api/games/${id}/invites/respond`, post({status, locationConsent})),
  resend: (id: number) => call<{sent: number; state: TurfState}>(`/api/games/${id}/invites/resend`, post()),
  start: (id: number) => call<TurfState>(`/api/games/${id}/start`, post()),
  leave: (id: number) => call<TurfState>(`/api/games/${id}/leave`, post()),
  startOuting: (id: number) => call<{outing: MyOuting}>(`/api/games/${id}/outings`, post()),
  points: (id: number, outingId: number, points: GpsPoint[], finish = false) => call<PointsResult>(`/api/games/${id}/outings/${outingId}`, post({points, finish}, 'PATCH')),
  gpx: (id: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return call<PointsResult>(`/api/games/${id}/gpx`, {method: 'POST', body: form});
  },
  replay: (gameId: number, script: 'priya_loop' | 'sarah_cut' | 'reset') => call<Partial<PointsResult> & {state: TurfState}>('/api/demo/turf-replay', post({gameId, script})),
  zones: () => call<{zones: Zone[]}>('/api/turf/zones'),
  addZone: (z: {label: string; lat: number; lng: number; radiusM: number}) => call<{zones: Zone[]}>('/api/turf/zones', post(z)),
  removeZone: (id: number) => call<{zones: Zone[]}>(`/api/turf/zones?id=${id}`, {method: 'DELETE'}),
};

/** Polls the game state (cells, owners, scores, players) while mounted and the tab is visible. */
export function useTurfState(gameId: number, intervalMs = 3000, initial: TurfState | null = null) {
  const [state, setState] = useState<TurfState | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  const refresh = useCallback(async () => {
    try {
      const s = await turfApi.state(gameId);
      if (alive.current) {
        setState(s);
        setError(null);
      }
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : 'Could not load the game');
    }
  }, [gameId]);
  useEffect(() => {
    alive.current = true;
    void refresh();
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, intervalMs);
    return () => {
      alive.current = false;
      clearInterval(t);
    };
  }, [refresh, intervalMs]);
  return {state, setState, error, refresh};
}

export function timeLeft(endsAt: string | null, now = Date.now()): string {
  if (!endsAt) return '';
  const ms = new Date(endsAt).getTime() - now;
  if (ms <= 0) return 'Ended';
  const m = Math.floor(ms / 60_000);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m % 60}m left`;
  return `${Math.max(1, m)}m left`;
}

export function endsLabel(endsAt: string | null): string {
  if (!endsAt) return '';
  return new Date(endsAt).toLocaleString([], {weekday: 'short', hour: 'numeric', minute: '2-digit'});
}
