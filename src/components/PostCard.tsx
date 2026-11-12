import {useState} from 'react';
import {Card} from '@astryxdesign/core/Card';
import {VStack, HStack} from '@astryxdesign/core/Stack';
import {Item} from '@astryxdesign/core/Item';
import {Avatar} from '@astryxdesign/core/Avatar';
import {Text} from '@astryxdesign/core/Text';
import {Divider} from '@astryxdesign/core/Divider';
import {Button} from '@astryxdesign/core/Button';
import {ToggleButton} from '@astryxdesign/core/ToggleButton';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Icon} from '@astryxdesign/core/Icon';
import {AspectRatio} from '@astryxdesign/core/AspectRatio';
import {Thumbnail} from '@astryxdesign/core/Thumbnail';
import {
  HandThumbUpIcon as ThumbOutline,
  ChatBubbleOvalLeftIcon,
  ArrowUturnRightIcon,
  GlobeAmericasIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import {HandThumbUpIcon as ThumbSolid} from '@heroicons/react/24/solid';
import type {Post} from '../data';

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n));

export function PostCard({post}: {post: Post}) {
  const [liked, setLiked] = useState(false);
  const likes = post.likes + (liked ? 1 : 0);
  return (
    <Card elevation="low" padding={0}>
      <VStack gap={2} paddingBlock={3}>
        <HStack paddingInline={3}>
          <Item
            label={<Text weight="semibold">{post.author.name}</Text>}
            startContent={<Avatar name={post.author.name} src={post.author.avatar} size="lg" tooltip={false} />}
            description={
              <HStack gap={1} vAlign="center">
                <Text type="supporting">{post.time} ·</Text>
                <Icon icon={post.audience === 'Public' ? GlobeAmericasIcon : UsersIcon} size="xsm" color="secondary" />
              </HStack>
            }
            endContent={<IconButton label="Post options" variant="ghost" size="sm" icon={<Icon icon="moreHorizontal" />} />}
            density="compact"
          />
        </HStack>
        <HStack paddingInline={3}>
          <Text as="p">{post.text}</Text>
        </HStack>
        {post.image && (
          <AspectRatio ratio={16 / 10} fit="cover">
            <Thumbnail src={post.image} alt="" />
          </AspectRatio>
        )}
        <HStack paddingInline={3} justify="between" vAlign="center">
          <HStack gap={1} vAlign="center">
            <Icon icon={ThumbSolid} size="sm" color="accent" />
            <Text type="supporting">{fmt(likes)}</Text>
          </HStack>
          <Text type="supporting">
            {fmt(post.comments)} comments · {fmt(post.shares)} shares
          </Text>
        </HStack>
        <HStack paddingInline={3}>
          <Divider />
        </HStack>
        <HStack paddingInline={3} justify="between" gap={1}>
          <ToggleButton
            label="Like"
            isPressed={liked}
            onPressedChange={setLiked}
            icon={<Icon icon={ThumbOutline} />}
            pressedIcon={<Icon icon={ThumbSolid} color="accent" />}
>
            Like
          </ToggleButton>
          <Button label="Comment" variant="ghost" icon={<Icon icon={ChatBubbleOvalLeftIcon} />} width="100%" />
          <Button label="Share" variant="ghost" icon={<Icon icon={ArrowUturnRightIcon} />} width="100%" />
        </HStack>
      </VStack>
    </Card>
  );
}
