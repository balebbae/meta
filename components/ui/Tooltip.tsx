import type {ReactNode} from 'react';
import styles from './Tooltip.module.css';

/** Facebook-style dark tooltip shown below (or above) its child after a short hover delay. */
export function Tooltip({label, children, position = 'bottom', className}: {label: string; children: ReactNode; position?: 'bottom' | 'top'; className?: string}) {
  return (
    <span className={`${styles.wrap} ${className ?? ''}`}>
      {children}
      <span role="tooltip" className={`${styles.tip} ${position === 'top' ? styles.top : styles.bottom}`}>
        {label}
      </span>
    </span>
  );
}
