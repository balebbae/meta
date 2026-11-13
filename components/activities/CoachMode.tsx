'use client';
import {createContext, useContext, useEffect, useState, type ReactNode} from 'react';
import {Banner} from '@astryxdesign/core/Banner';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {Switch} from '@astryxdesign/core/Switch';
import {Text} from '@astryxdesign/core/Text';
import {Theme} from '@astryxdesign/core/theme';
import {VStack} from '@astryxdesign/core/VStack';
import {neutralTheme} from '@astryxdesign/theme-neutral/built';
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
 * Coach mode is a mode of /activities, not a page: the switch in the title row swaps the Activities page (children)
 * for the Coach view, drawn in a nested dark theme with a lime accent. The page always opens with it off; switching on
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
        <Theme theme={neutralTheme} mode="dark">
          <div className={s.surface}>
            <VStack gap={4}>
              <HStack gap={3} vAlign="start" justify="between">
                <VStack gap={1}>
                  <Heading level={1} color="accent">
                    Coach mode
                  </Heading>
                  <Text color="secondary">This week vs last week, what improved, the gaps, and how to bridge them.</Text>
                </VStack>
                <CoachToggle compact />
              </HStack>
              <CoachPanel state={state} onState={setState} error={error} onTurnOff={del => void toggle(false, del)} />
            </VStack>
          </div>
        </Theme>
      ) : (
        <>
          {error && <Banner status="error" title={error} />}
          {children}
        </>
      )}
    </CoachCtx.Provider>
  );
}

/** The switch in the title row. Renders nothing outside a CoachMode. */
export function CoachToggle({compact = false}: {compact?: boolean}) {
  const ctx = useContext(CoachCtx);
  if (!ctx) return null;
  // compact = inside the Coach view, whose title already says "Coach mode" (label stays for screen readers)
  return <Switch label="Coach mode" isLabelHidden={compact} labelPosition="start" value={ctx.on} isLoading={ctx.busy} onChange={next => ctx.toggle(next)} />;
}
