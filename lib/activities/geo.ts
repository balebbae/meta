/** Pins for the event map. Events store a free-text `location`, so places are matched against a small table of
 *  cities and landmarks (seed data is Dallas-based). Pure: node --test-able. */
const PLACES: Record<string, [number, number]> = {
  'white rock lake': [32.8296, -96.7215],
  'katy trail': [32.8054, -96.8046],
  'deep ellum': [32.7843, -96.7836],
  'klyde warren': [32.7894, -96.8016],
  'capital factory': [32.7812, -96.7998],
  'bishop arts': [32.7482, -96.8275],
  'trinity groves': [32.7805, -96.8368],
  'fair park': [32.7812, -96.7629],
  'ecsw building': [32.9868, -96.7504],
  richardson: [32.9483, -96.7299],
  plano: [33.0198, -96.6989],
  frisco: [33.1507, -96.8236],
  'fort worth': [32.7555, -97.3308],
  arlington: [32.7357, -97.1081],
  irving: [32.814, -96.9489],
  denton: [33.2148, -97.1331],
  dallas: [32.7767, -96.797],
  austin: [30.2672, -97.7431],
  houston: [29.7604, -95.3698],
  'san antonio': [29.4241, -98.4936],
  'new york': [40.7128, -74.006],
  'los angeles': [34.0522, -118.2437],
  chicago: [41.8781, -87.6298],
  'san francisco': [37.7749, -122.4194],
  seattle: [47.6062, -122.3321],
};
// landmarks before cities: "Katy Trail, Dallas, TX" pins the trail, not downtown
const KEYS = Object.keys(PLACES).sort((a, b) => b.length - a.length);

export type LatLng = {lat: number; lng: number};

export function locate(text: string): LatLng | null {
  const t = text.toLowerCase();
  const key = KEYS.find(k => t.includes(k));
  return key ? {lat: PLACES[key][0], lng: PLACES[key][1]} : null;
}

/** Great-circle distance, one decimal. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)) * 10) / 10;
}
