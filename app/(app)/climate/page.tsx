import type {Metadata} from 'next';
import {PlaceholderPage} from '@/components/pages/PlaceholderPage';

export const metadata: Metadata = {title: 'Climate Science Center | Facebook'};

export default function Page() {
  return <PlaceholderPage title="Climate Science Center" blurb="The Climate Science Center isn't part of this demo." />;
}
