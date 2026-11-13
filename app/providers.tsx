'use client';

import Link from 'next/link';
import {useSyncExternalStore} from 'react';
import {Theme} from '@astryxdesign/core/theme';
import {LinkProvider} from '@astryxdesign/core/Link';
import {neutralTheme} from '@astryxdesign/theme-neutral/built';

type Mode = 'light' | 'dark';

// data-fb-theme is owned by the head script and the toggle; data-theme is what Astryx syncs (and the CSS keys off).
const readMode = (): Mode => {
  const d = document.documentElement.dataset;
  return (d.fbTheme ?? d.theme) === 'dark' ? 'dark' : 'light';
};

const subscribe = (onChange: () => void) => {
  const obs = new MutationObserver(onChange);
  obs.observe(document.documentElement, {attributes: true, attributeFilter: ['data-theme', 'data-fb-theme']});
  return () => obs.disconnect();
};

/** Mirrors <html data-theme> (set by the inline head script and the theme toggle) into Astryx's Theme.
 *  The server snapshot is the fb.theme cookie; when it disagrees with the saved client preference,
 *  React re-renders after hydration with the client snapshot, so the Astryx wrapper's
 *  own data-theme gets patched instead of staying stuck on the server value. */
function useDocumentTheme(initialMode: Mode): Mode {
  return useSyncExternalStore(subscribe, readMode, () => initialMode);
}

export function Providers({children, initialMode}: {children: React.ReactNode; initialMode: Mode}) {
  const mode = useDocumentTheme(initialMode);
  return (
    <Theme theme={neutralTheme} mode={mode}>
      <LinkProvider component={Link}>{children}</LinkProvider>
    </Theme>
  );
}
