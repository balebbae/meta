'use client';

import {useEffect, useState} from 'react';

const read = () => (typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

let fadeTimer: ReturnType<typeof setTimeout> | undefined;
/** Sets `html[data-theme-fade]` for 450 ms: colours under it transition (home.module.css, layout.module.css) instead of
 *  snapping. Shared by the light/dark switch and by entering or leaving Activities mode; the timer always clears it. */
export function fadeTheme() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const html = document.documentElement;
  html.setAttribute('data-theme-fade', '');
  clearTimeout(fadeTimer);
  fadeTimer = setTimeout(() => html.removeAttribute('data-theme-fade'), 450);
}

/** Current site theme, with a soft fade when it flips while Activities is open. The rest of the site keeps its instant switch. */
export function useActTheme(): 'light' | 'dark' {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    setTheme(read());
    const obs = new MutationObserver(() => {
      const next = read();
      setTheme(prev => {
        if (prev !== next) fadeTheme();
        return next;
      });
    });
    obs.observe(document.documentElement, {attributes: true, attributeFilter: ['data-theme']});
    return () => obs.disconnect();
  }, []);
  return theme;
}

/** Counts from 0 to `target` once, 900 ms, eased; instant under reduced motion. */
export function useCountUp(target: number | null, ms = 900): number | null {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (target == null) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setV(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(Math.round(target * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return target == null ? null : v;
}
