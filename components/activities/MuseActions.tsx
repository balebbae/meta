'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {CalendarDays, ShoppingBag, Sparkles} from 'lucide-react';
import {AspectRatio} from '@astryxdesign/core/AspectRatio';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Center} from '@astryxdesign/core/Center';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Grid} from '@astryxdesign/core/Grid';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {Icon} from '@astryxdesign/core/Icon';
import {Layout, LayoutContent, LayoutFooter} from '@astryxdesign/core/Layout';
import {Link} from '@astryxdesign/core/Link';
import {MetadataList, MetadataListItem} from '@astryxdesign/core/MetadataList';
import {StackItem} from '@astryxdesign/core/Stack';
import {Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import {VStack} from '@astryxdesign/core/VStack';
import type {MuseAction, MuseActionsPayload} from '@/lib/activities/actions';

const post = (body: unknown) => ({method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)});
const verb = (a: MuseAction) => (a.kind === 'event' ? 'Register' : 'Buy');
const doneLabel = (a: MuseAction) => (a.kind === 'event' ? 'Registered' : 'Ordered');

/** "From your Muse": private action items. Register and Buy are simulated: nothing is charged or sent out. */
export function MuseActions({initial, viewerName, say}: {initial: MuseActionsPayload; viewerName: string; say: (text: string) => void}) {
  const [data, setData] = useState(initial);
  const [asking, setAsking] = useState(false);
  const [open, setOpen] = useState<MuseAction | null>(null);
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  const ask = useCallback(
    async (useLocation: boolean) => {
      setAsking(true);
      try {
        // Only without a city on the profile, and only after a tap: the server rounds this to about 11 km.
        const near =
          useLocation && navigator.geolocation
            ? await new Promise<object>(done => navigator.geolocation.getCurrentPosition(p => done({lat: p.coords.latitude, lng: p.coords.longitude}), () => done({}), {timeout: 8000, maximumAge: 600_000}))
            : {};
        const res = await fetch('/api/activities/actions', post(near));
        if (!res.ok) throw new Error(String(res.status));
        setData((await res.json()) as MuseActionsPayload);
      } catch {
        say('Muse could not look right now. Try again in a minute.');
      } finally {
        setAsking(false);
      }
    },
    [say],
  );

  // Suggestions are cached; Muse looks again at most once a day when you open Activities.
  useEffect(() => {
    if (!initial.stale || started.current) return;
    started.current = true;
    void ask(false);
  }, [initial.stale, ask]);

  const act = async (a: MuseAction, action: 'do' | 'dismiss') => {
    if (action === 'dismiss') setData(d => ({...d, actions: d.actions.filter(x => x.id !== a.id)}));
    else setBusy(true);
    try {
      const res = await fetch(`/api/activities/actions/${a.id}`, post({action}));
      if (!res.ok) throw new Error(String(res.status));
      if (action === 'do') {
        const {action: saved} = (await res.json()) as {action: MuseAction};
        setData(d => ({...d, actions: d.actions.map(x => (x.id === saved.id ? saved : x))}));
        setOpen(saved);
      }
    } catch {
      say(action === 'do' ? `That did not go through. Nothing was ${a.kind === 'event' ? 'registered' : 'ordered'}.` : 'Could not hide that. It will be back when you reload.');
    } finally {
      setBusy(false);
    }
  };

  const done = open?.status === 'done';
  const glyph = (a: MuseAction) => (a.kind === 'event' ? CalendarDays : ShoppingBag);
  return (
    <VStack gap={3} as="section" aria-label="Action items" aria-busy={asking}>
      <HStack gap={2} vAlign="center" justify="between" wrap="wrap">
        <VStack gap={0.5}>
          <Heading level={2}>Action items</Heading>
          <Text type="supporting" color="secondary">
            From your Muse · only you see these · demo checkout
          </Text>
        </VStack>
        <Button label={asking ? 'Muse is looking…' : 'Ask Muse again'} variant="ghost" size="sm" isLoading={asking} onClick={() => void ask(data.needsLocation)} />
      </HStack>
      {data.actions.length === 0 ? (
        <Card>
          <EmptyState
            title={asking ? 'Muse is looking' : 'Nothing yet'}
            description={
              asking
                ? 'Muse is looking at what you do and what is coming up near you. This takes about half a minute.'
                : data.needsLocation
                  ? 'Add your city to your profile, or tap Ask Muse again to use your approximate location.'
                  : 'Log a few activities and ask Muse again.'
            }
            isCompact
          />
        </Card>
      ) : (
        <Grid columns={{minWidth: 220}} gap={3}>
          {data.actions.map(a => (
            <Card key={a.id} padding={0}>
              <VStack>
                <AspectRatio ratio={16 / 9}>
                  {a.imageUrl ? (
                    <img src={a.imageUrl} alt="" loading="lazy" />
                  ) : (
                    <Center>
                      <Icon icon={glyph(a)} size="lg" color="secondary" />
                    </Center>
                  )}
                </AspectRatio>
                <VStack gap={2} padding={4}>
                  <HStack>
                    <Token label={`${a.kind === 'event' ? 'Event' : 'Suggested buy'}${a.price ? ` · ${a.price}` : ''}`} size="sm" color={a.kind === 'event' ? 'blue' : 'green'} />
                  </HStack>
                  <Heading level={3}>{a.title}</Heading>
                  {a.detail && (
                    <Text type="supporting" color="secondary">
                      {a.detail}
                    </Text>
                  )}
                  {a.why && (
                    <HStack gap={1.5} vAlign="center">
                      <Icon icon={Sparkles} size="xsm" color="accent" />
                      <StackItem size="fill">
                        <Text type="supporting" color="secondary">
                          {a.why}
                        </Text>
                      </StackItem>
                    </HStack>
                  )}
                  <HStack gap={2} wrap="wrap">
                    {a.status === 'done' ? (
                      <Button label={doneLabel(a)} size="sm" icon={<Icon icon="check" />} onClick={() => setOpen(a)} />
                    ) : (
                      <>
                        <Button label={verb(a)} variant="primary" size="sm" onClick={() => setOpen(a)} />
                        <Button label="Not now" variant="ghost" size="sm" onClick={() => void act(a, 'dismiss')} />
                      </>
                    )}
                  </HStack>
                </VStack>
              </VStack>
            </Card>
          ))}
        </Grid>
      )}
      <Dialog isOpen={!!open} onOpenChange={o => !o && setOpen(null)} width={480}>
        {open && (
          <Layout
            header={<DialogHeader title={done ? (open.kind === 'event' ? "You're registered" : 'Order placed') : open.kind === 'event' ? 'Register for this event' : 'Buy this'} onOpenChange={() => setOpen(null)} />}
            content={
              <LayoutContent>
                <VStack gap={4}>
                  {done && <Banner status="success" title={open.kind === 'event' ? `You're registered, ${viewerName.split(' ')[0]}` : 'Your order is placed'} description={`Confirmation ${open.confirmation}`} />}
                  <MetadataList>
                    <MetadataListItem label={open.kind === 'event' ? 'Event' : 'Item'}>{open.title}</MetadataListItem>
                    {open.detail && <MetadataListItem label="Details">{open.detail}</MetadataListItem>}
                    <MetadataListItem label={open.kind === 'event' ? 'Entry' : 'Price'}>{open.price ?? 'Not listed'}</MetadataListItem>
                    <MetadataListItem label={open.kind === 'event' ? 'Registering as' : 'Buyer'}>{viewerName}</MetadataListItem>
                    <MetadataListItem label="Payment">Demo card ···· 4242 · not charged</MetadataListItem>
                  </MetadataList>
                  <Text type="supporting" color="secondary">
                    Demo: {done ? 'no money moved' : 'no money moves'} and {open.kind === 'event' ? 'the organizer' : 'the seller'} {done ? 'was' : 'is'} not contacted.
                    {open.url && (
                      <>
                        {' '}
                        <Link href={open.url} target="_blank">
                          {open.kind === 'event' ? 'See the event page' : 'See the product page'}
                        </Link>
                      </>
                    )}
                  </Text>
                </VStack>
              </LayoutContent>
            }
            footer={
              <LayoutFooter>
                <HStack gap={2} hAlign="end">
                  {done ? (
                    <Button label="Done" variant="primary" onClick={() => setOpen(null)} />
                  ) : (
                    <>
                      <Button label="Cancel" onClick={() => setOpen(null)} />
                      <Button label={open.kind === 'event' ? 'Confirm registration' : 'Confirm purchase'} variant="primary" isLoading={busy} onClick={() => void act(open, 'do')} />
                    </>
                  )}
                </HStack>
              </LayoutFooter>
            }
          />
        )}
      </Dialog>
    </VStack>
  );
}
