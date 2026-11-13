'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import {ChevronLeftIcon, HamburgerIcon, MobileEditIcon, MoreCircleIcon} from '@/components/icons';
import {Avatar} from '@/components/ui/Avatar';
import {Popover} from '@/components/ui/Popover';
import {MOBILE_MENU_EVENT, PeopleSearchButton} from './MobileHeader';
import styles from './cover-header.module.css';

export function MobileCoverHeader({name, href, avatarUrl, isOwn = false, group = false}: {name: string; href: string; avatarUrl: string; isOwn?: boolean; group?: boolean}) {
  const [solid, setSolid] = useState(false);
  const [more, setMore] = useState(false);
  useEffect(() => {
    const update = () => setSolid((document.querySelector('[data-mobile-cover]')?.getBoundingClientRect().bottom ?? Infinity) <= 56);
    update();
    window.addEventListener('scroll', update, {passive: true});
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [href]);
  return <header className={`${styles.header} ${solid ? styles.solid : ''}`} aria-label={group ? 'Group cover controls' : 'Profile cover controls'} data-mobile-cover-header>
    {isOwn ? <button className={styles.button} aria-label="Menu" onClick={() => window.dispatchEvent(new Event(MOBILE_MENU_EVENT))}><HamburgerIcon size={24} /></button> : <Link href={group ? '/groups' : '/friends'} className={styles.button} aria-label={group ? 'Back to groups' : 'Back'} onClick={e => { if (!group && window.history.length > 2) { e.preventDefault(); window.history.back(); } }}><ChevronLeftIcon size={24} /></Link>}
    <span className={styles.name}>{name}</span>
    {isOwn ? <>
      <Link href={`${href}?tab=about`} className={styles.button} aria-label="Edit profile"><MobileEditIcon size={22} /></Link>
      <button className={styles.button} aria-label="Account menu" onClick={() => window.dispatchEvent(new Event(MOBILE_MENU_EVENT))}><Avatar src={avatarUrl} alt={name} size={26} /></button>
    </> : <PeopleSearchButton className={styles.button} iconSize={23} thin />}
    <span className={styles.more}>
      <button className={styles.button} aria-label={group ? 'Group options' : 'Profile options'} aria-expanded={more} onClick={() => setMore(v => !v)}><MoreCircleIcon size={24} /></button>
      <Popover open={more} onClose={() => setMore(false)} width={210}>
        <div className={styles.options}>
          <Link href={`${href}?tab=about`} onClick={() => setMore(false)}>{isOwn ? 'Edit profile' : 'About'}</Link>
          <Link href={`${href}?tab=${group ? 'members' : 'friends'}`} onClick={() => setMore(false)}>{group ? 'Members' : 'Friends'}</Link>
          <Link href={`${href}?tab=${group ? 'events' : 'photos'}`} onClick={() => setMore(false)}>{group ? 'Events' : 'Photos'}</Link>
        </div>
      </Popover>
    </span>
  </header>;
}
