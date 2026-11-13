import type {Metadata} from 'next';
import {KingdomClient} from '@/components/kingdom/KingdomClient';

export const metadata: Metadata = {title: 'Beta Kingdom · Kaiju', description: 'Cute voxel heroes, creatures and castles, plus four mini games.'};

// Outside the (app) route group on purpose: the gallery needs no session, header or sidebars.
export default function KingdomPage() { return <KingdomClient />; }
