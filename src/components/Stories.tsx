import {Carousel} from '@astryxdesign/core/Carousel';
import {Card} from '@astryxdesign/core/Card';
import {AspectRatio} from '@astryxdesign/core/AspectRatio';
import {Thumbnail} from '@astryxdesign/core/Thumbnail';
import {VStack} from '@astryxdesign/core/Stack';
import {Center} from '@astryxdesign/core/Center';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Text} from '@astryxdesign/core/Text';
import {Icon} from '@astryxdesign/core/Icon';
import {PlusIcon} from '@heroicons/react/24/solid';
import {me, stories} from '../data';

export function Stories() {
  return (
    <Carousel gap={2} aria-label="Stories" hasEdgeFade={false}>
      <Card padding={0} width={120} elevation="low">
        <VStack gap={2} hAlign="center" paddingBlockEnd={3}>
          <AspectRatio ratio={9 / 11} fit="cover">
            <Thumbnail src={me.avatar} alt="" />
          </AspectRatio>
          <Center>
            <IconButton label="Create story" variant="primary" icon={<Icon icon={PlusIcon} />} />
          </Center>
          <Text type="label" weight="semibold">Create story</Text>
        </VStack>
      </Card>
      {stories.map(s => (
        <Card key={s.id} padding={0} width={120} elevation="low">
          <VStack gap={2} paddingBlockEnd={3}>
            <AspectRatio ratio={9 / 14} fit="cover">
              <Thumbnail src={s.image} alt={`${s.user.name}'s story`} />
            </AspectRatio>
            <Text type="label" weight="semibold" maxLines={1}>{s.user.name}</Text>
          </VStack>
        </Card>
      ))}
    </Carousel>
  );
}
