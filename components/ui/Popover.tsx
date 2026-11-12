'use client';
import {useEffect, useRef, type ReactNode} from 'react';
import styles from './Popover.module.css';

/**
 * Anchored dropdown panel. Render inside a `position: relative` wrapper next to its trigger.
 * Closes on outside click and Escape.
 */
export function Popover({
  open,
  onClose,
  children,
  align = 'right',
  width = 360,
  offset = 8,
  className,
  style,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: number | string;
  offset?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const el = ref.current;
      if (!el) return;
      const trigger = el.parentElement;
      if (trigger && trigger.contains(e.target as Node)) return;
      onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
  if (!open) return null;
  const pos: React.CSSProperties =
    align === 'right' ? {right: 0} : align === 'left' ? {left: 0} : {left: '50%', transform: 'translateX(-50%)'};
  return (
    <div ref={ref} className={`${styles.panel} ${className ?? ''}`} style={{width, top: `calc(100% + ${offset}px)`, ...pos, ...style}} role="dialog">
      {children}
    </div>
  );
}
