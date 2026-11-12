import {useState} from 'react';
import {TopNav, TopNavItem} from '@astryxdesign/core/TopNav';
import {NavIcon} from '@astryxdesign/core/NavIcon';
import {Icon} from '@astryxdesign/core/Icon';
import {IconButton} from '@astryxdesign/core/IconButton';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Avatar} from '@astryxdesign/core/Avatar';
import {HStack} from '@astryxdesign/core/Stack';
import {Heading} from '@astryxdesign/core/Heading';
import {
  HomeIcon,
  PlayCircleIcon,
  BuildingStorefrontIcon,
  UserGroupIcon,
  PuzzlePieceIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  BellIcon,
  Squares2X2Icon,
  MoonIcon,
  SunIcon,
} from '@heroicons/react/24/outline';
import {me} from '../data';

export type Section = 'home' | 'video' | 'marketplace' | 'groups' | 'gaming';

const NAV: {id: Section; label: string; icon: typeof HomeIcon}[] = [
  {id: 'home', label: 'Home', icon: HomeIcon},
  {id: 'video', label: 'Video', icon: PlayCircleIcon},
  {id: 'marketplace', label: 'Marketplace', icon: BuildingStorefrontIcon},
  {id: 'groups', label: 'Groups', icon: UserGroupIcon},
  {id: 'gaming', label: 'Gaming', icon: PuzzlePieceIcon},
];

type Props = {
  section: Section;
  onSectionChange: (s: Section) => void;
  isMobile: boolean;
  mode: 'light' | 'dark';
  onToggleMode: () => void;
};

export function Header({section, onSectionChange, isMobile, mode, onToggleMode}: Props) {
  const [query, setQuery] = useState('');

  return (
    <TopNav
      label="Facebook"
      heading={
        <HStack gap={2} vAlign="center">
          <NavIcon icon={<Heading level={1} color="inherit">f</Heading>} />
          {!isMobile && (
            <TextInput
              label="Search Facebook"
              isLabelHidden
              type="search"
              size="md"
              width={240}
              startIcon="search"
              placeholder="Search Facebook"
              value={query}
              onChange={setQuery}
            />
          )}
        </HStack>
      }
      centerContent={
        isMobile ? undefined : (
          <HStack gap={1}>
            {NAV.map(item => (
              <TopNavItem
                key={item.id}
                label={item.label}
                href={`#${item.id}`}
                isIconOnly
                isSelected={section === item.id}
                icon={<Icon icon={item.icon} size="lg" />}
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  onSectionChange(item.id);
                }}
              />
            ))}
          </HStack>
        )
      }
      endContent={
        <HStack gap={1} vAlign="center">
          {isMobile && (
            <IconButton label="Search" variant="ghost" icon={<Icon icon="search" />} />
          )}
          {!isMobile && (
            <IconButton label="Menu" tooltip="Menu" variant="ghost" icon={<Icon icon={Squares2X2Icon} />} />
          )}
          <IconButton
            label="Messenger"
            tooltip="Messenger"
            variant="ghost"
            icon={<Icon icon={ChatBubbleOvalLeftEllipsisIcon} />}
          />
          <IconButton label="Notifications" tooltip="Notifications" variant="ghost" icon={<Icon icon={BellIcon} />} />
          <IconButton
            label={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            tooltip={mode === 'light' ? 'Dark mode' : 'Light mode'}
            variant="ghost"
            icon={<Icon icon={mode === 'light' ? MoonIcon : SunIcon} />}
            onClick={onToggleMode}
          />
          {!isMobile && <Avatar name={me.name} src={me.avatar} size="sm" onClick={() => {}} />}
        </HStack>
      }
    />
  );
}
