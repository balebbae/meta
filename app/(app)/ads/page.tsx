import type {Metadata} from 'next';
import {PlaceholderPage} from '@/components/pages/PlaceholderPage';

export const metadata: Metadata = {title: 'Ads Manager | Facebook'};

export default function Page() {
  return <PlaceholderPage title="Ads Manager" blurb="Ads Manager isn't part of this demo." />;
}
