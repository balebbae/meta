import {redirect} from 'next/navigation';
import {Button} from '@astryxdesign/core/Button';
import {Heading} from '@astryxdesign/core/Heading';
import {Icon} from '@astryxdesign/core/Icon';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import {CoachPanel} from '@/components/activities/CoachPanel';
import {getSessionUser} from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function CoachPage() {
  const user = await getSessionUser();
  if (!user) redirect('/auth');
  return (
    <VStack gap={4} paddingBlock={4}>
      <VStack gap={1} hAlign="start">
        <Button label="Your Muse" variant="ghost" size="sm" icon={<Icon icon="chevronLeft" />} href="/activities/muse" />
        <Heading level={1}>Coach</Heading>
        <Text color="secondary">Your Muse compares this week with last week, shows what improved and where the gaps are, and plans how to bridge them. Only you see this.</Text>
      </VStack>
      <CoachPanel />
    </VStack>
  );
}
