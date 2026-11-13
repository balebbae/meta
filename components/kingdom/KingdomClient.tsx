'use client';
import dynamic from 'next/dynamic';
import styles from './kingdom.module.css';

const Gallery = dynamic(() => import('./Gallery').then((m) => m.Gallery), {ssr: false, loading: () => <div className={styles.boot} role="status">Raising the castle…</div>});

export function KingdomClient() { return <Gallery />; }
