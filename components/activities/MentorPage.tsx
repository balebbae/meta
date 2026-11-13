'use client';

import {useRouter} from 'next/navigation';
import {useState} from 'react';
import type {MentorConsent, MentorRequestView} from '@/lib/activities/mentor';
import type {MentorMatch} from '@/lib/activities/discover';
import {UserRound} from 'lucide-react';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {CheckboxInput} from '@astryxdesign/core/CheckboxInput';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Grid} from '@astryxdesign/core/Grid';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {Icon} from '@astryxdesign/core/Icon';
import {List, ListItem} from '@astryxdesign/core/List';
import {NumberInput} from '@astryxdesign/core/NumberInput';
import {Selector} from '@astryxdesign/core/Selector';
import {Text} from '@astryxdesign/core/Text';
import {TextArea} from '@astryxdesign/core/TextArea';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Token} from '@astryxdesign/core/Token';
import {VStack} from '@astryxdesign/core/VStack';

const person = <Icon icon={UserRound} size="md" color="secondary" />;
const statusToken = (r: MentorRequestView) => <Token label={statusLabel(r)} size="sm" color={r.connect === 'requested' ? 'orange' : 'blue'} />;

type Offer = {metric: string; fromValue: string; toValue: string; weeks: number; consent: MentorConsent; anonymous: boolean};
const METRICS = ['5k time', 'Weekly distance', 'Workouts per week', 'Active days', 'Bench press'];
const json = (method: string, body?: unknown) => ({method, headers: {'content-type': 'application/json'}, body: body ? JSON.stringify(body) : undefined});

function statusLabel(r: MentorRequestView): string {
  if (r.status === 'revoked') return 'stopped';
  if (r.connect === 'connected') return 'connected';
  if (r.connect === 'requested') return r.role === 'mentor' ? 'wants to connect' : 'connect sent';
  return r.plan ? 'advice ready' : 'asking…';
}

