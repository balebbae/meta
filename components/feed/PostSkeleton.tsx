import styles from './feed.module.css';

export function PostSkeleton() {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      <div className={styles.skelHead}>
        <div className={styles.shimmer} style={{width: 40, height: 40, borderRadius: '50%'}} />
        <div style={{flex: 1}}>
          <div className={styles.shimmer} style={{width: 140, height: 12, marginBottom: 8}} />
          <div className={styles.shimmer} style={{width: 80, height: 10}} />
        </div>
      </div>
      <div className={styles.shimmer} style={{width: '100%', height: 12, marginBottom: 8}} />
      <div className={styles.shimmer} style={{width: '85%', height: 12, marginBottom: 8}} />
      <div className={styles.shimmer} style={{width: '60%', height: 12, marginBottom: 16}} />
      <div className={styles.shimmer} style={{width: '100%', height: 260, borderRadius: 8}} />
    </div>
  );
}
