import {redirect} from 'next/navigation';
import {OnboardingGate} from '@/components/activities/OnboardingGate';
import {PrivacyPanel} from '@/components/activities/PrivacyPanel';
import {SourcesPanel} from '@/components/activities/SourcesPanel';
import {listAudit} from '@/lib/activities/answers';
import {listConnections, publicConnection} from '@/lib/activities/connections';
import {getPolicies} from '@/lib/activities/policies';
import {AUDIENCE_LABEL, describeAnswer, LEVEL_LABEL} from '@/lib/activities/summary';
import {listVaultEvents} from '@/lib/activities/vault';
import {getSessionUser} from '@/lib/auth';
import {Card} from '@astryxdesign/core/Card';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Heading} from '@astryxdesign/core/Heading';
import {Link} from '@astryxdesign/core/Link';
import {List, ListItem} from '@astryxdesign/core/List';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';

export const dynamic = 'force-dynamic';

const QUESTION_LABEL: Record<string, string> = {
  workouts_this_week: 'workouts this week', active_days_this_week: 'active days this week', distance_this_week_km: 'distance this week', completed_move_today: 'completed a move today', completed_run_3km_today: 'ran 3 km today', steps_today: 'steps today', avg_hr_this_week: 'average heart rate this week', sleep_last_night_hours: 'sleep last night', last_workout: 'last workout',
  runs_2w: 'runs in the last 2 weeks', rides_2w: 'rides in the last 2 weeks', strength_2w: 'strength sessions in the last 2 weeks', yoga_2w: 'yoga sessions in the last 2 weeks', workouts_2w: 'workouts in the last 2 weeks',
  level_4w: 'your level over 4 weeks', workouts_per_week_4w: 'workouts a week (last 4 weeks)', load_weekly_16w: 'weekly training load (16 weeks)', steps_avg_7d: 'average daily steps', sleep_avg_7d: 'average sleep this week',
};

function askerLabel(a: string): string {
  if (a.startsWith('preview')) return 'You (preview)';
  const [kind, id] = a.split(':');
  const names: Record<string, string> = {turf: 'Turf game', quest: 'Rally game', rally: 'Rally game', mentor: 'Mentors', ahead: 'Mentors', discover: 'Discover', game: 'Game'};
  return `${names[kind] ?? kind}${id ? ` #${id}` : ''}`;
}

export default async function PrivacyPage({searchParams}: {searchParams: Promise<Record<string, string | string[] | undefined>>}) {
  const user = await getSessionUser();
  if (!user) redirect('/auth');
  const sp = await searchParams;
  const [policies, audit, connections, events] = await Promise.all([getPolicies(user.id), listAudit(user.id, 40), listConnections(user.id), listVaultEvents(user.id, {limit: 500})]);
  const counts: Record<string, number> = {};
  for (const e of events) counts[e.source] = (counts[e.source] ?? 0) + 1;
  return (
    <VStack gap={4} paddingBlock={4}>
      <OnboardingGate userId={user.id} searchParams={sp} />
      <VStack gap={1}>
        <Heading level={1}>Activities privacy</Heading>
        <Text color="secondary">
          Raw data lives only in your Muse&apos;s vault. Everyone else gets answers at the level you set here. <Link href="/activities/muse">See what your Muse knows</Link>.
        </Text>
      </VStack>
      <PrivacyPanel initial={policies} />
      <Card id="audit">
        <VStack gap={3}>
          <Heading level={2}>Who asked my Muse what, and what it said</Heading>
          {audit.length === 0 ? (
            <EmptyState title="Nothing yet" description="As soon as a game, Discover or someone's Muse asks, it shows up here." isCompact />
          ) : (
            <List hasDividers density="compact">
              {audit.map(r => (
                <ListItem
                  key={r.id}
                  label={`${askerLabel(r.asker)} asked “${QUESTION_LABEL[r.question] ?? r.question}” as ${AUDIENCE_LABEL[r.audience]?.toLowerCase() ?? r.audience}`}
                  description={`Said: ${r.answer ? describeAnswer(r.answer) : '—'} · ${LEVEL_LABEL[r.level]} · ${new Date(r.createdAt).toLocaleString(undefined, {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'})}`}
                />
              ))}
            </List>
          )}
        </VStack>
      </Card>
      <SourcesPanel connections={connections.map(publicConnection)} counts={counts} />
    </VStack>
  );
}
