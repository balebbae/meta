'use client';
import * as fx from './fixtures';

/** Dev preview only: answers the few GETs the chrome and the challenge cards make (and every Coach mode call) with fixture data, so
 *  /activities-preview needs no database or session. Every other request, and every other route, goes to the network. */
const ROUTES: [RegExp, unknown][] = [
  [/^\/api\/leaderboard/, fx.leaderboard],
  [/^\/api\/conversations\/unread-count/, {unreadCount: fx.conversations.unreadCount}],
  [/^\/api\/conversations$/, fx.conversations],
  [/^\/api\/quests\/1\/state/, fx.questState],
  [/^\/api\/games\/2\/state/, fx.turfState],
  [/^\/api\/notifications/, {notifications: [], unreadCount: 2}],
  [/^\/api\/activities\/coach/, fx.coachState],
];

type Patched = typeof window & {__previewFetch?: boolean};
// Patched at module load (before any component effect runs), once.
if (typeof window !== 'undefined' && !(window as Patched).__previewFetch) {
  (window as Patched).__previewFetch = true;
  const real = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;
    const hit = location.pathname.startsWith('/activities-preview') && ((init?.method ?? 'GET') === 'GET' || url.startsWith('/api/activities/coach')) && ROUTES.find(([re]) => re.test(url));
    return hit ? Promise.resolve(Response.json(hit[1])) : real(input, init);
  };
}

export function PreviewFetch() {
  return null;
}
