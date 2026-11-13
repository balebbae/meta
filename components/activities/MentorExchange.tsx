'use client';

import {useCallback, useEffect, useState} from 'react';
import type {ConnectAction, ExchangeEvent, MentorRequestView, Plan, RelayMessage, Turn} from '@/lib/activities/mentor';
// Tabler icons, aliased to the names this file already uses
import {IconUser as UserRound} from '@tabler/icons-react';
import {Avatar} from '@astryxdesign/core/Avatar';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {ChatComposer, ChatMessage, ChatMessageBubble, ChatMessageList} from '@astryxdesign/core/Chat';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {Icon} from '@astryxdesign/core/Icon';
import {Link} from '@astryxdesign/core/Link';
import {List, ListItem} from '@astryxdesign/core/List';
import {Spinner} from '@astryxdesign/core/Spinner';
import {Text} from '@astryxdesign/core/Text';
import {useToast} from '@astryxdesign/core/Toast';
import {Token} from '@astryxdesign/core/Token';
import {VStack} from '@astryxdesign/core/VStack';

const museAvatar = (mine: boolean) => <Avatar name={mine ? 'Your Muse' : 'Their Muse'} size="sm" />;

const json = (method: string, body?: unknown) => ({method, headers: {'content-type': 'application/json'}, body: body ? JSON.stringify(body) : undefined});
const POLL_MS = 4000;

