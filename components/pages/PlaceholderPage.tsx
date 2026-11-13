import Link from 'next/link';
import styles from './placeholder.module.css';

/** Facebook surfaces that exist in the real nav but are out of scope for this clone; a real page beats a 404 behind a rail link. */
export function PlaceholderPage({title, blurb}: {title: string; blurb: string}) {
  return (
    <div className={styles.card}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.blurb}>{blurb}</p>
      <Link href="/" className="fb-btn-primary">
        Back to Home
      </Link>
    </div>
  );
}
