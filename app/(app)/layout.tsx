import {Header} from '@/components/layout/Header';
import {LeftSidebar} from '@/components/layout/LeftSidebar';
import {RightSidebar} from '@/components/layout/RightSidebar';
import {getSessionUser} from '@/lib/auth';
import {redirect} from 'next/navigation';

export default async function AppLayout({children}: {children: React.ReactNode}) {
  const user = await getSessionUser();
  if (!user) redirect('/auth');
  return (
    <>
      <Header user={user} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'var(--fb-sidebar-w) minmax(0, 1fr) var(--fb-sidebar-w)',
          paddingTop: 'var(--fb-header-h)',
          minHeight: '100vh',
        }}>
        <LeftSidebar user={user} />
        <main style={{display: 'flex', justifyContent: 'center', minWidth: 0}}>{children}</main>
        <RightSidebar user={user} />
      </div>
    </>
  );
}
