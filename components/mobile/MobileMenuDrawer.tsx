'use client';
import {useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import type {User} from '@/lib/types';
import {MobileMenu} from './MobileMenu';
import {MOBILE_MENU_EVENT} from './MobileHeader';
import styles from './menu.module.css';

export function MobileMenuDrawer({user}: {user: User}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touch = useRef<{x: number; y: number} | null>(null);
  const pendingHref = useRef('');
  const [open, setOpen] = useState(false);
  useEffect(() => {
    function show() {
      if (window.innerWidth > 700 || dialogRef.current?.open) return;
      history.pushState({...history.state, mobileMenu: true}, '');
      setOpen(true);
    }
    function back() {
      setOpen(false);
      if (pendingHref.current) {
        const href = pendingHref.current;
        pendingHref.current = '';
        // Let Next restore the underlying history entry before navigating.
        setTimeout(() => router.push(href), 0);
      }
    }
    function resize() { if (window.innerWidth > 700 && dialogRef.current?.open) history.back(); }
    window.addEventListener(MOBILE_MENU_EVENT, show);
    window.addEventListener('popstate', back);
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener(MOBILE_MENU_EVENT, show);
      window.removeEventListener('popstate', back);
      window.removeEventListener('resize', resize);
    };
  }, [router]);
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current!;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    dialog.querySelector<HTMLAnchorElement>('a')?.focus({preventScroll: true});
    return () => { dialog.close(); document.body.style.overflow = overflow; };
  }, [open]);
  return <dialog ref={dialogRef} className={styles.drawer} aria-label="Menu" onCancel={e => { e.preventDefault(); history.back(); }} onClickCapture={e => {
    const link = (e.target as HTMLElement).closest('a');
    if (!link) return;
    e.preventDefault();
    pendingHref.current = link.getAttribute('href') || '';
    history.back();
  }}>
    <button className={styles.backdrop} aria-label="Close menu" onClick={() => history.back()} />
    {open && <div className={styles.drawerPanel} onTouchStart={e => { touch.current = {x: e.touches[0].clientX, y: e.touches[0].clientY}; }} onTouchEnd={e => {
      const start = touch.current;
      const end = e.changedTouches[0];
      if (start && start.x - end.clientX > 60 && Math.abs(start.y - end.clientY) < 50) history.back();
      touch.current = null;
    }}><MobileMenu user={user} drawer /></div>}
  </dialog>;
}
