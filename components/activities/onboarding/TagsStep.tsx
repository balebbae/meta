'use client';
import {useState} from 'react';
import {StepShell} from './StepShell';
import {ACTIVITY_TAGS, GOAL_TAGS, STYLE_TAGS, type TagKind, type UserTag} from '@/lib/activities/types';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {Selector} from '@astryxdesign/core/Selector';
import {Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {ToggleButton} from '@astryxdesign/core/ToggleButton';
import {Token} from '@astryxdesign/core/Token';
import {VStack} from '@astryxdesign/core/VStack';

const GROUPS: {kind: TagKind; title: string; hint: string; tags: string[]}[] = [
  {kind: 'activity', title: 'Activities', hint: 'Pick what you do or want to try.', tags: ACTIVITY_TAGS},
  {kind: 'goal', title: 'Goals', hint: 'What should the next few weeks do for you?', tags: GOAL_TAGS},
  {kind: 'style', title: 'Style', hint: 'How you like to move.', tags: STYLE_TAGS},
];

export function TagsStep({initial, invite}: {initial: UserTag[]; invite: number | null}) {
  const [picked, setPicked] = useState<Map<string, {tag: string; kind: TagKind}>>(() => new Map(initial.filter(t => t.kind !== 'constraint').map(t => [`${t.kind}:${t.tag}`, {tag: t.tag, kind: t.kind}])));
  const [custom, setCustom] = useState('');
  const [customKind, setCustomKind] = useState<TagKind>('activity');
  const constraints = initial.filter(t => t.kind === 'constraint');

  function toggle(kind: TagKind, tag: string) {
    const key = `${kind}:${tag}`;
    const m = new Map(picked);
    if (m.has(key)) m.delete(key);
    else m.set(key, {tag, kind});
    setPicked(m);
  }
  function addCustom() {
    const tag = custom.trim().replace(/\s+/g, ' ').slice(0, 40);
    if (!tag) return;
    toggle(customKind, tag[0].toUpperCase() + tag.slice(1));
    setCustom('');
  }

  async function save() {
    const tags = [...picked.values()];
    const res = await fetch('/api/activities/onboarding', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({tags})});
    if (!res.ok) throw new Error('Could not save tags');
  }

  return (
    <StepShell step="tags" invite={invite} save={save}>
      <Text color="secondary">Activities and goals are visible to friends by default; anything you mark as a limit is Muse-only. Change either later under Privacy.</Text>
      {GROUPS.map(g => {
        const customs = [...picked.values()].filter(t => t.kind === g.kind && !g.tags.includes(t.tag));
        return (
          <Card key={g.kind}>
            <VStack gap={3}>
              <VStack gap={1}>
                <HStack gap={2} vAlign="center">
                  <Heading level={2}>{g.title}</Heading>
                  <Token label="friends" size="sm" />
                </HStack>
                <Text type="supporting" color="secondary">
                  {g.hint}
                </Text>
              </VStack>
              <HStack gap={2} wrap="wrap">
                {[...g.tags, ...customs.map(c => c.tag)].map(tag => (
                  <ToggleButton key={tag} label={tag} size="sm" isPressed={picked.has(`${g.kind}:${tag}`)} onPressedChange={() => toggle(g.kind, tag)} />
                ))}
              </HStack>
            </VStack>
          </Card>
        );
      })}
      <Card>
        <VStack gap={3}>
          <Heading level={2}>Something else?</Heading>
          <HStack gap={2} vAlign="end" wrap="wrap">
            <TextInput label="Custom tag" isLabelHidden placeholder="Rowing, bouldering, dog walks…" value={custom} onChange={setCustom} onEnter={addCustom} />
            <Selector
              label="Tag group"
              isLabelHidden
              options={[
                {value: 'activity', label: 'Activity'},
                {value: 'goal', label: 'Goal'},
                {value: 'style', label: 'Style'},
              ]}
              value={customKind}
              onChange={v => setCustomKind(v as TagKind)}
            />
            <Button label="Add" isDisabled={!custom.trim()} onClick={addCustom} />
          </HStack>
          {constraints.length > 0 && (
            <Text type="supporting" color="secondary">
              Muse-only: {constraints.map(c => c.tag).join(', ')}
            </Text>
          )}
        </VStack>
      </Card>
    </StepShell>
  );
}
