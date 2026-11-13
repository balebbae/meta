/** Every query key the Activities panels own; closing a panel strips all of them. */
export const PANEL_KEYS = ['panel', 'tab', 'source', 'goal', 'request', 'offer', 'step', 'invite', 'connected', 'imported', 'error', 'whoop', 'msg'] as const;
export type PanelParams = Partial<Record<(typeof PANEL_KEYS)[number], string | number | null | undefined>>;

/** /activities?panel=… for a panel, e.g. panelHref({panel: 'goals', goal: 3}). Usable from server and client. */
export function panelHref(params: PanelParams): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v != null && v !== '') q.set(k, String(v));
  return `/activities?${q}`;
}
