import {LayoutFooter} from '@astryxdesign/core/Layout';
import {HStack} from '@astryxdesign/core/Stack';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Icon} from '@astryxdesign/core/Icon';
import {Avatar} from '@astryxdesign/core/Avatar';
import {
  HomeIcon,
  PlayCircleIcon,
  BuildingStorefrontIcon,
  UserGroupIcon,
  BellIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeSolid,
  PlayCircleIcon as PlaySolid,
  BuildingStorefrontIcon as StoreSolid,
  UserGroupIcon as GroupSolid,
} from '@heroicons/react/24/solid';
import type {Section} from './Header';
import {me} from '../data';

const TABS: {id: Section; label: string; icon: typeof HomeIcon; solid: typeof HomeIcon}[] = [
  {id: 'home', label: 'Home', icon: HomeIcon, solid: HomeSolid},
  {id: 'video', label: 'Video', icon: PlayCircleIcon, solid: PlaySolid},
  {id: 'marketplace', label: 'Marketplace', icon: BuildingStorefrontIcon, solid: StoreSolid},
  {id: 'groups', label: 'Groups', icon: UserGroupIcon, solid: GroupSolid},
];

export function BottomBar({section, onSectionChange}: {section: Section; onSectionChange: (s: Section) => void}) {
  return (
    <LayoutFooter hasDivider padding={1}>
      <HStack justify="around" vAlign="center">
        {TABS.map(t => (
          <IconButton
            key={t.id}
            label={t.label}
            variant="ghost"
            size="lg"
            icon={<Icon icon={section === t.id ? t.solid : t.icon} size="lg" color={section === t.id ? 'accent' : 'secondary'} />}
            onClick={() => onSectionChange(t.id)}
          />
        ))}
        <IconButton label="Notifications" variant="ghost" size="lg" icon={<Icon icon={BellIcon} size="lg" color="secondary" />} />
        <Avatar name={me.name} src={me.avatar} size="sm" onClick={() => {}} />
      </HStack>
    </LayoutFooter>
  );
}
