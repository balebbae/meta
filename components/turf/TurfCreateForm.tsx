'use client';
import {useRouter} from 'next/navigation';
import {useEffect, useState} from 'react';
import type {Conversation} from '@/lib/messaging-types';
import {KATY_TRAIL} from '@/lib/turf/fixtures';
import {HexMap} from './HexMap';
import {turfApi} from './api';
import styles from './turf.module.css';

type Member = {id: number; name: string; avatarUrl: string};
const RADII = [0.5, 1, 1.5, 2];
const LENGTHS = [1, 3, 7];

/** Create a Turf game for a chat: arena centre (tap the mini map, type lat/lng, or use your location), radius, length, invitees. */
export function TurfCreateForm({conversationId, viewerId, onCreated}: {conversationId: number; viewerId?: number; onCreated?: (gameId: number) => void}) {
  const router = useRouter();
  const [label, setLabel] = useState('Katy Trail');
  const [lat, setLat] = useState(String(KATY_TRAIL.lat));
  const [lng, setLng] = useState(String(KATY_TRAIL.lng));
  const [radiusKm, setRadiusKm] = useState(1.5);
  const [lengthDays, setLengthDays] = useState(3);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/conversations/${conversationId}`)
      .then(r => r.json())
      .then((d: {conversation?: Conversation}) => {
        if (!alive) return;
        const others = (d.conversation?.members ?? []).filter(m => m.id !== viewerId).map(m => ({id: m.id, name: m.name, avatarUrl: m.avatarUrl}));
        setMembers(others);
        setPicked(new Set(others.map(m => m.id)));
      })
      .catch(() => alive && setMembers([]));
    return () => {
      alive = false;
    };
  }, [conversationId, viewerId]);

  const center = {lat: Number(lat), lng: Number(lng)};
  const valid = Number.isFinite(center.lat) && Number.isFinite(center.lng) && Math.abs(center.lat) <= 85 && Math.abs(center.lng) <= 180 && lat.trim() !== '' && lng.trim() !== '';
  const setCenter = (p: {lat: number; lng: number}, name?: string) => {
    setLat(p.lat.toFixed(5));
    setLng(p.lng.toFixed(5));
    if (name) setLabel(name);
  };
  const locate = () => {
    if (!('geolocation' in navigator)) return setError('This browser has no location access. Type a lat/lng instead.');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setError(null);
        setCenter({lat: pos.coords.latitude, lng: pos.coords.longitude}, label === 'Katy Trail' ? 'My neighborhood' : undefined);
      },
      () => setError('Location is blocked for this site. Type a lat/lng instead.'),
      {enableHighAccuracy: true, timeout: 10000},
    );
  };
  const toggle = (id: number) =>
    setPicked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const {id} = await turfApi.create({type: 'turf', conversationId, settings: {center, radiusKm, lengthDays, arenaLabel: label.trim() || 'Turf'}, invitees: [...picked]});
      onCreated?.(id);
      router.push(`/games/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the game');
      setBusy(false);
    }
  };

  return (
    <div className={styles.form}>
      <div className={styles.formGrid}>
        <div>
          <div className={styles.pickMap}>{valid && <HexMap arena={{center, radiusKm}} grid="preview" onPick={p => setCenter(p)} label="Arena preview. Tap to move the centre." />}</div>
          <p className={styles.muted} style={{textAlign: 'center', marginTop: 4}}>
            Tap the map to move the centre
          </p>
        </div>
        <div className={styles.actions}>
          <label className={styles.field}>
            Arena name
            <input className={styles.input} value={label} maxLength={60} onChange={e => setLabel(e.target.value)} />
          </label>
          <div className={styles.row}>
            <label className={styles.field}>
              Latitude
              <input className={styles.input} inputMode="decimal" value={lat} onChange={e => setLat(e.target.value)} />
            </label>
            <label className={styles.field}>
              Longitude
              <input className={styles.input} inputMode="decimal" value={lng} onChange={e => setLng(e.target.value)} />
            </label>
          </div>
          <div className={styles.seg}>
            <button type="button" className={styles.segBtn} onClick={() => setCenter(KATY_TRAIL, 'Katy Trail')}>
              Katy Trail, Dallas
            </button>
            <button type="button" className={styles.segBtn} onClick={locate}>
              Use my location
            </button>
          </div>
        </div>
      </div>
      <div className={styles.field}>
        Arena radius
        <div className={styles.seg} role="radiogroup" aria-label="Arena radius">
          {RADII.map(r => (
            <button key={r} type="button" role="radio" aria-checked={radiusKm === r} className={radiusKm === r ? styles.segOn : styles.segBtn} onClick={() => setRadiusKm(r)}>
              {r} km
            </button>
          ))}
        </div>
      </div>
      <div className={styles.field}>
        Length
        <div className={styles.seg} role="radiogroup" aria-label="Game length">
          {LENGTHS.map(d => (
            <button key={d} type="button" role="radio" aria-checked={lengthDays === d} className={lengthDays === d ? styles.segOn : styles.segBtn} onClick={() => setLengthDays(d)}>
              {d} day{d === 1 ? '' : 's'}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.field}>
        Invite
        {members == null && <span className={styles.muted}>Loading the chat…</span>}
        {members?.length === 0 && <span className={styles.muted}>Nobody else is in this chat.</span>}
        {members?.map(m => (
          <label key={m.id} className={styles.invitee}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.avatarUrl} alt="" />
            <span>{m.name}</span>
            <input type="checkbox" checked={picked.has(m.id)} onChange={() => toggle(m.id)} />
          </label>
        ))}
      </div>
      <p className={styles.muted}>Each invitee chooses whether to share location for this game. Players only ever see cells, never routes or live positions.</p>
      {error && <p className={styles.error}>{error}</p>}
      <button type="button" className={styles.btnPrimary} disabled={busy || !valid || picked.size === 0} onClick={() => void create()}>
        {busy ? 'Creating…' : `Create game and invite ${picked.size || ''}`.trim()}
      </button>
    </div>
  );
}
