import type {ReactNode} from 'react';
import Link from 'next/link';
import styles from './secondary.module.css';
import {ChevronRightIcon, GearIcon} from './icons';

export {PanelSearch} from './PanelSearch';

export function SecondaryLayout({panel, children, center}: {panel: ReactNode; children: ReactNode; center?: boolean}) {
  return (
    <div data-layout="wide" className={styles.wide}>
      <aside className={styles.panel}>{panel}</aside>
      <section className={center ? styles.contentCenter : styles.content}>{children}</section>
    </div>
  );
}

export function PanelHeader({title, subtitle, settings = true}: {title: string; subtitle?: string; settings?: boolean}) {
  return (
    <>
      <div className={styles.panelHeader}>
        <h1 className={styles.panelTitle}>{title}</h1>
        {settings && (
          <button type="button" className={styles.gear} aria-label="Settings">
            <GearIcon />
          </button>
        )}
      </div>
      {subtitle && <div className={styles.panelSubtitle}>{subtitle}</div>}
    </>
  );
}

export function PanelRow({
  icon,
  label,
  href,
  active,
  chevron,
  onClick,
  sublabel,
  trailing,
}: {
  icon: ReactNode;
  label: string;
  href?: string;
  active?: boolean;
  chevron?: boolean;
  onClick?: () => void;
  sublabel?: string;
  trailing?: ReactNode;
}) {
  const cls = active ? styles.rowActive : styles.row;
  const inner = (
    <>
      <span className={styles.rowIcon}>{icon}</span>
      <span className={styles.rowLabel}>
        {label}
        {sublabel && <span className={styles.rowSub}>{sublabel}</span>}
      </span>
      {trailing}
      {chevron && (
        <span className={styles.rowChevron}>
          <ChevronRightIcon />
        </span>
      )}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} onClick={onClick}>
      {inner}
    </button>
  );
}

export function PanelDivider() {
  return <div className={styles.panelDivider} />;
}

export function PanelSection({title, link, linkLabel = 'See all'}: {title: string; link?: string; linkLabel?: string}) {
  return (
    <div className={styles.panelSection}>
      <h2 className={styles.panelSectionTitle}>{title}</h2>
      {link && (
        <Link href={link} className={styles.panelSectionLink}>
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

export function SectionHead({title, link, small}: {title: string; link?: string; small?: boolean}) {
  return (
    <div className={styles.sectionHead}>
      <h2 className={small ? styles.sectionTitleSm : styles.sectionTitle}>{title}</h2>
      {link && (
        <Link href={link} className={styles.seeAll}>
          See all
        </Link>
      )}
    </div>
  );
}
