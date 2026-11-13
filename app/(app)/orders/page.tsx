import type {Metadata} from 'next';
import {PlaceholderPage} from '@/components/pages/PlaceholderPage';

export const metadata: Metadata = {title: 'Orders and payments | Facebook'};

export default function Page() {
  return <PlaceholderPage title="Orders and payments" blurb="Orders and payments aren't part of this demo." />;
}
