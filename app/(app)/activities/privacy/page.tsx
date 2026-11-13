import Link from 'next/link';
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
import styles from '@/components/activities/activities.module.css';

export const dynamic = 'force-dynamic';

const QUESTION_LABEL: Record<string, string> = {
  workouts_this_week: 'workouts this week', active_days_this_week: 'active days this week', distance_this_week_km: 'distance this week', completed_move_today: 'completed a move today', completed_run_3km_today: 'ran 3 km today', steps_today: 'steps today', avg_hr_this_week: 'average heart rate this week', sleep_last_night_hours: 'sleep last night', last_workout: 'last workout',
  runs_2w: 'runs in the last 2 weeks', rides_2w: 'rides in the last 2 weeks', strength_2w: 'strength sessions in the last 2 weeks', yoga_2w: 'yoga sessions in the last 2 weeks', workouts_2w: 'workouts in the last 2 weeks',
};

function askerLabel(a: string): string {
  if (a.startsWith('preview')) return 'You (preview)';
  const [kind, id] = a.split(':');
  const names: Record<string, string> = {turf: 'Turf game', quest: 'Rally game', rally: 'Rally game', mentor: 'A few months ahead', ahead: 'A few months ahead', discover: 'Discover', game: 'Game'};
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
    <main className={styles.page}>
      <OnboardingGate userId={user.id} searchParams={sp} />
      <h1 className={styles.h1}>Activities privacy</h1>
      <p className={styles.sub}>
        Raw data lives only in your Muse&apos;s vault. Everyone else gets answers at the level you set here. <Link href="/activities/muse">See what your Muse knows</Link>.
      </p>
      <PrivacyPanel initial={policies} />
      <div className={styles.card} id="audit">
        <h2 className={styles.h2}>Who asked my Muse what, and what it said</h2>
        {audit.length === 0 ? (
          <p className={styles.sub}>Nothing yet. As soon as a game, Discover or someone's Muse asks, it shows up here.</p>
        ) : (
          <ul className={styles.list}>
            {audit.map(r => (
              <li key={r.id} className={styles.listItem}>
                <div className={styles.grow}>
                  <div className={styles.title}>
                    {askerLabel(r.asker)} asked <em>{QUESTION_LABEL[r.question] ?? r.question}</em> as {AUDIENCE_LABEL[r.audience]?.toLowerCase() ?? r.audience}
                  </div>
                  <div className={styles.small}>
                    Said: <strong>{r.answer ? describeAnswer(r.answer) : '—'}</strong> · {LEVEL_LABEL[r.level]} · {new Date(r.createdAt).toLocaleString(undefined, {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'})}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <SourcesPanel connections={connections.map(publicConnection)} counts={counts} />
    </main>
  );
}
