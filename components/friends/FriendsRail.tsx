import Link from 'next/link';
import {ChevronRightIcon, GearIcon, ListIcon, PeopleIcon, PersonCheckIcon, PersonPlusIcon, PersonStarIcon, CakeIcon} from '@/components/profile/icons';
import styles from './friends.module.css';

const ITEMS = [
  {key: 'home', label: 'Home', icon: PeopleIcon, chevron: false},
  {key: 'requests', label: 'Friend requests', icon: PersonCheckIcon, chevron: true},
  {key: 'suggestions', label: 'Suggestions', icon: PersonPlusIcon, chevron: true},
  {key: 'all', label: 'All friends', icon: PersonStarIcon, chevron: true},
  {key: 'birthdays', label: 'Birthdays', icon: CakeIcon, chevron: false},
  {key: 'lists', label: 'Custom lists', icon: ListIcon, chevron: true},
] as const;

export function FriendsRail({requestCount, active}: {requestCount: number; active: string}) {
  return (
    <aside className={styles.rail} aria-label="Friends navigation">
      <div className={styles.railHead}>
        <h1>Friends</h1>
        <button type="button" className="fb-icon-btn" aria-label="Settings" style={{width: 36, height: 36}}>
          <GearIcon size={20} />
        </button>
      </div>
      {ITEMS.map(item => {
        const Icon = item.icon;
        const isActive = item.key === active;
        return (
          <Link key={item.key} href={item.key === 'home' ? '/friends' : `/friends?view=${item.key}`} className={`${styles.railItem} ${isActive ? styles.railItemActive : ''}`} aria-current={isActive ? 'page' : undefined}>
            <span className={`${styles.railIcon} ${isActive ? styles.railIconActive : ''}`}>
              <Icon size={20} />
            </span>
            <span className={styles.railLabel}>
              {item.label}
              {item.key === 'requests' && requestCount > 0 && <span className={styles.railBadge}>{requestCount} new</span>}
            </span>
            {item.chevron && <span className={styles.railChevron}><ChevronRightIcon size={20} /></span>}
          </Link>
        );
      })}
    </aside>
  );
}
