import {redirect} from 'next/navigation';
import {getSessionUser} from '@/lib/auth';

export default async function OwnProfilePage() {
  const user = await getSessionUser();
  redirect(user ? `/profile/${user.id}` : '/auth');
}