/** /activities/ahead: people a few months ahead, conversations through your Muse, and opting in to help. */
export function MentorPage({offer: initialOffer, matches, requests, adult, highlight}: {offer: Offer | null; matches: MentorMatch[]; requests: MentorRequestView[]; adult: boolean; highlight: number | null}) {
  const router = useRouter();
  const [offer, setOffer] = useState<Offer | null>(initialOffer);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    metric: initialOffer?.metric ?? '',
    fromValue: initialOffer?.fromValue ?? '',
    toValue: initialOffer?.toValue ?? '',
    weeks: initialOffer?.weeks || 12,
    consent: {workouts: true, steps: false, heart: false, sleep: false, offerText: '', ...(initialOffer?.consent ?? {})} as MentorConsent,
    confirm18: !!initialOffer,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const save = async () => {
    setBusy('save');
    setError(null);
    const res = await fetch('/api/mentor/offers', json('POST', {...form, anonymous: true}));
    const d = (await res.json().catch(() => ({}))) as {offer?: Offer; error?: string};
    setBusy(null);
    if (!res.ok) return setError(d.error ?? 'Could not save');
    setOffer(d.offer ?? null);
    setEditing(false);
  };
  const remove = async () => {
    setBusy('remove');
    await fetch('/api/mentor/offers', json('DELETE'));
    setOffer(null);
    setBusy(null);
  };
  const start = async (mentorId: number, connect: boolean) => {
    setBusy(`${connect ? 'con' : 'ask'}-${mentorId}`);
    setError(null);
    const res = await fetch('/api/mentor/requests', json('POST', {mentorId, connect}));
    const d = (await res.json().catch(() => ({}))) as {id?: number; error?: string};
    setBusy(null);
    if (!res.ok) return setError(d.error ?? 'Could not reach their Muse');
    router.push(`/activities/ahead/${d.id}`);
  };

  const incoming = requests.filter(r => r.role === 'mentor');
  const outgoing = requests.filter(r => r.role === 'seeker');
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm(f => ({...f, [k]: v}));
  const setConsent = (k: keyof MentorConsent, v: boolean | string) => setForm(f => ({...f, consent: {...f.consent, [k]: v}}));
  const showForm = editing || !offer;

  return (
    <VStack gap={4} paddingBlock={4}>
      <VStack gap={1} hAlign="start">
        <Button label="Activities" variant="ghost" size="sm" icon={<Icon icon="chevronLeft" />} href="/activities" />
        <Heading level={1}>A few months ahead</Heading>
        <Text color="secondary">
          People who are where you want to be in about 3 months. Ask their Muse what to do, or connect and keep talking. You only ever talk through your Muses, and names stay hidden unless you both choose to share. 18+ only.
        </Text>
      </VStack>

      {!adult && <Banner status="warning" title="This is 18+" description="Your profile birthday says you're under 18, so this page is read-only." />}
      {error && <Banner status="error" title={error} isDismissable onDismiss={() => setError(null)} />}

      {incoming.length > 0 && (
        <Card aria-label="People your Muse is helping">
          <VStack gap={2}>
            <Heading level={2}>Your Muse is helping</Heading>
            <List hasDividers>
              {incoming.map(r => (
                <ListItem
                  key={r.id}
                  href={`/activities/ahead/${r.id}`}
                  startContent={person}
                  label={r.seeker?.name ?? 'Someone a few months behind you'}
                  description={r.connect === 'requested' ? 'Wants to keep talking through your Muses' : r.connect === 'connected' ? 'Connected through your Muses' : 'Your Muse answered their questions'}
                  endContent={statusToken(r)}
                />
              ))}
            </List>
          </VStack>
        </Card>
      )}

      <Card aria-label="A few months ahead of you">
        <VStack gap={3}>
          <VStack gap={1}>
            <Heading level={2}>A few months ahead of you</Heading>
            <Text type="supporting" color="secondary">
              Matched on rounded activity from the last 7 days (and progress records people chose to share), never raw data.
            </Text>
          </VStack>
          {matches.length === 0 ? (
            <EmptyState title="Nobody matches yet" description="Log a few workouts or add goal tags and check back." isCompact />
          ) : (
            <List hasDividers>
              {matches.map(m => {
                const existing = outgoing.find(r => r.id === m.requestId);
                return (
                  <ListItem
                    key={m.mentorId}
                    isSelected={highlight === m.mentorId}
                    startContent={person}
                    label={<Text weight="bold">{m.title}</Text>}
                    description={`${m.subtitle} · ${m.why}`}
                    endContent={
                      m.requestId && m.status !== 'revoked' ? (
                        <Button label={existing ? statusLabel(existing) : 'Open'} size="sm" href={`/activities/ahead/${m.requestId}`} />
                      ) : (
                        <HStack gap={1.5} wrap="wrap">
                          <Button label="Ask their Muse" variant="primary" size="sm" isLoading={busy === `ask-${m.mentorId}`} isDisabled={!adult || (!!busy && busy !== `ask-${m.mentorId}`)} onClick={() => void start(m.mentorId, false)} />
                          <Button label="Connect" size="sm" isLoading={busy === `con-${m.mentorId}`} isDisabled={!adult || (!!busy && busy !== `con-${m.mentorId}`)} onClick={() => void start(m.mentorId, true)} />
                        </HStack>
                      )
                    }
                  />
                );
              })}
            </List>
          )}
        </VStack>
      </Card>

      {outgoing.length > 0 && (
        <Card aria-label="Your conversations">
          <VStack gap={2}>
            <Heading level={2}>Your conversations</Heading>
            <List hasDividers>
              {outgoing.map(r => (
                <ListItem key={r.id} href={`/activities/ahead/${r.id}`} startContent={person} label={r.mentor?.name ?? 'Someone a few months ahead'} description={r.plan ? r.plan.title : 'Their Muse is answering'} endContent={statusToken(r)} />
              ))}
            </List>
          </VStack>
        </Card>
      )}

      <Card aria-label="Help people a few months behind you">
        <VStack gap={4}>
          <VStack gap={1}>
            <Heading level={2}>Help people a few months behind you</Heading>
            <Text type="supporting" color="secondary">
              Opt in and your Muse answers beginners straight away from your rounded activity and your note. You get a summary of everything it said. Anyone who wants to keep talking asks first, and you choose whether to share your name.
            </Text>
          </VStack>
          {offer && !showForm ? (
            <VStack gap={3}>
              <List>
                <ListItem
                  label={<Text weight="bold">{offer.metric ? `${offer.metric}: ${offer.fromValue} → ${offer.toValue} in ${offer.weeks} weeks` : 'Matched on your activity'}</Text>}
                  description={`Your Muse may use: ${(['workouts', 'steps', 'heart', 'sleep'] as const).filter(k => offer.consent[k]).join(', ') || 'only your note'}`}
                  endContent={<Token label="On" size="sm" color="green" />}
                />
              </List>
              <HStack gap={2}>
                <Button label="Edit" onClick={() => setEditing(true)} />
                <Button label="Stop helping" variant="destructive" isLoading={busy === 'remove'} onClick={() => void remove()} />
              </HStack>
            </VStack>
          ) : (
            <VStack gap={3}>
              <TextArea label="What worked for you" description="Your Muse uses this in its answers" rows={3} value={form.consent.offerText ?? ''} onChange={v => setConsent('offerText', v)} placeholder="Two easy runs, one longer run a week, and never skipping two weeks in a row." />
              <Selector label="Progress record" isOptional options={[{value: '', label: 'None, match on my activity'}, ...METRICS.map(m => ({value: m, label: m}))]} value={form.metric} onChange={v => set('metric', v)} />
              {form.metric && (
                <Grid columns={{minWidth: 140}} gap={3}>
                  <NumberInput label="Weeks it took" min={1} max={104} isIntegerOnly value={form.weeks} onChange={v => set('weeks', v)} />
                  <TextInput label="From" value={form.fromValue} onChange={v => set('fromValue', v)} placeholder="29:10" />
                  <TextInput label="To" value={form.toValue} onChange={v => set('toValue', v)} placeholder="24:40" />
                </Grid>
              )}
              <VStack gap={2}>
                <Text type="label">Your Muse may use (rounded, never exact)</Text>
                {(['workouts', 'steps', 'heart', 'sleep'] as const).map(k => (
                  <CheckboxInput key={k} label={k === 'workouts' ? 'Workouts & distance (needed to match you)' : k === 'steps' ? 'Steps' : k === 'heart' ? 'Heart rate (Muse only)' : 'Sleep (Muse only)'} value={!!form.consent[k]} onChange={v => setConsent(k, v)} />
                ))}
              </VStack>
              <CheckboxInput label="I confirm I'm 18 or older" value={form.confirm18} onChange={v => set('confirm18', v)} />
              <HStack gap={2}>
                <Button label={offer ? 'Save changes' : 'Let people find me'} variant="primary" isLoading={busy === 'save'} isDisabled={!adult || !form.confirm18} onClick={() => void save()} />
                {offer && <Button label="Cancel" onClick={() => setEditing(false)} />}
              </HStack>
            </VStack>
          )}
        </VStack>
      </Card>
    </VStack>
  );
}
