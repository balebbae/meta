'use client';
import {useEffect, useState} from 'react';
import type {Arena, LatLng} from '@/lib/turf/engine';
import {turfApi, type Zone} from './api';
import styles from './turf.module.css';

/** Privacy zones (§7.4): points inside a zone never become cells, in any game. Only the owner sees them. */
export function PrivacyZones({arena, position}: {arena: Arena; position: LatLng | null}) {
  const [zones, setZones] = useState<Zone[] | null>(null);
  const [label, setLabel] = useState('Home');
  const [coords, setCoords] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    turfApi
      .zones()
      .then(d => setZones(d.zones))
      .catch(() => setZones([]));
  }, []);

  const add = async () => {
    const [lat, lng] = coords.split(',').map(s => Number(s.trim()));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError('Enter a point as "lat, lng".');
      return;
    }
    setError(null);
    try {
      setZones((await turfApi.addZone({label: label.trim() || 'Zone', lat, lng, radiusM: 200})).zones);
      setCoords('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add the zone');
    }
  };

  return (
    <details className={`${styles.panel} ${styles.span}`}>
      <summary className={styles.panelTitle} style={{cursor: 'pointer', marginBottom: 0}}>
        Privacy zones{zones?.length ? ` (${zones.length})` : ''}
      </summary>
      <p className={styles.muted} style={{margin: '8px 0'}}>
        GPS points within 200 m of a zone are dropped before they reach any game. Each zone is saved slightly offset and enlarged so your exact spot can&apos;t be worked out. Only you can see your zones.
      </p>
      {zones?.map(z => (
        <div key={z.id} className={styles.legendRow}>
          <span className={styles.legendName}>
            {z.label}
            <small>
              {z.lat.toFixed(4)}, {z.lng.toFixed(4)} · {z.radiusM} m
            </small>
          </span>
          <button type="button" className={styles.btn} style={{height: 28, fontSize: 13}} onClick={() => void turfApi.removeZone(z.id).then(d => setZones(d.zones))}>
            Remove
          </button>
        </div>
      ))}
      <div className={styles.actions} style={{marginTop: 8}}>
        <div className={styles.row}>
          <input className={styles.input} value={label} onChange={e => setLabel(e.target.value)} aria-label="Zone name" maxLength={40} style={{flex: '0 0 96px'}} />
          <input className={styles.input} value={coords} onChange={e => setCoords(e.target.value)} placeholder={`${arena.center.lat.toFixed(4)}, ${arena.center.lng.toFixed(4)}`} aria-label="Zone centre (lat, lng)" />
        </div>
        <div className={styles.row}>
          <button type="button" className={styles.btn} disabled={!position} title={position ? undefined : 'Available while an outing is tracking'} onClick={() => position && setCoords(`${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`)}>
            Use my position
          </button>
          <button type="button" className={styles.btnPrimary} onClick={() => void add()}>
            Add zone
          </button>
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </details>
  );
}
