'use client';
import {createContext, useContext, useEffect, useState, type ReactNode} from 'react';
import {IconX} from '@tabler/icons-react';
import {Banner} from '@astryxdesign/core/Banner';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import type {CoachState} from '@/lib/activities/coach';
import {CoachPanel} from './CoachPanel';
import s from './coach.module.css';

type Ctx = {on: boolean; busy: boolean; toggle: (next: boolean, deleteHistory?: boolean) => void};
const CoachCtx = createContext<Ctx | null>(null);

async function post(body: {action: string; deleteHistory?: boolean}): Promise<CoachState> {
  const res = await fetch('/api/activities/coach', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)});
  if (!res.ok) throw new Error();
  return res.json();
}

/**
 * Coach mode is a mode of /activities, not a page: the Coach mode button on the goal card swaps the Activities page (children)
 * for the Coach view; the X at the top leaves it. The page always opens with it off; switching on
 * records the opt-in (activity_profiles.coach_mode), which the Coach report needs.
 */
export function CoachMode({initialOn, children}: {initialOn: boolean; children: ReactNode}) {
  const [on, setOn] = useState(initialOn);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<CoachState | null>(null);
  const [error, setError] = useState<string | null>(null);

  // first load only; switching on later gets its report from the enable call (never reads before it's saved)
  useEffect(() => {
    if (!initialOn) return;
    fetch('/api/activities/coach')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(setState)
      .catch(() => setError('Could not reach your Muse. Try Refresh in a moment.'));
  }, [initialOn]);

  const toggle = async (next: boolean, deleteHistory = false) => {
    setOn(next);
    setBusy(true);
    setError(null);
    if (next) setState(null);
    // drop ?coach=on so a reload after switching off doesn't switch it back on
    const url = new URL(window.location.href);
    if (!next && url.searchParams.has('coach')) {
      url.searchParams.delete('coach');
      window.history.replaceState(null, '', url);
    }
    try {
      const res = await post({action: next ? 'enable' : 'disable', deleteHistory});
      if (next) setState(res);
    } catch {
      setOn(!next);
      setError(`Could not turn Coach mode ${next ? 'on' : 'off'}. Try again.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <CoachCtx.Provider value={{on, busy, toggle: (next, del) => void toggle(next, del)}}>
      {on ? (
        <div className={s.surface}>
          <VStack gap={4}>
            <HStack gap={3} vAlign="start" justify="between">
              <VStack gap={1}>
                <Heading level={1}>Coach mode</Heading>
                <Text color="secondary">Where you stand against your goal, a bridge for every gap, then this week vs last week.</Text>
              </VStack>
              <CoachClose />
            </HStack>
            <CoachPanel state={state} onState={setState} error={error} onTurnOff={del => void toggle(false, del)} />
          </VStack>
        </div>
      ) : (
        <>
          {error && <Banner status="error" title={error} />}
          {children}
        </>
      )}
    </CoachCtx.Provider>
  );
}

/** "Coach mode" button (bottom right of the goal card) that switches the Coach view on. Renders nothing outside a CoachMode. */
export function CoachButton({className, children}: {className?: string; children?: ReactNode}) {
  const ctx = useContext(CoachCtx);
  if (!ctx) return null;
  return (
    <button type="button" className={className} aria-label="Coach mode" title="Coach mode" disabled={ctx.busy} onClick={() => ctx.toggle(true)}>
      {children ?? 'Coach mode'}
    </button>
  );
}

/** The X inside the Coach view's header that exits Coach mode. Renders nothing outside a CoachMode. */
export function CoachClose() {
  const ctx = useContext(CoachCtx);
  if (!ctx) return null;
  return (
    <button type="button" className={s.close} aria-label="Leave Coach mode" title="Leave Coach mode" disabled={ctx.busy} onClick={() => ctx.toggle(false)}>
      <IconX size={20} aria-hidden />
    </button>
  );
}
