import type {Metadata} from 'next';
import {notFound, redirect} from 'next/navigation';
import {getSessionUser} from '@/lib/auth';
import {getProfile, getUserById, listUserFriends, listUserPhotos, listUserPosts} from '@/lib/profile-queries';
import {ProfileHeader, type ProfileTab} from '@/components/profile/ProfileHeader';
import {IntroCard} from '@/components/profile/IntroCard';
import {PhotosCard} from '@/components/profile/PhotosCard';
import {FriendsCard} from '@/components/profile/FriendsCard';
import {ProfilePosts} from '@/components/profile/ProfilePosts';
import {AboutTab, type AboutSection} from '@/components/profile/AboutTab';
import {FriendsTab} from '@/components/profile/FriendsTab';
import {PhotosTab} from '@/components/profile/PhotosTab';
import styles from '@/components/profile/profile.module.css';

type Props = {params: Promise<{id: string}>; searchParams: Promise<{tab?: string; section?: string}>};

const TABS: ProfileTab[] = ['posts', 'about', 'friends', 'photos', 'videos', 'reels'];
const SECTIONS: AboutSection[] = ['overview', 'work', 'places', 'contact', 'family', 'details', 'events'];

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const id = Number((await params).id);
  const user = Number.isInteger(id) ? await getUserById(id) : null;
  return {title: user ? `${user.name} | Facebook` : 'Facebook'};
}

export default async function ProfilePage({params, searchParams}: Props) {
  const viewer = await getSessionUser();
  if (!viewer) redirect('/auth');
  const [{id: rawId}, sp] = await Promise.all([params, searchParams]);
  const id = Number(rawId);
  if (!Number.isInteger(id)) notFound();

  const profile = await getProfile(id, viewer.id);
  if (!profile) notFound();
  const isOwn = viewer.id === id;
  const tab: ProfileTab = TABS.includes(sp.tab as ProfileTab) ? (sp.tab as ProfileTab) : 'posts';
  const section: AboutSection = SECTIONS.includes(sp.section as AboutSection) ? (sp.section as AboutSection) : 'overview';

  const [posts, photos, friends] = await Promise.all([
    tab === 'posts' ? listUserPosts(id, viewer.id) : Promise.resolve([]),
    tab === 'posts' || tab === 'photos' ? listUserPhotos(id) : Promise.resolve([]),
    tab === 'friends' ? listUserFriends(id, viewer.id) : Promise.resolve(profile.friendPreview),
  ]);

  return (
    <div className={styles.page}>
      <ProfileHeader profile={profile} isOwn={isOwn} tab={tab} />
      <div className={styles.body}>
        {tab === 'posts' && (
          <div className={styles.columns}>
            <div className={styles.leftCol}>
              <IntroCard profile={profile} isOwn={isOwn} />
              <PhotosCard photos={photos} userId={id} />
              <FriendsCard friends={friends} count={profile.friendCount} userId={id} />
            </div>
            <div className={styles.rightCol}>
              <ProfilePosts posts={posts} viewer={viewer} owner={profile.user} isOwn={isOwn} />
            </div>
          </div>
        )}
        {tab === 'about' && <AboutTab profile={profile} isOwn={isOwn} section={section} />}
        {tab === 'friends' && <FriendsTab friends={friends} isOwn={isOwn} ownerName={profile.user.name} />}
        {tab === 'photos' && <PhotosTab photos={photos} isOwn={isOwn} />}
        {(tab === 'videos' || tab === 'reels') && (
          <section className={styles.card} aria-label={tab}>
            <h2 className={styles.cardTitle}>{tab === 'videos' ? 'Videos' : 'Reels'}</h2>
            <p className={styles.empty}>No {tab} to show</p>
          </section>
        )}
      </div>
    </div>
  );
}
