'use client';
import {useState} from 'react';
import {PanelDivider, PanelHeader, PanelRow, PanelSearch} from './SecondaryLayout';
import {CreateListingDialog} from './CreateListingDialog';
import {CategoryIcon} from './CategoryIcon';
import {BellIcon, BriefcaseIcon, DollarIcon, InboxIcon, PlusIcon, ShieldIcon, StoreIcon, TagIcon} from './icons';
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
      <PanelRow icon={<BriefcaseIcon />} label="Jobs" href="/marketplace?tab=jobs" />
      <PanelRow icon={<BellIcon />} label="Notifications" href="/marketplace?tab=notifications" />
      <PanelRow icon={<InboxIcon />} label="Inbox" href="/marketplace?tab=inbox" />
      <PanelRow icon={<ShieldIcon />} label="Marketplace status" href="/marketplace?tab=status" />
      <PanelRow icon={<TagIcon />} label="Buying" href="/marketplace?tab=buying" chevron />
      <PanelRow icon={<DollarIcon />} label="Selling" href="/marketplace?tab=selling" chevron />
      <button type="button" className={panel.panelButton} onClick={() => setOpen(true)}>
        <PlusIcon size={16} />
        Create new listing
      </button>
      <button type="button" className={panel.panelButtonSecondary} onClick={() => setOpen(true)}>
        Create multiple listings
      </button>
      <PanelDivider />
      <div className={styles.filterTitle}>Location</div>
      <a className={styles.filterLink} href="#location">
        {MARKETPLACE_LOCATION.city} · Within {MARKETPLACE_LOCATION.radius}
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
