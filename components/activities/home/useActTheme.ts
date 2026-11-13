'use client';

import {useEffect, useState} from 'react';

const read = () => (typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

/** Current site theme, and a soft fade when it flips while Activities is open: `html[data-theme-fade]` is set for
 *  420 ms and home.module.css transitions colours under it. The rest of the site keeps its instant switch. */
export function useActTheme(): 'light' | 'dark' {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    const html = document.documentElement;
    setTheme(read());
    let timer: ReturnType<typeof setTimeout> | undefined;
    const obs = new MutationObserver(() => {
      const next = read();
      setTheme(prev => {
        if (prev === next) return prev;
        if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
          html.setAttribute('data-theme-fade', '');
          clearTimeout(timer);
          timer = setTimeout(() => html.removeAttribute('data-theme-fade'), 450);
        }
        return next;
      });
    });
    obs.observe(html, {attributes: true, attributeFilter: ['data-theme']});
    return () => {
      obs.disconnect();
      clearTimeout(timer);
      html.removeAttribute('data-theme-fade');
    };
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
