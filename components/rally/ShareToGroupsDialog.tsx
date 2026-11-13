'use client';
import {useEffect, useState} from 'react';
import {Avatar} from '@astryxdesign/core/Avatar';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {CheckboxInput} from '@astryxdesign/core/CheckboxInput';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {Layout, LayoutContent, LayoutFooter} from '@astryxdesign/core/Layout';
import {List, ListItem} from '@astryxdesign/core/List';
import {NumberInput} from '@astryxdesign/core/NumberInput';
import {Spinner} from '@astryxdesign/core/Spinner';
import {Text} from '@astryxdesign/core/Text';
import {TextArea} from '@astryxdesign/core/TextArea';
import {VStack} from '@astryxdesign/core/VStack';

type Target = {id: number; name: string; iconUrl: string; privacy: 'public' | 'private'; memberCount: number; posted: boolean; member: boolean; score: number};

/** Post a quest into the viewer's groups as a sign-up post with a spot limit. Relevant groups come preselected. */
export function ShareToGroupsDialog({questId, open, onClose}: {questId: number; open: boolean; onClose: () => void}) {
  const [groups, setGroups] = useState<Target[] | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [spots, setSpots] = useState(10);
  const [going, setGoing] = useState(1);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState<Target[] | null>(null);

  useEffect(() => {
    if (!open) return;
    setPosted(null);
    setError(null);
    fetch(`/api/quests/${questId}/share`, {cache: 'no-store'})
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('load failed'))))
      .then((d: {groups: Target[]; capacity: number | null; going: number}) => {
        setGroups(d.groups);
        setPicked(new Set(d.groups.filter(g => g.score > 0 && !g.posted).map(g => g.id)));
        setGoing(d.going);
        setSpots(Math.max(d.capacity ?? 10, d.going, 2));
      })
      .catch(() => setError('Could not load your groups.'));
  }, [open, questId]);

  const toggle = (id: number) =>
    setPicked(p => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/quests/${questId}/share`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({groupIds: [...picked], spots, note})});
    const d = (await res.json().catch(() => ({}))) as {posted?: number[]; error?: string};
    setBusy(false);
    if (!res.ok) return setError(d.error ?? 'Could not post.');
    setPosted((groups ?? []).filter(g => d.posted?.includes(g.id)));
  }

  const suggested = (groups ?? []).filter(g => g.score > 0);
  const others = (groups ?? []).filter(g => g.score === 0);
  const minSpots = Math.max(2, going);
  const section = (title: string, list: Target[]) =>
    list.length > 0 && (
      <VStack gap={1}>
        <Heading level={4}>{title}</Heading>
        <List density="compact">
          {list.map(g => (
            <ListItem
              key={g.id}
              startContent={<CheckboxInput label={`Post to ${g.name}`} isLabelHidden value={picked.has(g.id)} isDisabled={g.posted} onChange={() => toggle(g.id)} />}
              label={
                <HStack gap={2} vAlign="center">
                  <Avatar src={g.iconUrl} name={g.name} size="md" shape="rounded" />
                  <Text weight="bold">{g.name}</Text>
                </HStack>
              }
              description={g.posted ? 'Already posted' : `${g.privacy === 'private' ? 'Private' : 'Public'} · ${g.memberCount} members${g.member ? '' : ' · posting joins you'}`}
              onClick={g.posted ? undefined : () => toggle(g.id)}
              isDisabled={g.posted}
            />
          ))}
        </List>
      </VStack>
    );

  return (
    <Dialog isOpen={open} onOpenChange={o => !o && onClose()} purpose="form" width={520}>
      <Layout
        header={<DialogHeader title="Post to groups" subtitle={posted ? undefined : 'Group members can sign up until the spots run out. Joining adds them to this quest and its chat.'} onOpenChange={() => onClose()} />}
        content={
          <LayoutContent>
            {posted ? (
              <Text>{posted.length ? `Posted to ${posted.map(g => g.name).join(', ')}. Members can join until all ${spots} spots are taken.` : 'Nothing new to post: it is already in those groups.'}</Text>
            ) : (
              <VStack gap={4}>
                {!groups && !error && <Spinner label="Loading your groups…" />}
                {groups?.length === 0 && <EmptyState title="No groups to post to yet" description="Find or create a group first." actions={<Button label="Find a group" href="/groups" />} isCompact />}
                {section('Suggested for this activity', suggested)}
                {section(suggested.length ? 'Your other groups' : 'Your groups', others)}
                <NumberInput label="Spots" description={`Including the ${going} already in`} value={spots} onChange={setSpots} min={minSpots} max={100} isIntegerOnly />
                <TextArea label="Add a note" isOptional rows={2} maxLength={500} value={note} onChange={setNote} placeholder="Saturday 8am at the Katy Trail. All paces welcome." />
                {error && <Banner status="error" title={error} />}
              </VStack>
            )}
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} hAlign="end" vAlign="center">
              {posted ? (
                <>
                  {posted[0] && <Button label="View post" variant="primary" href={`/groups/${posted[0].id}`} />}
                  <Button label="Done" onClick={onClose} />
                </>
              ) : (
                <>
                  {groups && groups.length > 0 && picked.size === 0 && (
                    <Text type="supporting" color="secondary">
                      Tick a group to post.
                    </Text>
                  )}
                  <Button label={picked.size > 1 ? `Post to ${picked.size} groups` : 'Post'} variant="primary" isLoading={busy} isDisabled={picked.size === 0 || spots < minSpots || spots > 100} onClick={() => void submit()} />
                </>
              )}
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
