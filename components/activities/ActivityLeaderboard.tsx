'use client';

import {useEffect, useState} from 'react';
import {Avatar} from '@astryxdesign/core/Avatar';
import {Card} from '@astryxdesign/core/Card';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {InfoTip} from '@astryxdesign/core/InfoTip';
import {List, ListItem} from '@astryxdesign/core/List';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import {VStack} from '@astryxdesign/core/VStack';

type Row = {userId: number; name: string; avatarUrl: string; xp: number};
type Tab = 'fitness' | 'closeness';

/** The Activities leaderboard (same API as the right-rail one, which keeps Facebook styling). */
export function ActivityLeaderboard() {
  const [tab, setTab] = useState<Tab>('fitness');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError(null);
    fetch(tab === 'fitness' ? '/api/leaderboard?tab=fitness' : '/api/leaderboard')
      .then(async res => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
        return res.json() as Promise<{rows: Row[]}>;
      })
      .then(d => !cancelled && setRows(d.rows ?? []))
      .catch(err => !cancelled && setError(err instanceof Error ? err.message : 'Unavailable'));
    return () => {
      cancelled = true;
    };
  }, [tab]);

  return (
    <Card aria-label="Leaderboard">
      <VStack gap={3}>
        <HStack gap={2} vAlign="center" justify="between" wrap="wrap">
          <HStack gap={1} vAlign="center">
            <Heading level={2}>Leaderboard</Heading>
            <InfoTip content={tab === 'fitness' ? 'Rally XP from real moves this week. Only who moved, never how far or how fast.' : 'XP for meaningful contact — comments, voice notes, check-ins.'} label="How XP works" size="xsm" />
          </HStack>
          <SegmentedControl label="Leaderboard type" value={tab} onChange={v => setTab(v as Tab)} size="sm">
            <SegmentedControlItem value="fitness" label="Fitness" />
            <SegmentedControlItem value="closeness" label="Closeness" />
          </SegmentedControl>
        </HStack>
        {error ? (
          <EmptyState title="Leaderboard unavailable" description={error} isCompact />
        ) : rows && rows.length === 0 ? (
          <EmptyState title="No XP yet" description={tab === 'fitness' ? 'Make a move in a quest.' : 'React or leave a voice note.'} isCompact />
        ) : (
          <List hasDividers density="compact">
            {(rows ?? []).slice(0, 10).map((r, i) => (
              <ListItem
                key={r.userId}
                href={`/profile/${r.userId}`}
                startContent={
                  <HStack gap={2} vAlign="center">
                    <Text weight="bold" color="secondary" hasTabularNumbers>
                      {i + 1}
                    </Text>
                    <Avatar src={r.avatarUrl} name={r.name} size="md" />
                  </HStack>
                }
                label={r.name}
                endContent={<Token label={`${r.xp} XP`} size="sm" color={i === 0 ? 'yellow' : 'default'} />}
              />
            ))}
          </List>
        )}
      </VStack>
    </Card>
  );
}
