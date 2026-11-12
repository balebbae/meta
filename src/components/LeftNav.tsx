import {SideNav, SideNavItem, SideNavSection} from '@astryxdesign/core/SideNav';
import {Avatar} from '@astryxdesign/core/Avatar';
import {HStack} from '@astryxdesign/core/Stack';
import {Text} from '@astryxdesign/core/Text';
import {
  UsersIcon,
  ClockIcon,
  BookmarkIcon,
  UserGroupIcon,
  PlayCircleIcon,
  BuildingStorefrontIcon,
  NewspaperIcon,
  CalendarDaysIcon,
  FlagIcon,
  HeartIcon,
} from '@heroicons/react/24/outline';
import {me, groups} from '../data';

const ITEMS = [
  {label: 'Friends', icon: UsersIcon},
  {label: 'Memories', icon: ClockIcon},
  {label: 'Saved', icon: BookmarkIcon},
  {label: 'Groups', icon: UserGroupIcon},
  {label: 'Video', icon: PlayCircleIcon},
  {label: 'Marketplace', icon: BuildingStorefrontIcon},
  {label: 'Feeds', icon: NewspaperIcon},
  {label: 'Events', icon: CalendarDaysIcon},
  {label: 'Pages', icon: FlagIcon},
  {label: 'Fundraisers', icon: HeartIcon},
];

export function LeftNav() {
  return (
    <SideNav
      resizable={{defaultWidth: 300, minWidth: 220, maxWidth: 360}}
      topContent={
        <HStack gap={3} vAlign="center" padding={2}>
          <Avatar name={me.name} src={me.avatar} size="md" tooltip={false} />
          <Text weight="semibold">{me.name}</Text>
        </HStack>
      }
      footer={
        <Text type="supporting" as="p">
          Privacy · Terms · Advertising · Ad choices · Cookies · Meta © 2026
        </Text>
      }>
      <SideNavSection title="Menu" isHeaderHidden>
        {ITEMS.map(item => (
          <SideNavItem key={item.label} label={item.label} icon={item.icon} href="#" />
        ))}
      </SideNavSection>
      <SideNavSection title="Your shortcuts">
        {groups.map(g => (
          <SideNavItem
            key={g.id}
            label={g.name}
            href="#"
            icon={() => <Avatar name={g.name} src={g.image} size="sm" shape="rounded" tooltip={false} />}
          />
        ))}
      </SideNavSection>
    </SideNav>
  );
}
