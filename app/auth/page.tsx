import Image from 'next/image';
import {redirect} from 'next/navigation';
import {getSessionUser} from '@/lib/auth';
import {LoginForm} from '@/components/auth/LoginForm';
import {FacebookLogo} from '@/components/auth/logos';
import styles from '@/components/auth/auth.module.css';

const LANGUAGES = ['English (US)', 'Español', 'Français (France)', '中文(简体)', 'العربية', 'Português (Brasil)', '한국어', 'Italiano', 'Deutsch', 'हिन्दी', '日本語'];
const LINKS_1 = ['Sign Up', 'Log in', 'Messenger', 'Facebook Lite', 'Video', 'Meta Pay', 'Meta Store', 'Meta Quest', 'Ray-Ban Meta', 'Meta AI', 'Instagram', 'Threads', 'Fundraisers', 'Services', 'Voting Information Center', 'Privacy Policy', 'Privacy Center', 'About', 'Create ad', 'Create Page', 'Developers', 'Careers', 'Cookies', 'AdChoices', 'Terms', 'Help', 'Contact uploading and non-users'];

export default async function AuthPage() {
  const user = await getSessionUser();
  if (user) redirect('/');
  return (
    <div className={styles.page}>
      <div className={styles.main}>
        <section className={styles.left}>
          <FacebookLogo size={60} className={styles.logo} />
          <div className={styles.hero}>
            <Image src="/auth/hero.webp" alt="" width={500} height={500} priority className={styles.heroImg} />
          </div>
          <h1 className={styles.headline}>
            Explore the things <span>you love.</span>
          </h1>
        </section>
        <div className={styles.vline} />
        <section className={styles.right}>
          <LoginForm />
        </section>
      </div>
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.langRow}>
            {LANGUAGES.map(l => (
              <a key={l} href="#">
                {l}
              </a>
            ))}
            <button className={styles.langPlus} type="button" aria-label="Show more languages">
              +
            </button>
          </div>
          <div className={styles.linkRow}>
            {LINKS_1.map(l => (
              <a key={l} href="#">
                {l}
              </a>
            ))}
          </div>
          <div className={styles.copy}>Meta © {new Date().getFullYear()}</div>
        </div>
      </footer>
    </div>
  );
}
