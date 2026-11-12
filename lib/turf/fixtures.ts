import type {GpsPoint, LatLng} from './engine.ts';

/** Katy Trail, Dallas (between Blackburn St and Fitzhugh Ave). Default arena for the stage demo. */
export const KATY_TRAIL: LatLng = {lat: 32.8125, lng: -96.7985};

export type ReplayScript = 'priya_loop' | 'sarah_cut';

/** Waypoints in metres east/north of the arena centre. Walked at ~3 m/s with a point every 12 m. */
const ROUTES: Record<ReplayScript, {label: string; finish: boolean; waypoints: [number, number][]}> = {
  // Closes a base (back to its start), then heads south and leaves an open trail.
  priya_loop: {
    label: "Priya's loop",
    finish: false,
    waypoints: [
      [100, 100],
      [500, 100],
      [500, 450],
      [100, 450],
      [100, 100],
      [100, -300],
      [-200, -300],
    ],
  },
  // Crosses Priya's open trail on the way east, loops through the corner of her base and comes home.
  sarah_cut: {
    label: "Sarah's cut",
    finish: true,
    waypoints: [
      [-150, -100],
      [400, -100],
      [400, 180],
      [220, 180],
      [-150, -100],
    ],
  },
};

const STEP_M = 12;
const SPEED_MS = 3;

export function scriptInfo(script: ReplayScript) {
  return ROUTES[script];
}

/** Fixture route as GPS points; t counts up from `startT` (ms) at walking pace. */
export function scriptPoints(script: ReplayScript, center: LatLng = KATY_TRAIL, startT = 0): GpsPoint[] {
  const {waypoints} = ROUTES[script];
  const mPerLat = 111_320;
  const mPerLng = 111_320 * Math.cos((center.lat * Math.PI) / 180);
  const out: GpsPoint[] = [];
  let t = startT;
  const add = (x: number, y: number) => {
    out.push({lat: center.lat + y / mPerLat, lng: center.lng + x / mPerLng, t: Math.round(t)});
  };
  add(waypoints[0][0], waypoints[0][1]);
  for (let i = 1; i < waypoints.length; i++) {
    const [x0, y0] = waypoints[i - 1];
    const [x1, y1] = waypoints[i];
    const len = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.round(len / STEP_M));
    for (let s = 1; s <= steps; s++) {
      t += (len / steps / SPEED_MS) * 1000;
      add(x0 + ((x1 - x0) * s) / steps, y0 + ((y1 - y0) * s) / steps);
    }
  }
  return out;
}

/** The same points as a GPX 1.1 document (for testing the upload path). */
export function scriptGpx(script: ReplayScript, center: LatLng = KATY_TRAIL, startT = Date.UTC(2026, 10, 12, 15, 0, 0)): string {
  const pts = scriptPoints(script, center, startT)
    .map(p => `<trkpt lat="${p.lat.toFixed(6)}" lon="${p.lng.toFixed(6)}"><time>${new Date(p.t).toISOString()}</time></trkpt>`)
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="Turf fixtures"><trk><name>${ROUTES[script].label}</name><trkseg>${pts}</trkseg></trk></gpx>`;
}
