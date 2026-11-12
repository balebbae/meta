'use client';

import {useState} from 'react';
import Image from '@/components/ui/SmartImage';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import type {FriendSummary, Profile} from '@/lib/profile-queries';
import {PeopleYouMayKnow} from './PeopleYouMayKnow';
import {CameraIcon, ChevronDownIcon, ChevronUpIcon, EllipsisIcon, MessengerIcon, PencilIcon, PlusIcon} from './icons';
import {EditDialog} from './EditDialog';
import {FriendButton} from './FriendButton';
import {profileApi} from './api';
import styles from './profile.module.css';

export type ProfileTab = 'posts' | 'about' | 'friends' | 'photos' | 'videos' | 'reels';
const TABS: {key: ProfileTab; label: string}[] = [
  {key: 'posts', label: 'All'},
  {key: 'about', label: 'About'},
  {key: 'friends', label: 'Friends'},
  {key: 'photos', label: 'Photos'},
  {key: 'reels', label: 'Reels'},
];

type Dialog = 'cover' | 'avatar' | null;

export function ProfileHeader({profile, isOwn, tab, suggestions = []}: {profile: Profile; isOwn: boolean; tab: ProfileTab; suggestions?: FriendSummary[]}) {
  const {user} = profile;
  const [dialog, setDialog] = useState<Dialog>(null);
  const [pymkOpen, setPymkOpen] = useState(true);
  const router = useRouter();
  const base = `/profile/${user.id}`;

  async function save(field: 'coverUrl' | 'avatarUrl', value: string) {
    await profileApi.patchUser(user.id, field === 'coverUrl' ? {coverUrl: value || null} : {avatarUrl: value});
    router.refresh();
  }

  return (
    <div className={styles.top}>
      <div className={styles.coverBand}>
        <div className={styles.coverWrap}>
          <div className={styles.cover}>
            {user.coverUrl && <Image src={user.coverUrl} alt="" fill priority sizes="(max-width: 1095px) 100vw, 1095px" />}
            {isOwn && (
              <button type="button" className={styles.coverBtn} onClick={() => setDialog('cover')}>
                <CameraIcon size={16} />
                <span className={styles.coverBtnText}>Edit cover photo</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={styles.info}>
        <div className={styles.infoRow}>
          {isOwn && (
            <button type="button" className={styles.thought}>
              Share a thought...
            </button>
          )}
          <div className={styles.avatarWrap}>
            <div className={styles.avatarRing}>
              <Image src={user.avatarUrl} alt={user.name} width={168} height={168} className={styles.avatarImg} priority />
            </div>
            {isOwn && (
              <button type="button" className={styles.avatarCamera} onClick={() => setDialog('avatar')} aria-label="Update profile picture">
                <CameraIcon size={20} />
              </button>
            )}
          </div>

          <div className={styles.nameBlock}>
            <h1 className={styles.name}>{user.name}</h1>
            <Link href={`${base}?tab=friends`} className={styles.friendCount}>
              {profile.friendCount.toLocaleString()} {profile.friendCount === 1 ? 'friend' : 'friends'}
              {!isOwn && profile.mutualCount > 0 && ` · ${profile.mutualCount} mutual`}
            </Link>
            {profile.friendPreview.length > 0 && (
              <div className={styles.friendStack}>
                {profile.friendPreview.slice(0, 8).map(f => (
                  <Link key={f.id} href={`/profile/${f.id}`} title={f.name}>
                    <Image src={f.avatarUrl} alt={f.name} width={28} height={28} />
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className={styles.actions}>
            {isOwn ? (
              <>
                <button type="button" className="fb-btn-primary">
                  <PlusIcon size={16} /> Add to story
                </button>
                <Link href={`${base}?tab=about`} className="fb-btn-secondary">
                  <PencilIcon size={16} /> Edit profile
                </Link>
                <button type="button" className={`fb-btn-secondary ${styles.iconOnly}`} aria-label={pymkOpen ? 'Hide people you may know' : 'Show people you may know'} onClick={() => setPymkOpen(o => !o)}>
                  {pymkOpen ? <ChevronUpIcon size={20} /> : <ChevronDownIcon size={20} />}
                </button>
              </>
            ) : (
              <>
                <FriendButton userId={user.id} initial={profile.friendship} />
                <button type="button" className={profile.friendship === 'friends' ? 'fb-btn-primary' : 'fb-btn-secondary'}>
                  <MessengerIcon size={16} /> Message
                </button>
                <button type="button" className={`fb-btn-secondary ${styles.iconOnly}`} aria-label="More">
                  <ChevronDownIcon size={20} />
                </button>
              </>
            )}
          </div>
        </div>

        {isOwn && pymkOpen && suggestions.length > 0 && <PeopleYouMayKnow suggestions={suggestions} />}

        <div className={styles.divider} />

        <div className={styles.tabsRow}>
          <nav className={styles.tabs} aria-label="Profile sections">
            {TABS.map(t => (
              <Link key={t.key} href={t.key === 'posts' ? base : `${base}?tab=${t.key}`} className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`} aria-current={tab === t.key ? 'page' : undefined}>
                <span className={styles.tabInner}>{t.label}</span>
              </Link>
            ))}
            <button type="button" className={styles.tab}>
              <span className={styles.tabInner}>
                More <ChevronDownIcon size={16} />
              </span>
            </button>
          </nav>
          <button type="button" className={`fb-btn-secondary ${styles.iconOnly} ${styles.tabsMore}`} aria-label="More options">
            <EllipsisIcon size={20} />
          </button>
        </div>
      </div>

      {dialog === 'cover' && (
        <EditDialog
          title="Edit cover photo"
          label="Cover photo"
          kind="cover"
          initial={user.coverUrl ?? ''}
          hint="Upload a photo from your device. It is resized to fit 1500 x 600 before saving."
          onClose={() => setDialog(null)}
          onSave={v => save('coverUrl', v)}
        />
      )}
      {dialog === 'avatar' && (
        <EditDialog
          title="Update profile picture"
          label="Profile picture"
          kind="avatar"
          initial={user.avatarUrl}
          hint="Upload a photo from your device. It is cropped to a square and resized to 320 x 320."
          onClose={() => setDialog(null)}
          onSave={v => save('avatarUrl', v)}
        />
      )}
    </div>
  );
}
