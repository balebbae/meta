'use client';
import {useState} from 'react';
import {PanelDivider, PanelHeader, PanelRow, PanelSearch} from './SecondaryLayout';
import {CreateListingDialog} from './CreateListingDialog';
import {CategoryIcon} from './CategoryIcon';
import {BellIcon, DollarIcon, InboxIcon, PlusIcon, StoreIcon, TagIcon} from './icons';
import {MARKETPLACE_CATEGORIES, MARKETPLACE_LOCATION} from '@/lib/secondary-data';
import panel from './secondary.module.css';
import styles from './marketplace.module.css';

export function MarketplacePanel({activeCategory}: {activeCategory?: string}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <PanelHeader title="Marketplace" />
      <PanelSearch placeholder="Search Marketplace" />
      <PanelRow icon={<StoreIcon />} label="Browse all" href="/marketplace" active={!activeCategory} />
      <PanelRow icon={<BellIcon />} label="Notifications" href="/marketplace?tab=notifications" />
      <PanelRow icon={<InboxIcon />} label="Inbox" href="/marketplace?tab=inbox" />
      <PanelRow icon={<TagIcon />} label="Buying" href="/marketplace?tab=buying" />
      <PanelRow icon={<DollarIcon />} label="Selling" href="/marketplace?tab=selling" />
      <button type="button" className={panel.panelButton} onClick={() => setOpen(true)}>
        <PlusIcon size={16} />
        Create new listing
      </button>
      <PanelDivider />
      <div className={styles.filterTitle}>Filters</div>
      <a className={styles.filterLink} href="#location">
        {MARKETPLACE_LOCATION.city} · {MARKETPLACE_LOCATION.radius}
      </a>
      <PanelDivider />
      <div className={styles.filterTitle}>Categories</div>
      {MARKETPLACE_CATEGORIES.map(c => (
        <PanelRow
          key={c}
          icon={<CategoryIcon name={c} />}
          label={c}
          href={`/marketplace?category=${encodeURIComponent(c)}`}
          active={activeCategory === c}
        />
      ))}
      <CreateListingDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
