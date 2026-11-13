import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {List, ListItem} from '@astryxdesign/core/List';
import {Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import {VStack} from '@astryxdesign/core/VStack';
import {BossArt} from '@/components/rally/BossArt';
import {getSessionUser} from '@/lib/auth';
import {listQuestsForUser} from '@/lib/rally/queries';

export const metadata: Metadata = {title: 'Rally | Facebook'};
export const dynamic = 'force-dynamic';

export default async function RallyIndex() {
  const user = await getSessionUser();
  if (!user) redirect('/auth');
  const quests = await listQuestsForUser(user.id);
  return (
    <VStack gap={3} paddingBlock={3}>
      <Card>
        <VStack gap={1}>
          <Heading level={1}>Rally</Heading>
          <Text color="secondary">Co-op fitness quests with your group chats. Start one from any chat with the Rally star.</Text>
        </VStack>
      </Card>
      <Card>
        {quests.length === 0 ? (
          <EmptyState title="No quests yet" description="Open a group chat in Messenger and tap the Rally star." actions={<Button label="Open Messenger" variant="primary" href="/messages" />} />
        ) : (
          <List hasDividers>
            {quests.map(q => (
              <ListItem
                key={q.id}
                href={`/activities/games/${q.id}`}
                startContent={<BossArt kind={q.bossKind} name={q.spec.boss?.name ?? q.title} size={56} down={q.status === 'completed'} />}
                label={<Text weight="bold">{q.title}</Text>}
                description={q.status === 'completed' ? 'Boss defeated' : `${q.bossHpLeft} / ${q.bossHp} HP left`}
                endContent={
                  <HStack gap={1.5} vAlign="center">
                    {q.fit && q.status !== 'completed' && <Token label={q.fit === 'good' ? 'Good match' : 'A stretch'} size="sm" color={q.fit === 'good' ? 'green' : 'orange'} />}
                    <Token label={q.status === 'completed' ? 'completed' : q.template ?? 'rally'} size="sm" color={q.status === 'completed' ? 'green' : 'blue'} />
                  </HStack>
                }
              />
            ))}
          </List>
        )}
      </Card>
    </VStack>
  );
}
