'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import type {GpsPoint, LatLng} from '@/lib/turf/engine';
import type {MyOuting} from '@/lib/turf/types';
import {turfApi, type PointsResult} from './api';

const FLUSH_MS = 5000;

/**
 * Live outing tracker: geolocation.watchPosition while the page is open, points batched to the server
 * every 5 s. The position only ever goes to the player's own outing; it is drawn on their own map.
 */
export function useTracker(gameId: number, openOuting: MyOuting | null, onResult: (r: PointsResult) => void) {
  const [outingId, setOutingId] = useState<number | null>(null);
  const [position, setPosition] = useState<LatLng | null>(null);
  const [sent, setSent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const buffer = useRef<GpsPoint[]>([]);
  const watch = useRef<number | null>(null);
  const flushing = useRef(false);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const stopWatch = useCallback(() => {
    if (watch.current != null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null;
  }, []);

  const flush = useCallback(
    async (id: number, finish = false) => {
      if (flushing.current && !finish) return;
      const points = buffer.current.splice(0);
      if (!points.length && !finish) return;
      flushing.current = true;
      try {
        const r = await turfApi.points(gameId, id, points, finish);
        setSent(n => n + points.length);
        onResultRef.current(r);
        if (r.outing.status !== 'open') {
          stopWatch();
          setOutingId(null);
        }
      } catch (e) {
        buffer.current.unshift(...points);
        setError(e instanceof Error ? e.message : 'Could not send your points');
      } finally {
        flushing.current = false;
      }
    },
    [gameId, stopWatch],
  );

  const begin = useCallback(
    (id: number) => {
      if (!('geolocation' in navigator)) {
        setError('This browser has no location access. Upload a GPX file instead.');
        return;
      }
      setOutingId(id);
      setError(null);
      stopWatch();
      watch.current = navigator.geolocation.watchPosition(
        pos => {
          const p = {lat: pos.coords.latitude, lng: pos.coords.longitude};
          setPosition(p);
          // Skip very poor fixes; the engine drops impossible jumps anyway.
          if (pos.coords.accuracy == null || pos.coords.accuracy <= 60) buffer.current.push({...p, t: pos.timestamp || Date.now()});
        },
        err => setError(err.code === err.PERMISSION_DENIED ? 'Location is blocked for this site. Allow it in the browser, or upload a GPX file.' : 'Waiting for a GPS fix…'),
        {enableHighAccuracy: true, maximumAge: 2000, timeout: 20000},
      );
    },
    [stopWatch],
  );

  // Resume an outing left open by a reload.
  const resumeId = openOuting && openOuting.status === 'open' && openOuting.source === 'live' ? openOuting.id : null;
  useEffect(() => {
    if (resumeId != null && outingId == null && watch.current == null) begin(resumeId);
  }, [resumeId, outingId, begin]);

  useEffect(() => {
    if (outingId == null) return;
    const t = setInterval(() => void flush(outingId), FLUSH_MS);
    return () => clearInterval(t);
  }, [outingId, flush]);

  useEffect(() => stopWatch, [stopWatch]);

  const start = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const {outing} = await turfApi.startOuting(gameId);
      setSent(0);
      begin(outing.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the outing');
    } finally {
      setBusy(false);
    }
  }, [gameId, begin]);

  const finish = useCallback(async () => {
    if (outingId == null) return;
    setBusy(true);
    stopWatch();
    await flush(outingId, true);
    setOutingId(null);
    setPosition(null);
    setBusy(false);
  }, [outingId, flush, stopWatch]);

  return {tracking: outingId != null, position, sent, error, busy, start, finish};
}
