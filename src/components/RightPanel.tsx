import {LayoutPanel} from '@astryxdesign/core/Layout';
import {VStack, HStack} from '@astryxdesign/core/Stack';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Divider} from '@astryxdesign/core/Divider';
import {List, ListItem} from '@astryxdesign/core/List';
import {Avatar, AvatarStatusDot} from '@astryxdesign/core/Avatar';
import {Thumbnail} from '@astryxdesign/core/Thumbnail';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Icon} from '@astryxdesign/core/Icon';
import {people, sponsored} from '../data';

export function RightPanel() {
  return (
    <LayoutPanel width={320} role="complementary" label="Contacts and sponsored">
      <VStack gap={4}>
        <VStack gap={2}>
          <Heading level={2} color="secondary">Sponsored</Heading>
          {sponsored.map(ad => (
            <HStack key={ad.id} gap={3} vAlign="center">
              <Thumbnail src={ad.image} alt={ad.title} />
              <VStack gap={0.5}>
                <Text weight="semibold" maxLines={2}>{ad.title}</Text>
                <Text type="supporting">{ad.domain}</Text>
              </VStack>
            </HStack>
          ))}
        </VStack>
        <Divider />
        <VStack gap={2}>
          <HStack justify="between" vAlign="center">
            <Heading level={2} color="secondary">Contacts</Heading>
            <HStack gap={1}>
              <IconButton label="Search contacts" variant="ghost" size="sm" icon={<Icon icon="search" />} />
              <IconButton label="Options" variant="ghost" size="sm" icon={<Icon icon="moreHorizontal" />} />
            </HStack>
          </HStack>
          <List density="compact">
            {people.map(p => (
              <ListItem
                key={p.id}
                label={p.name}
                onClick={() => {}}
                startContent={
                  <Avatar
                    name={p.name}
                    src={p.avatar}
                    size="md"
                    tooltip={false}
                    status={p.online ? <AvatarStatusDot variant="success" label="Online" /> : undefined}
                  />
                }
              />
            ))}
          </List>
        </VStack>
      </VStack>
    </LayoutPanel>
  );
}
