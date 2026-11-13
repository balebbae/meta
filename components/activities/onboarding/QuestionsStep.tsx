'use client';
import {useState} from 'react';
import {StepShell} from './StepShell';
import {SCHEDULE_OPTIONS, WEEKLY_OPTIONS, WITH_WHOM_OPTIONS, type StarterChatResult} from '@/lib/activities/starter-chat';
import type {ActivityProfile, StarterAnswers} from '@/lib/activities/onboarding';
import type {TagKind} from '@/lib/activities/types';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {CheckboxInput} from '@astryxdesign/core/CheckboxInput';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {Tab, TabList} from '@astryxdesign/core/TabList';
import {Text} from '@astryxdesign/core/Text';
import {TextArea} from '@astryxdesign/core/TextArea';
import {TextInput} from '@astryxdesign/core/TextInput';
import {ToggleButton} from '@astryxdesign/core/ToggleButton';
import {Token} from '@astryxdesign/core/Token';
import {VStack} from '@astryxdesign/core/VStack';

const WEEKLY_LABEL: Record<string, string> = {'0': 'Not yet', '1-2': '1–2 days', '3-4': '3–4 days', '5+': '5+ days'};
const GOALS = ['Get started', 'Be consistent', 'Train for an event', 'Get faster', 'Get stronger', 'Lose the phone and go outside', 'Sleep better', 'Do it with friends'];

export function QuestionsStep({profile, invite}: {profile: ActivityProfile; invite: number | null}) {
  const [mode, setMode] = useState<'tap' | 'chat'>('tap');
  const [a, setA] = useState<StarterAnswers>({weeklyActiveDays: profile.weeklyActiveDays, primaryGoal: profile.primaryGoal, schedule: profile.schedule ?? [], withWhom: profile.withWhom, goEasyNote: profile.goEasyNote, interestSuggestionsEnabled: profile.interestSuggestionsEnabled});
  const [chat, setChat] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [chatResult, setChatResult] = useState<StarterChatResult | null>(null);
  const [chatTags, setChatTags] = useState<{tag: string; kind: TagKind; on: boolean}[]>([]);

  async function askMuse() {
    if (!chat.trim()) return;
    setChatBusy(true);
    const res = await fetch('/api/activities/starter-chat', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({text: chat})});
    setChatBusy(false);
    if (!res.ok) return;
    const r = (await res.json()) as StarterChatResult;
    setChatResult(r);
    setChatTags(r.tags.map(t => ({...t, on: true})));
    setA(prev => ({...prev, ...Object.fromEntries(Object.entries(r.answers).filter(([, v]) => v != null && !(Array.isArray(v) && !v.length)))}));
  }

  async function save() {
    const body: {answers: StarterAnswers; tags?: {tag: string; kind: TagKind}[]} = {answers: a};
    const tags = chatTags.filter(t => t.on).map(({tag, kind}) => ({tag, kind}));
    if (tags.length) {
      // merge with already selected tags so the chat path adds rather than replaces
      const existing = (await fetch('/api/activities/tags').then(r => r.json()).catch(() => ({tags: []}))).tags as {tag: string; kind: TagKind}[];
      body.tags = [...existing.filter(t => t.kind !== 'constraint').map(({tag, kind}) => ({tag, kind})), ...tags.filter(t => !existing.some(e => e.kind === t.kind && e.tag === t.tag))];
    }
    const res = await fetch('/api/activities/onboarding', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)});
    if (!res.ok) throw new Error('Could not save answers');
  }

  const chip = (on: boolean, label: string, onClick: () => void) => <ToggleButton key={label} label={label} size="sm" isPressed={on} onPressedChange={onClick} />;
  const question = (title: string, body: React.ReactNode, hint?: string) => (
    <Card>
      <VStack gap={3}>
        <VStack gap={1}>
          <Heading level={2}>{title}</Heading>
          {hint && (
            <Text type="supporting" color="secondary">
              {hint}
            </Text>
          )}
        </VStack>
        {body}
      </VStack>
    </Card>
  );
  const chips = (children: React.ReactNode) => (
    <HStack gap={2} wrap="wrap">
      {children}
    </HStack>
  );

  return (
    <StepShell step="questions" invite={invite} save={save}>
      <Text color="secondary">Your Muse uses these to size your first games. Answers are Muse-only unless you share them later.</Text>
      <TabList value={mode} onChange={v => setMode(v as 'tap' | 'chat')} hasDivider>
        <Tab value="tap" label="Tap answers" />
        <Tab value="chat" label="Just tell my Muse" />
      </TabList>
      {mode === 'chat' && (
        <Card>
          <VStack gap={3}>
            <TextArea label="One message is enough" value={chat} onChange={setChat} rows={3} placeholder="“I used to run but mostly walk now, maybe twice a week. Evenings after work. I'd love to get back into it with my roommates. Bad left knee so nothing with jumping.”" />
            <HStack gap={2} vAlign="center" wrap="wrap">
              <Button label="Send to my Muse" variant="primary" isLoading={chatBusy} isDisabled={!chat.trim()} onClick={() => void askMuse()} />
              {chatResult && !chatResult.usedMuse && <Token label="Muse offline: keyword rules used" size="sm" color="gray" />}
            </HStack>
            {chatResult && (
              <VStack gap={2}>
                <Text type="supporting" color="secondary">
                  Here&apos;s what I got. Tap to toggle, then check the answers below.
                </Text>
                {chatTags.length ? (
                  chips(chatTags.map((t, i) => chip(t.on, `${t.tag} · ${t.kind}`, () => setChatTags(ts => ts.map((x, j) => (i === j ? {...x, on: !x.on} : x))))))
                ) : (
                  <Text type="supporting" color="secondary">
                    No tags spotted; pick some on the previous step.
                  </Text>
                )}
              </VStack>
            )}
          </VStack>
        </Card>
      )}
      {question('1. How many days a week do you move for 30+ minutes?', chips(WEEKLY_OPTIONS.map(o => chip(a.weeklyActiveDays === o, WEEKLY_LABEL[o], () => setA({...a, weeklyActiveDays: o})))))}
      {question('2. One goal for the next 4 weeks', chips(GOALS.map(g => chip(a.primaryGoal === g, g, () => setA({...a, primaryGoal: g})))))}
      {question(
        '3. When do you usually have time?',
        chips(
          SCHEDULE_OPTIONS.map(s => {
            const on = (a.schedule ?? []).includes(s);
            return chip(on, s, () => setA({...a, schedule: on ? (a.schedule ?? []).filter(x => x !== s) : [...(a.schedule ?? []), s]}));
          }),
        ),
      )}
      {question('4. Who with?', chips(WITH_WHOM_OPTIONS.map(o => chip(a.withWhom === o.id, o.label, () => setA({...a, withWhom: o.id})))))}
      {question(
        '5. Anything your Muse should go easy on?',
        <VStack gap={3}>
          <TextInput label="Go easy on" isLabelHidden isOptional value={a.goEasyNote ?? ''} onChange={v => setA({...a, goEasyNote: v})} placeholder="Optional: “left knee”, “low impact only”, “new to this”" />
          <CheckboxInput label="Let my Muse suggest tags from what I like on Facebook" description="Off by default; you confirm each one." value={Boolean(a.interestSuggestionsEnabled)} onChange={checked => setA({...a, interestSuggestionsEnabled: checked})} />
        </VStack>,
        'Muse-only. Never shown to anyone, never used as a label; it only shapes your targets.',
      )}
    </StepShell>
  );
}
