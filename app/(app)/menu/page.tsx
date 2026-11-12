import {redirect} from 'next/navigation';
import {MobileMenu} from '@/components/mobile/MobileMenu';
import {getSessionUser} from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function MenuPage() {
  const user = await getSessionUser();
  if (!user) redirect('/auth');
  return <MobileMenu user={user} />;
}
