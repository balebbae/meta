import Image from 'next/image';
import Link from 'next/link';
import {Avatar} from '@/components/ui/Avatar';
import {CakeIcon, MoreHorizontalIcon, PlusIcon, SearchIcon, VideoCameraIcon} from '@/components/icons';
import type {Contact} from '@/lib/queries';
import type {User} from '@/lib/types';
import styles from './layout.module.css';

const ADS = [
  {title: 'Thinking about moving to Austin? Find your next home today.', domain: 'zillow.com', img: 'https://picsum.photos/seed/austinhome/240/240'},
  {title: 'Ship faster with Neon serverless Postgres. Free tier included.', domain: 'neon.tech', img: 'https://picsum.photos/seed/neonad/240/240'},
];

export function RightSidebar({user, contacts = [], birthday}: {user: User; contacts?: Contact[]; birthday?: string | null}) {
  const bday = birthday ?? contacts.find(c => c.name.startsWith('Maya'))?.name ?? contacts[0]?.name;
  return (
    <aside className={styles.rightRail} aria-label="Complementary">
      <div className={styles.rrHeading}>Sponsored</div>
      {ADS.map(ad => (
        <a key={ad.domain} className={styles.ad} href={`https://${ad.domain}`} target="_blank" rel="noreferrer">
          <Image src={ad.img} alt="" width={120} height={120} className={styles.adImg} />
          <span>
            <div className={styles.adTitle}>{ad.title}</div>
            <div className={styles.adDomain}>{ad.domain}</div>
          </span>
        </a>
      ))}
      <div className={styles.rrDivider} />
      {bday && (
        <>
          <div className={styles.rrHeading}>Birthdays</div>
          <Link href="/events" className={styles.rrRow}>
            <span className={styles.rrPlus} style={{background: 'transparent'}}>
              <CakeIcon size={36} />
            </span>
            <span style={{fontSize: 15}}>
              <b>{bday}</b> has a birthday today.
            </span>
          </Link>
          <div className={styles.rrDivider} />
        </>
      )}
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
        <Link key={c.id} href={`/profile/${c.id}`} className={styles.rrRow}>
          <Avatar src={c.avatarUrl} alt="" size={36} online={c.isOnline} />
          <span className={styles.rrContactName}>{c.name}</span>
        </Link>
      ))}
      <div className={styles.rrDivider} />
      <div className={styles.rrHeading}>Group conversations</div>
      <button className={styles.rrRow}>
        <span className={styles.rrPlus}>
          <PlusIcon size={20} />
        </span>
        <span className={styles.rrContactName}>Create new group</span>
      </button>
      <span hidden>{user.id}</span>
    </aside>
  );
}
