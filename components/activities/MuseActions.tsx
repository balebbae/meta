'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {Dialog} from '@/components/ui/Dialog';
import {CalendarIcon, CheckIcon, MarketplaceIcon} from '@/components/icons';
import type {MuseAction, MuseActionsPayload} from '@/lib/activities/actions';
import styles from './discover.module.css';

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
  return (
    <section className={styles.section} aria-label="From your Muse" aria-busy={asking}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>From your Muse</h2>
        <span className={styles.sectionSub}>
          Only you see these · demo checkout, no real money{' '}
          <button type="button" className={styles.ghost} onClick={() => ask(data.needsLocation)} disabled={asking}>
            {asking ? 'Muse is looking…' : 'Ask Muse again'}
          </button>
        </span>
      </div>
      {data.actions.length === 0 ? (
        <div className={styles.status} role="status">
          {asking
            ? 'Muse is looking at what you do and what is coming up near you. This takes about half a minute.'
            : data.needsLocation
              ? 'Nothing yet. Add your city to your profile, or tap Ask Muse again to use your approximate location.'
              : 'Nothing yet. Log a few activities and ask Muse again.'}
        </div>
      ) : (
        <div className={styles.grid}>
          {data.actions.map(a => (
            <article key={a.id} className={styles.card}>
              <div className={styles.img}>
                {a.imageUrl ? <img src={a.imageUrl} alt="" loading="lazy" /> : <span className={styles.imgIcon}>{a.kind === 'event' ? <CalendarIcon size={36} /> : <MarketplaceIcon size={36} />}</span>}
              </div>
              <div className={styles.body}>
                <span className={styles.pill}>{a.kind === 'event' ? 'Event' : 'Suggested buy'}{a.price ? ` · ${a.price}` : ''}</span>
                <div className={styles.title}>{a.title}</div>
                {a.detail && <div className={styles.subtitle}>{a.detail}</div>}
                {a.why && (
                  <div className={styles.why}>
                    <span className={styles.whyDot} aria-hidden />
                    <span>{a.why}</span>
                  </div>
                )}
                <div className={styles.actions}>
                  {a.status === 'done' ? (
                    <button type="button" className={styles.secondary} onClick={() => setOpen(a)}>
                      <CheckIcon size={16} style={{display: 'inline-block', verticalAlign: '-3px'}} /> {doneLabel(a)}
                    </button>
                  ) : (
                    <>
                      <button type="button" className={styles.primary} onClick={() => setOpen(a)}>
                        {verb(a)}
                      </button>
                      <button type="button" className={styles.ghost} onClick={() => act(a, 'dismiss')}>
                        Not now
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <Dialog open={!!open} onClose={() => setOpen(null)} title={!open ? '' : done ? (open.kind === 'event' ? "You're registered" : 'Order placed') : open.kind === 'event' ? 'Register for this event' : 'Buy this'}>
        {open && (
          <div className={styles.introBody}>
            {done && (
              <div className={styles.confirmed}>
                <span className={styles.confirmedIcon}>
                  <CheckIcon size={28} />
                </span>
                <strong>{open.kind === 'event' ? `You're registered, ${viewerName.split(' ')[0]}` : 'Your order is placed'}</strong>
                <span>Confirmation {open.confirmation}</span>
              </div>
            )}
            <dl className={styles.receipt}>
              <dt>{open.kind === 'event' ? 'Event' : 'Item'}</dt>
              <dd>{open.title}</dd>
              {open.detail && (
                <>
                  <dt>Details</dt>
                  <dd>{open.detail}</dd>
                </>
              )}
              <dt>{open.kind === 'event' ? 'Entry' : 'Price'}</dt>
              <dd>{open.price ?? 'Not listed'}</dd>
              <dt>{open.kind === 'event' ? 'Registering as' : 'Buyer'}</dt>
              <dd>{viewerName}</dd>
              <dt>Payment</dt>
              <dd>Demo card ···· 4242 · not charged</dd>
            </dl>
            <p className={styles.demoNote}>
              Demo: {done ? 'no money moved' : 'no money moves'} and {open.kind === 'event' ? 'the organizer' : 'the seller'} {done ? 'was' : 'is'} not contacted.
              {open.url && (
                <>
                  {' '}
                  <a href={open.url} target="_blank" rel="noopener noreferrer">
                    {open.kind === 'event' ? 'See the event page' : 'See the product page'}
                  </a>
                </>
              )}
            </p>
            <div className={styles.actions}>
              {done ? (
                <button type="button" className={styles.primary} onClick={() => setOpen(null)}>
                  Done
                </button>
              ) : (
                <>
                  <button type="button" className={styles.primary} disabled={busy} onClick={() => act(open, 'do')}>
                    {busy ? 'Confirming…' : open.kind === 'event' ? 'Confirm registration' : 'Confirm purchase'}
                  </button>
                  <button type="button" className={styles.secondary} onClick={() => setOpen(null)}>
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </Dialog>
    </section>
  );
}
