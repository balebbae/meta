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
import {CreateStoryDialog} from '@/components/feed/StoryDialogs';
import {ContactDmLink} from '@/components/messages/ContactDmLink';
import {Popover} from '@/components/ui/Popover';
import {MobileStoryIcon} from '@/components/icons';
import {profileApi} from './api';
import styles from './profile.module.css';

export type ProfileTab = 'posts' | 'about' | 'friends' | 'photos' | 'activities' | 'videos' | 'reels';
const TABS: {key: ProfileTab; label: string}[] = [
  {key: 'posts', label: 'All'},
  {key: 'about', label: 'About'},
  {key: 'friends', label: 'Friends'},
  {key: 'photos', label: 'Photos'},
  {key: 'activities', label: 'Activities'},
  {key: 'reels', label: 'Reels'},
];

type Dialog = 'cover' | 'avatar' | null;

export function ProfileHeader({profile, isOwn, tab, suggestions = []}: {profile: Profile; isOwn: boolean; tab: ProfileTab; suggestions?: FriendSummary[]}) {
  const {user} = profile;
  const [dialog, setDialog] = useState<Dialog>(null);
  const [pymkOpen, setPymkOpen] = useState(true);
  const [mobileSuggestions, setMobileSuggestions] = useState(false);
  const [profileMenu, setProfileMenu] = useState(false);
  const [story, setStory] = useState(false);
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
          <div className={styles.cover} data-mobile-cover>
            {user.coverUrl && <Image src={user.coverUrl} alt="" fill priority sizes="(max-width: 1095px) 100vw, 1095px" />}
            {isOwn && (
              <button type="button" className={styles.coverBtn} onClick={() => setDialog('cover')} aria-label="Edit cover photo">
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
            <span className={styles.mobileNameMenu}>
              <button aria-label="Profile menu" aria-expanded={profileMenu} onClick={() => setProfileMenu(v => !v)}><ChevronDownIcon size={22} /></button>
              <Popover open={profileMenu} onClose={() => setProfileMenu(false)} width={220}>
                <Link href={`${base}?tab=about`} onClick={() => setProfileMenu(false)}>{isOwn ? 'Edit profile' : 'About'}</Link>
                <Link href={`${base}?tab=friends`} onClick={() => setProfileMenu(false)}>Friends</Link>
                {isOwn && suggestions.length > 0 && <button onClick={() => { setPymkOpen(true); setMobileSuggestions(v => !v); setProfileMenu(false); }}>People you may know</button>}
              </Popover>
            </span>
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

          {profile.friendPreview.length > 0 && <Link href={`${base}?tab=friends`} className={styles.mobileCommonFriends}>
            <span>{profile.friendPreview.slice(0, 3).map(f => <Image key={f.id} src={f.avatarUrl} alt="" width={30} height={30} />)}</span>
            Friends with things in common
          </Link>}

          <div className={styles.actions}>
            {isOwn ? (
              <>
                <button type="button" className="fb-btn-primary" onClick={() => setStory(true)}>
                  <PlusIcon size={16} className={styles.desktopOnly} /><MobileStoryIcon size={16} className={styles.mobileLabel} /> Add to story
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
                <ContactDmLink userId={user.id} className={profile.friendship === 'friends' ? 'fb-btn-primary' : 'fb-btn-secondary'}>
                  <MessengerIcon size={16} /> Message
                </ContactDmLink>
                <button type="button" className={`fb-btn-secondary ${styles.iconOnly}`} aria-label="More">
                  <ChevronDownIcon size={20} />
                </button>
              </>
            )}
          </div>
        </div>

        {isOwn && pymkOpen && suggestions.length > 0 && <div className={`${styles.profileSuggestions} ${mobileSuggestions ? styles.mobileSuggestionsOpen : ''}`}><PeopleYouMayKnow suggestions={suggestions} /></div>}

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

      <CreateStoryDialog open={story} onClose={() => setStory(false)} />

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
