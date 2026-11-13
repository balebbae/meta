/**
 * Swim journeys (pure: no DB, no Muse). The chat swims a real crossing together: every logged swim moves the
 * boat, checkpoints are real places along the route, and two people swimming the same day both get a 20%
 * "lane buddy" bonus (team-plus-individual rewards beat either alone in the UPenn step trial). Tests: swim.test.ts.
 */
export type Checkpoint = {name: string; atM: number};
export type SwimRoute = {id: string; name: string; from: string; to: string; totalM: number; checkpoints: Checkpoint[]};

export const ROUTES: SwimRoute[] = [
  {
    id: 'gibraltar',
    name: 'Strait of Gibraltar',
    from: 'Tarifa',
    to: 'Morocco',
    totalM: 14_400,
    checkpoints: [
      {name: 'Off Tarifa Island', atM: 2_000},
      {name: 'Main shipping lane', atM: 6_000},
      {name: 'Mid-strait current', atM: 9_500},
      {name: 'Punta Cires in sight', atM: 12_500},
    ],
  },
  {
    id: 'english-channel',
    name: 'English Channel',
    from: 'Dover',
    to: 'Cap Gris-Nez',
    totalM: 33_800,
    checkpoints: [
      {name: 'Shakespeare Beach', atM: 1_000},
      {name: 'Southwest shipping lane', atM: 9_000},
      {name: 'Separation zone', atM: 16_000},
      {name: 'Northeast shipping lane', atM: 23_000},
      {name: 'Cap Gris-Nez lighthouse in sight', atM: 30_000},
    ],
  },
];

/** Small groups get the shorter crossing so it's finishable in a few weeks. */
export function routeFor(memberCount: number): SwimRoute {
  return memberCount <= 3 ? ROUTES[0] : ROUTES[1];
}

export const LANE_BUDDY_BONUS = 0.2;
export const MIN_SWIM_M = 25;
export const MAX_SWIM_M = 10_000;

export function clampSwim(meters: number): number | null {
  if (!Number.isFinite(meters)) return null;
  const m = Math.round(meters);
  return m < MIN_SWIM_M ? null : Math.min(MAX_SWIM_M, m);
}

export const laneBuddyBonus = (meters: number, someoneElseSwamToday: boolean) => (someoneElseSwamToday ? Math.round(meters * LANE_BUDDY_BONUS) : 0);

/** Checkpoints passed by going from `before` to `after` metres. */
export function crossed(route: SwimRoute, before: number, after: number): Checkpoint[] {
  return route.checkpoints.filter(c => c.atM > before && c.atM <= after);
}

export const routeById = (id: string) => ROUTES.find(r => r.id === id) ?? ROUTES[1];
