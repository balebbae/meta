import {notFound} from 'next/navigation';
import {ScenePreview} from '@/components/kingdom/ScenePreview';

/** Dev-only: the boss fight and the kingdom board on fixture data, no database or sign-in. 404 in production builds. */
export default function KingdomPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <ScenePreview />;
}
