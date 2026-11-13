'use client';

import {usePathname, useRouter} from 'next/navigation';
import {useCallback, useEffect, useState} from 'react';
import {PANEL_KEYS, panelHref, type PanelParams} from '@/lib/activities/panel-href';

/**
 * Open / switch / close Activities panels. On /activities this only touches history (Next syncs useSearchParams,
 * no server round trip, Back steps back through panels); from any other page it navigates to /activities?panel=….
 * Reads window.location rather than useSearchParams so non-Activities pages (left rail, intro) need no Suspense.
 */
export function usePanelNav() {
  const router = useRouter();
  const pathname = usePathname();

  const openHref = useCallback(
    (href: string) => {
      if (pathname !== '/activities') return router.push(href);
      const depth = Number(window.history.state?.panelDepth ?? 0);
      window.history.pushState({panelDepth: depth + 1}, '', href);
    },
    [pathname, router],
  );
  const open = useCallback((params: PanelParams) => openHref(panelHref(params)), [openHref]);

  // same panel, different view (tab, filter): no new history entry
  const update = useCallback((params: PanelParams) => {
    const q = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(params)) {
      if (v == null || v === '') q.delete(k);
      else q.set(k, String(v));
    }
    // a fresh object: Next skips syncing useSearchParams for any state that already carries its __NA marker
    window.history.replaceState({panelDepth: Number(window.history.state?.panelDepth ?? 0)}, '', `${window.location.pathname}?${q}`);
  }, []);

  const close = useCallback(() => {
    const depth = Number(window.history.state?.panelDepth ?? 0);
    if (depth > 0) return window.history.go(-depth);
    // arrived on a panel URL directly (link, redirect, reload): drop the panel keys in place
    const q = new URLSearchParams(window.location.search);
    for (const k of PANEL_KEYS) q.delete(k);
    window.history.replaceState(null, '', q.size ? `${window.location.pathname}?${q}` : window.location.pathname);
  }, []);

  return {open, openHref, update, close};
}

// last good response per url for this tab: reopening a panel paints instantly, then refreshes in the background
const cache = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();

function load(url: string): Promise<unknown> {
  let p = inflight.get(url);
  if (!p) {
    p = fetch(url)
      .then(async r => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error((j as {error?: string}).error ?? 'Could not load');
        cache.set(url, j);
        return j;
      })
      .finally(() => inflight.delete(url));
    inflight.set(url, p);
  }
  return p;
}

/** Warm a panel's data before it opens (the Activities page calls this once idle). */
export function prefetchJson(url: string): void {
  if (!cache.has(url)) void load(url).catch(() => {});
}

/** GET a JSON endpoint (cached per url); `reload` refetches after a save or delete inside a panel. */
export function useJson<T>(url: string | null): {data: T | null; error: string | null; reload: () => void} {
  // keyed by url: a new url shows its cached data or loading, never the previous view's data
  const [got, setGot] = useState<{url: string; data: T | null; error: string | null} | null>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!url) return;
    let live = true;
    load(url)
      .then(j => live && setGot({url, data: j as T, error: null}))
      .catch((e: Error) => live && setGot(g => (g?.url === url && g.data ? g : {url, data: null, error: e.message})));
    return () => {
      live = false;
    };
  }, [url, n]);
  const mine = got?.url === url ? got : url && cache.has(url) ? {data: cache.get(url) as T, error: null} : null;
  return {data: mine?.data ?? null, error: mine?.error ?? null, reload: useCallback(() => setN(x => x + 1), [])};
}
