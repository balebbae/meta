import styles from '@/components/auth/auth.module.css';

const LANGUAGES = ['English (US)', 'Español', 'Français (France)', '中文(简体)', 'العربية', 'Português (Brasil)', 'Italiano', 'More languages…'];
const LINKS = ['Sign Up', 'Log In', 'Messenger', 'Facebook Lite', 'Video', 'Meta Pay', 'Meta Store', 'Meta Quest', 'Ray-Ban Meta', 'Meta AI', 'Muse', 'Instagram', 'Threads', 'Privacy Policy', 'Consumer Health Privacy', 'Privacy Center', 'About', 'Create ad', 'Create Page', 'Developers', 'Careers', 'Cookies', 'Ad choices', 'Terms', 'Help', 'Contact Uploading & Non-Users'];
const HREFS: Record<string, string> = {'Sign Up': '/auth/reg', 'Log In': '/auth'};

/** Footer shared by facebook.com's logged-out pages (login draws a hairline above it, /reg does not). */
export function AuthFooter({line = false}: {line?: boolean}) {
  return (
    <footer className={`${styles.footer} ${line ? styles.footerLine : ''}`}>
      <div className={styles.footerInner}>
        <div className={styles.langRow}>
          {LANGUAGES.map(l => (
            <a key={l} href="#">
              {l}
            </a>
          ))}
        </div>
        <div className={styles.linkRow}>
          {LINKS.map(l => (
            <a key={l} href={HREFS[l] ?? '#'}>
              {l}
              {l === 'Ad choices' ? (
                <svg className={styles.adIcon} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 1.5v9l8.5-4.5z" />
                  <path d="M4.6 4.6v2.8M4.6 4.6l2.4 1.4" strokeLinecap="round" />
                </svg>
              ) : null}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
