import styles from './feed.module.css';

export function PostSkeleton() {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      <div className={styles.skelHead}>
        <div className={styles.shimmer} style={{width: 36, height: 36, borderRadius: '50%'}} />
        <div style={{flex: 1}}>
          <div className={styles.shimmer} style={{width: 96, height: 10, marginBottom: 8, borderRadius: 5}} />
          <div className={styles.shimmer} style={{width: 96, height: 10, borderRadius: 5}} />
        </div>
      </div>
      <div style={{height: 190}} />
      <div className={styles.skelFoot}>
        <div className={styles.shimmer} style={{width: 60, height: 10, borderRadius: 5}} />
        <div className={styles.shimmer} style={{width: 60, height: 10, borderRadius: 5}} />
        <div className={styles.shimmer} style={{width: 60, height: 10, borderRadius: 5}} />
        <div className={styles.shimmer} style={{width: 60, height: 10, borderRadius: 5, marginLeft: 'auto'}} />
      </div>
    </div>
  );
}
