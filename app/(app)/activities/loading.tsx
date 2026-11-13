import {Skeleton} from '@astryxdesign/core/Skeleton';
import {VStack} from '@astryxdesign/core/VStack';

export default function Loading() {
  return (
    <VStack gap={4} paddingBlock={4} aria-busy aria-label="Loading Activities">
      <Skeleton width={180} height={28} />
      <Skeleton width="100%" height={140} radius="rounded" index={1} />
      <Skeleton width="100%" height={220} radius="rounded" index={2} />
      <Skeleton width="100%" height={220} radius="rounded" index={3} />
    </VStack>
  );
}
