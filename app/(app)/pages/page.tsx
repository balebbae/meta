import type {Metadata} from 'next';
import {PlaceholderPage} from '@/components/pages/PlaceholderPage';

export const metadata: Metadata = {title: 'Pages | Facebook'};

export default function Page() {
  return <PlaceholderPage title="Pages" blurb="Pages isn't part of this demo yet." />;
}
