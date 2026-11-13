import type {Metadata} from 'next';
import {MetaAiChat} from '@/components/muse/MetaAiChat';

export const metadata: Metadata = {title: 'Meta AI | Facebook'};

export default function Page() {
  return <MetaAiChat />;
}
