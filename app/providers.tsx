'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import {Theme} from '@astryxdesign/core/theme';
import {LinkProvider} from '@astryxdesign/core/Link';
import {neutralTheme} from '@astryxdesign/theme-neutral/built';

const readMode = (): 'light' | 'dark' =>
  typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';

/** Mirrors <html data-theme> (set by the inline script / theme toggles) into Astryx's Theme mode.
 *  Astryx writes data-theme=mode back onto <html>, so the initial mode must come from the DOM or it
 *  would overwrite the user's choice with 'light' on every page load. */
function useDocumentTheme(): 'light' | 'dark' {
  const [mode, setMode] = useState<'light' | 'dark'>(readMode);
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setMode(readMode());
    read();
    const obs = new MutationObserver(read);
    obs.observe(root, {attributes: true, attributeFilter: ['data-theme']});
    return () => obs.disconnect();
  }, []);
  return mode;
}

export function Providers({children}: {children: React.ReactNode}) {
  const mode = useDocumentTheme();
  return (
    <Theme theme={neutralTheme} mode={mode}>
      <LinkProvider component={Link}>{children}</LinkProvider>
    </Theme>
  );
}
