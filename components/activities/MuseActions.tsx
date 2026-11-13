'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {CalendarDays, Check, ShoppingBag} from 'lucide-react';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {HStack} from '@astryxdesign/core/HStack';
import {Layout, LayoutContent, LayoutFooter} from '@astryxdesign/core/Layout';
import {Link} from '@astryxdesign/core/Link';
import {MetadataList, MetadataListItem} from '@astryxdesign/core/MetadataList';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import type {MuseAction, MuseActionsPayload} from '@/lib/activities/actions';
import h from './home/home.module.css';

const post = (body: unknown) => ({method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)});
const verb = (a: MuseAction) => (a.kind === 'event' ? 'Book it' : 'Buy it');
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
  const glyph = (a: MuseAction) => (a.kind === 'event' ? <CalendarDays size={16} /> : <ShoppingBag size={16} />);
  return (
    <section className={h.section} style={{'--i': 1} as React.CSSProperties} aria-label="From your Muse" aria-busy={asking}>
      <div className={h.head}>
        <div>
          <h2 className={h.h2}>From your Muse</h2>
          <span className={h.sub}>One tap each · only you see these · demo checkout</span>
        </div>
        <button type="button" className={`${h.pill} ${h.pillSm} ${h.pillGhost}`} disabled={asking} onClick={() => void ask(data.needsLocation)}>
          {asking ? 'Muse is looking…' : 'Ask again'}
        </button>
      </div>
      <div className={h.list}>
        {data.actions.length === 0 ? (
          <p className={h.empty}>
            {asking
              ? 'Muse is looking at what you do and what is coming up near you. About half a minute.'
              : data.needsLocation
                ? 'Add your city to your profile, or tap Ask again to use your approximate location.'
                : 'Nothing yet. Log a few activities and ask again.'}
          </p>
        ) : (
          data.actions.map((a, i) => (
            <div key={a.id} className={`${h.task} ${a.status === 'done' ? h.taskDone : ''}`} style={{'--i': i} as React.CSSProperties}>
              <span className={`${h.orb} ${a.kind === 'buy' ? h.orbBuy : ''} ${a.status === 'done' ? h.orbDone : ''}`} aria-hidden>
                {a.status === 'done' ? <Check size={16} /> : glyph(a)}
              </span>
              <div>
                <p className={h.taskText}>
                  <strong>{a.title}</strong>
                  {a.detail ? ` · ${a.detail}` : ''}
                  {a.price ? <> <span className={`${h.chip} ${a.kind === 'buy' ? h.chipEmber : ''}`}>{a.price}</span></> : null}
                </p>
                {a.why && <p className={h.taskWhy}>{a.why}</p>}
              </div>
              <div className={h.taskBtns}>
                {a.status === 'done' ? (
                  <button type="button" className={`${h.pill} ${h.pillSm} ${h.pillQuiet}`} onClick={() => setOpen(a)}>
                    {doneLabel(a)}
                  </button>
                ) : (
                  <>
                    <button type="button" className={`${h.pill} ${h.pillSm} ${h.pillEmber}`} onClick={() => setOpen(a)}>
                      {verb(a)}
                    </button>
                    <button type="button" className={`${h.pill} ${h.pillSm} ${h.pillGhost}`} onClick={() => void act(a, 'dismiss')}>
                      Not now
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
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
    </section>
  );
}
