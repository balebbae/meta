'use client';
import {useEffect, type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {CloseIcon, ArrowLeftIcon} from '@/components/icons';
import styles from './Dialog.module.css';

export function Dialog({
  open,
  onClose,
  title,
  children,
  width = 500,
  onBack,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
  onBack?: () => void;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div className={styles.overlay} onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.dialog} style={{width}} role="dialog" aria-modal="true" aria-label={title}>
        <div className={styles.header}>
          {onBack && (
            <button className={styles.circle} style={{left: 16}} onClick={onBack} aria-label="Back">
              <ArrowLeftIcon size={20} />
            </button>
          )}
          <h2 className={styles.title}>{title}</h2>
          <button className={styles.circle} style={{right: 16}} onClick={onClose} aria-label="Close">
            <CloseIcon size={20} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
