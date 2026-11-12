import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getSessionUser} from '@/lib/auth';
import {RegForm} from '@/components/auth/RegForm';
import {AuthFooter} from '@/components/auth/AuthFooter';
import {BackChevron, MetaWordmark} from '@/components/auth/logos';
import styles from '@/components/auth/auth.module.css';

export const metadata = {title: 'Sign up for Facebook'};

/** Clone of facebook.com/reg ("Create new account" on the login page links here). */
export default async function RegPage() {
  const user = await getSessionUser();
  if (user) redirect('/');
  return (
    <div className={styles.page}>
      <main className={styles.regMain}>
        <Link href="/auth" className={styles.backBtn} aria-label="Back">
          <BackChevron />
        </Link>
        <MetaWordmark height={12} className={styles.regMeta} />
        <h1 className={styles.regTitle}>Get started on Facebook with a Meta Account</h1>
        <p className={styles.regSub}>A Meta Account lets you access multiple Meta technologies, like Facebook, easily and securely.</p>
        <RegForm />
      </main>
      <AuthFooter />
    </div>
  );
}
