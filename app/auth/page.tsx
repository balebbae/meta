import {redirect} from 'next/navigation';
import {getSessionUser} from '@/lib/auth';
import {LoginForm} from '@/components/auth/LoginForm';
import {AuthFooter} from '@/components/auth/AuthFooter';
import {FacebookLogo} from '@/components/auth/logos';
import styles from '@/components/auth/auth.module.css';

export default async function AuthPage({searchParams}: {searchParams: Promise<{demo?: string | string[]}>}) {
  const user = await getSessionUser();
  if (user) redirect('/');
  const judgeDemo = (await searchParams).demo === 'judge';
  return (
    <div className={styles.page}>
      <div className={styles.main}>
        <section className={styles.left}>
          <FacebookLogo size={72} className={styles.logo} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/auth/hero.webp" alt="" width={1240} height={1240} className={styles.heroImg} />
          <h1 className={styles.headline}>
            Explore
            <br />
            the
            <br />
            things
            <br />
            <span>you love</span>.
          </h1>
        </section>
        <div className={styles.vline} />
        <section className={styles.right}>
          <LoginForm judgeDemo={judgeDemo} />
        </section>
      </div>
      <AuthFooter line />
    </div>
  );
}
