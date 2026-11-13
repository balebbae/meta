import type {Metadata} from 'next';
import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getSessionUser} from '@/lib/auth';
import {listFriendRequests, listMutualFriendAvatars, listSuggestions, listUserFriends} from '@/lib/profile-queries';
import {FriendsRail} from '@/components/friends/FriendsRail';
import {RequestCards, SuggestionCards} from '@/components/friends/FriendCards';
import {AllFriendsCards} from '@/components/friends/AllFriendsCards';
import {MobileFriends} from '@/components/friends/MobileFriends';
import styles from '@/components/friends/friends.module.css';

export const metadata: Metadata = {title: 'Friends | Facebook'};

const VIEWS = ['home', 'requests', 'suggestions', 'all', 'birthdays', 'lists'] as const;
type View = (typeof VIEWS)[number];

export default async function FriendsPage({searchParams}: {searchParams: Promise<{view?: string}>}) {
  const viewer = await getSessionUser();
  if (!viewer) redirect('/auth');
  const {view: rawView} = await searchParams;
  const view: View = VIEWS.includes(rawView as View) ? (rawView as View) : 'home';

  const [requests, allSuggestions, friends, mutualAvatars] = await Promise.all([
    listFriendRequests(viewer.id),
    view === 'home' || view === 'suggestions' ? listSuggestions(viewer.id, 200) : Promise.resolve([]),
    view === 'all' || view === 'home' ? listUserFriends(viewer.id, viewer.id) : Promise.resolve([]),
    listMutualFriendAvatars(viewer.id),
  ]);
  // People who already sent a request live in Friend Requests; don't show them a second time under People You May Know.
  const requestIds = new Set(requests.map(r => r.id));
  const suggestions = allSuggestions.filter(s => !requestIds.has(s.id));

  return (
    <>
    <MobileFriends viewer={viewer} view={view} requests={requests} suggestions={suggestions} friends={friends} mutualAvatars={mutualAvatars} />
    <div className={styles.page}>
      <FriendsRail requestCount={requests.length} active={view} />
      <section className={styles.main} aria-label="Friends">
        {(view === 'home' || view === 'requests') && (
          <>
            <div className={styles.sectionHead}>
              <h2>Friend Requests</h2>
              {view === 'home' && requests.length > 0 && <Link href="/friends?view=requests" className={styles.seeAll}>See all</Link>}
            </div>
            <RequestCards requests={requests} />
          </>
        )}
        {view === 'home' && <div className={styles.divider} />}
        {(view === 'home' || view === 'suggestions') && (
          <>
            <div className={styles.sectionHead}>
              <h2>People You May Know</h2>
              {view === 'home' && <Link href="/friends?view=suggestions" className={styles.seeAll}>See all</Link>}
            </div>
            <SuggestionCards suggestions={view === 'home' ? suggestions.slice(0, 10) : suggestions} searchable={view === 'suggestions'} />
          </>
        )}
        {view === 'all' && (
          <>
            <div className={styles.sectionHead}>
              <h2>All friends</h2>
              <span className="fb-text-secondary">{friends.length} {friends.length === 1 ? 'friend' : 'friends'}</span>
            </div>
            <AllFriendsCards friends={friends} />
          </>
        )}
        {view === 'birthdays' && (
          <>
            <div className={styles.sectionHead}><h2>Birthdays</h2></div>
            <p className={styles.empty}>No birthdays today.</p>
          </>
        )}
        {view === 'lists' && (
          <>
            <div className={styles.sectionHead}><h2>Custom lists</h2></div>
            <p className={styles.empty}>You haven&apos;t created any custom lists yet.</p>
          </>
        )}
      </section>
    </div>
    </>
  );
}