/** /activities/ahead/[id]: the advice exchange (streams once), then connect → a thread relayed by both Muses. */
export function MentorExchange({initial}: {initial: MentorRequestView}) {
  const [req, setReq] = useState(initial);
  const [turns, setTurns] = useState<Turn[]>(initial.transcript);
  const [plan, setPlan] = useState<Plan | null>(initial.plan);
  const [offline, setOffline] = useState<boolean | null>(initial.museOffline);
  const [typing, setTyping] = useState<'seeker' | 'mentor' | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const showToast = useToast();
  const [thread, setThread] = useState<RelayMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);

  const isSeeker = req.role === 'seeker';
  const them = isSeeker ? req.mentor : req.seeker;
  const themLabel = them?.name ?? (isSeeker ? 'Someone a few months ahead' : 'Someone a few months behind you');
  const theirMuse = them ? `${them.name.split(' ')[0]}’s Muse` : 'Their Muse';
  const connected = req.connect === 'connected' && req.status !== 'revoked';

  useEffect(() => {
    if (req.status !== 'accepted' || plan) return;
    setStreaming(true);
    const es = new EventSource(`/api/mentor/requests/${req.id}/stream`);
    es.onmessage = ev => {
      const e = JSON.parse(ev.data) as ExchangeEvent;
      if (e.type === 'typing') setTyping(e.who);
      else if (e.type === 'turn') {
        setTyping(null);
        setTurns(t => [...t, e.turn]);
      } else if (e.type === 'plan') {
        setTyping(null);
        setPlan(e.plan);
        setOffline(e.museOffline);
        setReq(r => ({...r, status: 'completed'}));
      } else if (e.type === 'done' || e.type === 'error') {
        setTyping(null);
        setStreaming(false);
        es.close();
      }
    };
    es.onerror = () => {
      setTyping(null);
      setStreaming(false);
      es.close();
    };
    return () => es.close();
  }, [req.id, req.status, plan]);

  // Thread + connect state poll (the other side may accept, reveal or reply at any time)
  const lastId = thread[thread.length - 1]?.id ?? 0;
  const poll = useCallback(async () => {
    try {
      const [t, r] = await Promise.all([
        connected ? fetch(`/api/mentor/requests/${req.id}/relay?after=${lastId}`, {cache: 'no-store'}).then(x => (x.ok ? x.json() : {messages: []})) : Promise.resolve({messages: []}),
        fetch(`/api/mentor/requests/${req.id}`, {cache: 'no-store'}).then(x => (x.ok ? x.json() : null)),
      ]);
      const fresh = (t as {messages: RelayMessage[]}).messages;
      if (fresh.length) setThread(prev => [...prev, ...fresh.filter(m => !prev.some(p => p.id === m.id))]);
      const next = (r as {request?: MentorRequestView} | null)?.request;
      if (next) setReq(prev => ({...prev, connect: next.connect, reveal: next.reveal, seeker: next.seeker, mentor: next.mentor, status: prev.status === 'completed' && next.status === 'accepted' ? prev.status : next.status}));
    } catch {
      /* keep last good state */
    }
  }, [connected, lastId, req.id]);

  useEffect(() => {
    void poll();
    const t = setInterval(() => void poll(), POLL_MS);
    return () => clearInterval(t);
  }, [poll]);

  const act = async (action: ConnectAction) => {
    setBusy(action);
    const res = await fetch(`/api/mentor/requests/${req.id}/connect`, json('POST', {action}));
    const d = (await res.json().catch(() => ({}))) as {request?: MentorRequestView};
    setBusy(null);
    if (res.ok && d.request) setReq(r => ({...r, ...d.request!, transcript: r.transcript, plan: r.plan ?? d.request!.plan}));
  };
  const send = async (text = draft) => {
    if (!text.trim()) return;
    setBusy('send');
    setSendError(null);
    const res = await fetch(`/api/mentor/requests/${req.id}/relay`, json('POST', {text}));
    const d = (await res.json().catch(() => ({}))) as {messages?: RelayMessage[]; error?: string};
    setBusy(null);
    if (!res.ok) return setSendError(d.error ?? 'Your Muse could not pass that on.');
    setDraft('');
    setThread(prev => [...prev, ...(d.messages ?? []).filter(m => !prev.some(p => p.id === m.id))]);
  };
  const revoke = async () => {
    setBusy('revoke');
    const res = await fetch(`/api/mentor/requests/${req.id}`, json('DELETE'));
    setBusy(null);
    if (res.ok) setReq(r => ({...r, status: 'revoked'}));
  };

  return (
    <VStack gap={4} paddingBlock={4}>
      <VStack gap={1} hAlign="start">
        <Button label="Mentors" variant="ghost" size="sm" icon={<Icon icon="chevronLeft" />} href="/activities/ahead" />
        <Heading level={1}>{req.offer.metric ? `${req.offer.metric}: ${req.offer.fromValue} → ${req.offer.toValue}` : isSeeker ? 'Where you want to be in 3 months' : 'Someone a few months behind you'}</Heading>
        <HStack gap={2} vAlign="center" wrap="wrap">
          <Text color="secondary">Everything here goes through your Muses. Neither of you sees the other&apos;s raw data or words.</Text>
          {offline === true && <Token label="Muse offline: scripted answers" size="sm" color="gray" />}
        </HStack>
      </VStack>

      <Card>
        <VStack gap={3}>
          <HStack gap={3} vAlign="center">
            {them ? <Avatar src={them.avatarUrl} name={them.name} size="lg" /> : <Icon icon={UserRound} size="lg" color="secondary" />}
            <VStack gap={0.5}>
              <Text weight="bold">{them ? <Link href={`/profile/${them.id}`}>{them.name}</Link> : themLabel}</Text>
              <Text type="supporting" color="secondary">
                {them ? 'You both chose to share your names.' : connected ? (req.reveal.them ? 'They shared their name. Share yours to see who they are.' : 'Names stay hidden unless you both share.') : 'Name hidden.'}
              </Text>
            </VStack>
          </HStack>
          {req.status !== 'revoked' && (
            <VStack gap={2}>
              {isSeeker && req.connect === 'requested' && <Text color="secondary">Connect request sent. You&apos;ll get a notification when they answer.</Text>}
              {req.connect === 'declined' && <Text color="secondary">{isSeeker ? 'They chose not to connect. The advice below is still yours.' : 'You chose not to connect.'}</Text>}
              {!isSeeker && req.connect === 'requested' && <Text color="secondary">They&apos;d like to keep talking. Messages go through your Muses both ways, and your name stays hidden unless you share it.</Text>}
              <HStack gap={2} wrap="wrap">
                {isSeeker && req.connect === 'none' && <Button label="Connect: keep talking through your Muses" variant="primary" isLoading={busy === 'request'} isDisabled={!!busy && busy !== 'request'} onClick={() => void act('request')} />}
                {!isSeeker && req.connect === 'requested' && (
                  <>
                    <Button label="Accept" variant="primary" isLoading={busy === 'accept'} isDisabled={!!busy && busy !== 'accept'} onClick={() => void act('accept')} />
                    <Button label="Decline" isDisabled={!!busy} onClick={() => void act('decline')} />
                  </>
                )}
                {connected && <Button label={req.reveal.me ? 'Hide my name' : 'Share my name'} isDisabled={!!busy} onClick={() => void act(req.reveal.me ? 'hide' : 'reveal')} />}
              </HStack>
            </VStack>
          )}
          {req.status === 'revoked' && <Text color="secondary">Stopped. You both keep what&apos;s below; no new messages can be sent.</Text>}
        </VStack>
      </Card>

      {(turns.length > 0 || typing || streaming) && (
        <Card aria-label="Advice from their Muse">
          <VStack gap={3}>
            <VStack gap={1}>
              <Heading level={2}>{isSeeker ? 'Your Muse asked theirs' : 'Their Muse asked yours'}</Heading>
              <Text type="supporting" color="secondary">
                {isSeeker ? 'Your' : 'Their'} Muse asks three questions; {isSeeker ? 'theirs' : 'yours'} answers from consented, rounded activity and {isSeeker ? 'their' : 'your'} note only.
              </Text>
            </VStack>
            <ChatMessageList align="top" isStreaming={streaming}>
              {turns.map((t, i) => {
                const mine = (t.role === 'seeker') === isSeeker;
                return (
                  <ChatMessage key={i} sender={mine ? 'user' : 'assistant'} name={mine ? 'Your Muse' : theirMuse} avatar={museAvatar(mine)}>
                    <ChatMessageBubble>{t.text}</ChatMessageBubble>
                  </ChatMessage>
                );
              })}
              {typing && (
                <ChatMessage sender={(typing === 'seeker') === isSeeker ? 'user' : 'assistant'} avatar={museAvatar((typing === 'seeker') === isSeeker)}>
                  <ChatMessageBubble>
                    <Spinner size="sm" label="typing" />
                  </ChatMessageBubble>
                </ChatMessage>
              )}
            </ChatMessageList>
          </VStack>
        </Card>
      )}

      {plan && (
        <Card variant="blue" aria-label="Plan">
          <VStack gap={3}>
            <VStack gap={1}>
              <Heading level={2}>{plan.title}</Heading>
              <Text type="supporting" color="secondary">
                {plan.weeks} weeks · written by {offline ? 'a template (Muse offline)' : 'Muse Spark'} from the answers above
              </Text>
            </VStack>
            <List listStyle="decimal" density="compact">
              {plan.steps.map((st, i) => (
                <ListItem key={i} label={st} />
              ))}
            </List>
            <Text type="supporting" color="secondary">
              {plan.note}
            </Text>
            <HStack>
              <Button
                label="Copy plan"
                onClick={() => {
                  void navigator.clipboard?.writeText(`${plan.title}\n${plan.steps.join('\n')}`);
                  showToast({body: 'Plan copied', autoHideDuration: 2000});
                }}
              />
            </HStack>
          </VStack>
        </Card>
      )}

      {(connected || thread.length > 0) && (
        <Card aria-label="Through your Muses">
          <VStack gap={3}>
            <VStack gap={1}>
              <Heading level={2}>Through your Muses</Heading>
              <Text type="supporting" color="secondary">
                Write to your Muse. It removes names, contact details and health numbers, rewrites the message and passes it on. Only you see what you typed.
              </Text>
            </VStack>
            <ChatMessageList align="top" emptyState={<Text color="secondary">{isSeeker ? 'Ask anything about how they got there.' : 'Nothing yet. You will get a notification when they write.'}</Text>}>
              {thread.map(m => {
                const mineSide = m.fromRole === req.role;
                const label = m.kind === 'data_answer' ? (mineSide ? 'Your Muse, from your activity' : `${theirMuse}, from their activity`) : mineSide ? 'Your Muse passed on' : theirMuse;
                return (
                  <ChatMessage
                    key={m.id}
                    sender={mineSide ? 'user' : 'assistant'}
                    name={`${label}${m.museUsed ? '' : ' (as written, Muse offline)'}`}
                    avatar={museAvatar(mineSide)}
                    metadata={m.rawText && m.rawText !== m.text ? `You wrote: ${m.rawText}` : undefined}>
                    <ChatMessageBubble>{m.text}</ChatMessageBubble>
                  </ChatMessage>
                );
              })}
            </ChatMessageList>
            {connected && (
              <ChatComposer
                value={draft}
                onChange={v => setDraft(v.slice(0, 600))}
                onSubmit={v => void send(v)}
                placeholder={isSeeker ? 'Ask how they handled a bad week…' : 'Reply through your Muse…'}
                isDisabled={busy === 'send'}
                status={sendError ? {type: 'error', message: sendError} : undefined}
              />
            )}
          </VStack>
        </Card>
      )}

      {req.status !== 'revoked' && (
        <HStack>
          <Button label="Stop: no more messages (keeps what's here)" variant="destructive" isLoading={busy === 'revoke'} onClick={() => void revoke()} />
        </HStack>
      )}
    </VStack>
  );
}
