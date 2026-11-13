import type {Metadata} from 'next';
import {PlaceholderPage} from '@/components/pages/PlaceholderPage';

export const metadata: Metadata = {title: 'Feeds | Facebook'};

export default function Page() {
  return <PlaceholderPage title="Feeds" blurb="Feeds is coming soon. Your Home feed already shows the latest posts from friends." />;
}
