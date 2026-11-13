import Link from 'next/link';
import {Leaderboard} from '@/components/closeness/Leaderboard';
import {WeeklyQuestsButton} from '@/components/closeness/WeeklyQuestsButton';
import {Avatar} from '@/components/ui/Avatar';
import {MoreHorizontalIcon, PlusIcon, SearchIcon, VideoCameraIcon} from '@/components/icons';
import {FriendRequests, type FriendRequestItem} from '@/components/layout/FriendRequests';
import {ContactDmLink} from '@/components/messages/ContactDmLink';
import type {Contact} from '@/lib/queries';
import type {User} from '@/lib/types';
import styles from './layout.module.css';

export function RightSidebar({user, contacts = [], requests = []}: {user: User; contacts?: Contact[]; requests?: FriendRequestItem[]}) {
  return (
    <aside className={styles.rightRail} aria-label="Complementary">
      <Leaderboard compact action={<WeeklyQuestsButton />} />
      <FriendRequests initial={requests} />
      {contacts.length > 0 && (
        <>
          <div className={styles.rrDivider} />
          <div className={styles.rrHeading}>
            <span>Contacts</span>
            <span className={styles.rrIcons}>
              <button className={styles.rrIconBtn} aria-label="New room">
                <VideoCameraIcon size={16} />
              </button>
              <button className={styles.rrIconBtn} aria-label="Search by name">
                <SearchIcon size={16} />
              </button>
              <button className={styles.rrIconBtn} aria-label="Options">
                <MoreHorizontalIcon size={16} />
              </button>
            </span>
          </div>
          {contacts.map(c => (
            <ContactDmLink key={c.id} userId={c.id} className={styles.rrRow}>
              <Avatar src={c.avatarUrl} alt="" size={36} online={c.isOnline} />
              <span className={styles.rrContactName}>{c.name}</span>
            </ContactDmLink>
          ))}
          <div className={styles.rrDivider} />
          <div className={styles.rrHeading}>Group conversations</div>
          <Link href="/messages/new" className={styles.rrRow}>
            <span className={styles.rrPlus}>
              <PlusIcon size={20} />
            </span>
            <span className={styles.rrContactName}>Create new group</span>
          </Link>
        </>
      )}
      <span hidden>{user.id}</span>
    </aside>
  );
}
