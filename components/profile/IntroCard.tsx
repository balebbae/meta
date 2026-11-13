'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import type {Profile} from '@/lib/profile-queries';
import {BriefcaseIcon, CakeIcon, GraduationIcon, HeartIcon, HomeIcon, PencilIcon, PinIcon, ClockIcon, UserIcon} from './icons';
import {EditDialog} from './EditDialog';
import {profileApi} from './api';
import styles from './profile.module.css';

export function IntroCard({profile, isOwn}: {profile: Profile; isOwn: boolean}) {
  const {user, details} = profile;
  const [editing, setEditing] = useState(false);
  const router = useRouter();
  const joined = new Date(user.createdAt);

  return (
    <section className={styles.card} aria-labelledby="intro-title">
      <div className={styles.cardHead}>
        <h2 id="intro-title" className={styles.cardTitle}>Intro</h2>
        {isOwn && (
          <button type="button" className={styles.cardHeadIcon} aria-label="Edit bio" onClick={() => setEditing(true)}>
            <PencilIcon size={20} />
          </button>
        )}
      </div>
      {user.bio && <p className={styles.bio}>{user.bio}</p>}
      {isOwn && (
        <button type="button" className={styles.fullBtn} onClick={() => setEditing(true)}>
          {user.bio ? 'Edit bio' : 'Add bio'}
        </button>
      )}
      <div className={styles.detailList}>
        {details.work && (
          <div className={styles.detail}>
            <BriefcaseIcon size={20} />
            <span>
              {details.workTitle ? <>{details.workTitle} at <b>{details.work}</b></> : <>Works at <b>{details.work}</b></>}
            </span>
          </div>
        )}
        {details.education && (
          <div className={styles.detail}>
            <GraduationIcon size={20} />
            <span>Studied at <b>{details.education}</b></span>
          </div>
        )}
        {details.highSchool && (
          <div className={styles.detail}>
            <GraduationIcon size={20} />
            <span>Went to <b>{details.highSchool}</b></span>
          </div>
        )}
        {details.currentCity && (
          <div className={styles.detail}>
            <HomeIcon size={20} />
            <span>Lives in <b>{details.currentCity}</b></span>
          </div>
        )}
        {details.hometown && (
          <div className={styles.detail}>
            <PinIcon size={20} />
            <span>From <b>{details.hometown}</b></span>
          </div>
        )}
        {details.relationship && (
          <div className={styles.detail}>
            <HeartIcon size={20} />
            <span>{details.relationship}</span>
          </div>
        )}
        {details.birthday && (
          <div className={styles.detail}>
            <CakeIcon size={20} />
            <span><b>{details.birthday}</b></span>
          </div>
        )}
        {details.gender && (
          <div className={styles.detail}>
            <UserIcon size={20} />
            <span>{details.gender}</span>
          </div>
        )}
        <div className={styles.detail}>
          <ClockIcon size={20} />
          <span>Joined {joined.toLocaleDateString('en-US', {month: 'long', year: 'numeric'})}</span>
        </div>
      </div>
      {editing && (
        <EditDialog
          title="Edit bio"
          label="Bio"
          kind="bio"
          initial={user.bio ?? ''}
          onClose={() => setEditing(false)}
          onSave={async v => {
            await profileApi.patchUser(user.id, {bio: v || null});
            router.refresh();
          }}
        />
      )}
    </section>
  );
}
