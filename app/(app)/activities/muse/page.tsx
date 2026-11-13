import {Ban, EyeOff, MessageCircle} from 'lucide-react';
import {redirect} from 'next/navigation';
import {OnboardingGate} from '@/components/activities/OnboardingGate';
import {SourcesPanel} from '@/components/activities/SourcesPanel';
import {VaultList} from '@/components/activities/VaultList';
import {listConnections, publicConnection} from '@/lib/activities/connections';
import {getPolicies} from '@/lib/activities/policies';
import {museSummary} from '@/lib/activities/summary';
import {listTags} from '@/lib/activities/tags';
import {sourceLabel} from '@/lib/activities/source-label';
import {listVaultEvents} from '@/lib/activities/vault';
import {getSessionUser} from '@/lib/auth';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {Icon} from '@astryxdesign/core/Icon';
import {List, ListItem} from '@astryxdesign/core/List';
import {Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import {VStack} from '@astryxdesign/core/VStack';

export const dynamic = 'force-dynamic';

export default async function MusePage({searchParams}: {searchParams: Promise<Record<string, string | string[] | undefined>>}) {
  const user = await getSessionUser();
  if (!user) redirect('/auth');
  const sp = await searchParams;
  const [policies, connections, tags, events] = await Promise.all([getPolicies(user.id), listConnections(user.id), listTags(user.id), listVaultEvents(user.id, {limit: 500, includeDuplicates: true})]);
  const connected = connections.filter(c => c.status === 'connected');
  const summary = museSummary(policies, {sources: connected.map(c => sourceLabel(c.source)), tags: tags.map(t => t.tag)});
  const counts: Record<string, number> = {};
  for (const e of events) counts[e.source] = (counts[e.source] ?? 0) + 1;
  const museOnlyTags = tags.filter(t => t.visibility === 'muse_only');
  return (
    <VStack gap={4} paddingBlock={4}>
      <OnboardingGate userId={user.id} searchParams={sp} />
      <VStack gap={1}>
        <Heading level={1}>Your Muse</Heading>
        <Text color="secondary">Only you can see this page. It is the whole of what your Muse knows about how you move.</Text>
      </VStack>
      <Card>
        <HStack gap={3} vAlign="center" justify="between" wrap="wrap">
          <VStack gap={1}>
            <Heading level={2}>Coach mode</Heading>
            <Text type="supporting" color="secondary">
              This week vs last week: what improved, the gaps, and a plan to bridge them.
            </Text>
          </VStack>
          <Button label="Open Coach" variant="primary" href="/activities/coach" />
        </HStack>
      </Card>
      <Card variant="blue">
        <VStack gap={3}>
          <VStack gap={1}>
            <Heading level={2}>What it shares</Heading>
            <Text type="supporting" color="secondary">
              {summary.headline}
            </Text>
          </VStack>
          <List density="compact">
            {summary.shares.map(s => (
              <ListItem key={s} startContent={<Icon icon={MessageCircle} size="sm" color="accent" />} label={s} />
            ))}
            {summary.secrets.map(s => (
              <ListItem key={s} startContent={<Icon icon={EyeOff} size="sm" color="secondary" />} label={s} />
            ))}
            <ListItem startContent={<Icon icon={Ban} size="sm" color="secondary" />} label={summary.nobody} />
          </List>
          <HStack gap={2} wrap="wrap">
            <Button label="Change what it shares" href="/activities/privacy" />
            <Button label="Who asked my Muse what" variant="ghost" href="/activities/privacy#audit" />
          </HStack>
        </VStack>
      </Card>
      <Card>
        <VStack gap={3}>
          <Heading level={2}>What it knows about you</Heading>
          {tags.length > 0 && (
            <HStack gap={1.5} wrap="wrap">
              {tags.map(t => (
                <Token key={`${t.kind}:${t.tag}`} label={`${t.tag} · ${t.visibility === 'muse_only' ? 'Muse-only' : t.visibility}`} size="sm" color={t.visibility === 'muse_only' ? 'gray' : 'blue'} />
              ))}
            </HStack>
          )}
          {museOnlyTags.length > 0 && (
            <Text type="supporting" color="secondary">
              Muse-only tags shape your targets and are never shown to anyone, including as a reason for a handicap.
            </Text>
          )}
          <Heading level={2}>
            Vault ({events.length} {events.length === 1 ? 'event' : 'events'})
          </Heading>
          <VaultList events={events} />
        </VStack>
      </Card>
      <SourcesPanel connections={connections.map(publicConnection)} counts={counts} />
    </VStack>
  );
}
