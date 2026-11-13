import type {Metadata} from 'next';
import {KingdomClient} from '@/components/kingdom/KingdomClient';

export const metadata: Metadata = {title: 'Beta Kingdom · Kaiju', description: 'Soft little heroes, kaijus, ponies and castles, plus four mini games.'};

// Outside the (app) route group on purpose: the gallery needs no session, header or sidebars.
export default function KingdomPage() { return <KingdomClient />; }
