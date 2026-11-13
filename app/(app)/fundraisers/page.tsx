import type {Metadata} from 'next';
import {PlaceholderPage} from '@/components/pages/PlaceholderPage';

export const metadata: Metadata = {title: 'Fundraisers | Facebook'};

export default function Page() {
  return <PlaceholderPage title="Fundraisers" blurb="Fundraisers aren't part of this demo yet." />;
}
