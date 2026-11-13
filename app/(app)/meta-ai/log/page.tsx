import type {Metadata} from 'next';
import {notFound, redirect} from 'next/navigation';
import {Card} from '@astryxdesign/core/Card';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {List, ListItem} from '@astryxdesign/core/List';
import {Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import {VStack} from '@astryxdesign/core/VStack';
import {getSessionUser} from '@/lib/auth';
import {sql} from '@/lib/db';

export const metadata: Metadata = {title: 'Muse call log | Facebook'};
export const dynamic = 'force-dynamic';

type Row = {id: number; task: string; model: string; ok: boolean; cached: boolean; ms: number; input_chars: number; output_preview: string | null; error: string | null; created_at: string};

/** Every Muse call the app made: task, model, latency, cache hits and failures. */
export default async function MuseLogPage() {
  const user = await getSessionUser();
  if (!user) redirect('/auth');
  // Output previews can quote other people's content, so only listed accounts see the log.
  const allowed = (process.env.MUSE_INSPECTOR_EMAILS ?? 'judge@demo.com').split(',').map(s => s.trim().toLowerCase());
  if (!allowed.includes(user.email.toLowerCase())) notFound();

  const rows = (await sql`select id, task, model, ok, cached, ms, input_chars, output_preview, error, created_at
    from muse_calls order by created_at desc limit 50`.catch(() => [])) as Row[];
  const okRows = rows.filter(r => r.ok && !r.cached);
  const median = okRows.length ? okRows.map(r => r.ms).sort((a, b) => a - b)[Math.floor(okRows.length / 2)] : 0;

  return (
    <VStack gap={3} padding={4}>
      <Card>
        <VStack gap={2}>
          <Heading level={1}>Muse call log</Heading>
          <Text color="secondary">The last {rows.length} Muse calls across Activities: which model, how long it took, and whether a cached reply covered an outage. Prompts are not stored, only their size.</Text>
          <HStack gap={2} wrap="wrap">
            <Token label={`${okRows.length} live`} size="sm" color="green" />
            <Token label={`${rows.filter(r => r.cached).length} from cache`} size="sm" color="yellow" />
            <Token label={`${rows.filter(r => !r.ok).length} failed`} size="sm" color="red" />
            <Token label={`median ${(median / 1000).toFixed(1)} s`} size="sm" />
          </HStack>
        </VStack>
      </Card>
      <Card>
        {rows.length === 0 ? (
          <EmptyState title="No Muse calls yet" description="Make a move, ask the coach or build a quest, then refresh." isCompact />
        ) : (
          <List hasDividers density="compact">
            {rows.map(r => (
              <ListItem
                key={r.id}
                label={`${r.task} · ${r.model}`}
                description={`${new Date(r.created_at).toLocaleTimeString('en-US', {timeZone: 'America/Chicago'})} · ${r.input_chars.toLocaleString()} chars in · ${r.error && !r.cached ? r.error : (r.output_preview ?? '')}`}
                endContent={<Token label={r.cached ? 'cache' : r.ok ? `${(r.ms / 1000).toFixed(1)} s` : 'failed'} size="sm" color={r.cached ? 'yellow' : r.ok ? 'default' : 'red'} />}
              />
            ))}
          </List>
        )}
      </Card>
    </VStack>
  );
}
