import type {Metadata} from 'next';
import {PlaceholderPage} from '@/components/pages/PlaceholderPage';

export const metadata: Metadata = {title: 'Meta AI | Facebook'};

export default function Page() {
  return <PlaceholderPage title="Meta AI" blurb="Meta AI isn't part of this demo yet. Ask your Muse under Activities instead." />;
}
