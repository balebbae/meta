import type {ConnectorId, EventKind, RawEvent} from '@/lib/activities/types';

/**
 * Deterministic "demo week" generator shared by the mock connector and db/seed.sql (same external ids,
 * so re-running is idempotent via the (source, external_id) unique key). Seeded by userId so every demo
 * user gets a different but stable week: runs, walks, strength, yoga, daily steps and sleep.
 */
function rng(seed: number) {
  let s = seed * 2654435761 + 12345;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const WORKOUT_PLANS: EventKind[][] = [
  ['run', 'strength', 'run', 'walk', 'run'],
  ['walk', 'yoga', 'walk', 'walk', 'strength'],
  ['ride', 'run', 'strength', 'ride'],
  ['strength', 'strength', 'run', 'yoga', 'strength'],
  ['run', 'run', 'walk', 'run', 'run', 'swim'],
  ['yoga', 'walk', 'yoga', 'run'],
];

export function generateDemoWeek(userId: number, source: ConnectorId = 'mock', now = new Date()): RawEvent[] {
  const rand = rng(userId);
  const plan = WORKOUT_PLANS[(userId - 1) % WORKOUT_PLANS.length];
  const events: RawEvent[] = [];
  const dayMs = 24 * 3_600_000;
  const workoutDays = [6, 5, 3, 2, 0, 1].slice(0, plan.length);
  plan.forEach((kind, i) => {
    const daysAgo = workoutDays[i];
    const d = new Date(now.getTime() - daysAgo * dayMs);
    d.setHours(kind === 'yoga' ? 19 : 7, Math.floor(rand() * 40), 0, 0);
    const durationMin = kind === 'strength' ? 40 + Math.round(rand() * 20) : kind === 'yoga' ? 30 + Math.round(rand() * 15) : kind === 'ride' ? 45 + Math.round(rand() * 30) : 25 + Math.round(rand() * 25);
    const distanceKm = kind === 'run' ? Math.round((3.5 + rand() * 4) * 100) / 100 : kind === 'walk' ? Math.round((2 + rand() * 3) * 100) / 100 : kind === 'ride' ? Math.round((12 + rand() * 15) * 10) / 10 : kind === 'swim' ? 1.2 : undefined;
    const avgHr = kind === 'yoga' ? 92 + Math.round(rand() * 10) : kind === 'walk' ? 105 + Math.round(rand() * 12) : 138 + Math.round(rand() * 25);
    events.push({
      userId,
      source,
      externalId: `${source}:${userId}:${kind}:d${daysAgo}`,
      kind,
      startedAt: d.toISOString(),
      endedAt: new Date(d.getTime() + durationMin * 60_000).toISOString(),
      distanceKm,
      durationMin,
      avgHr,
      trust: 'device',
      displayScope: 'normal',
    });
  });
  for (let daysAgo = 0; daysAgo < 7; daysAgo++) {
    const d = new Date(now.getTime() - daysAgo * dayMs);
    d.setHours(0, 0, 0, 0);
    const active = workoutDays.includes(daysAgo);
    const steps = (active ? 8500 : 4500) + Math.round(rand() * 4000) - (daysAgo === 0 ? 2500 : 0);
    events.push({userId, source, externalId: `${source}:${userId}:steps:d${daysAgo}`, kind: 'steps', startedAt: d.toISOString(), endedAt: new Date(d.getTime() + dayMs - 1).toISOString(), steps: Math.max(1200, steps), trust: 'device', displayScope: 'normal'});
    const bed = new Date(d.getTime() - 1.5 * 3_600_000);
    const sleepMin = 360 + Math.round(rand() * 150);
    events.push({userId, source, externalId: `${source}:${userId}:sleep:d${daysAgo}`, kind: 'sleep', startedAt: bed.toISOString(), endedAt: new Date(bed.getTime() + sleepMin * 60_000).toISOString(), durationMin: sleepMin, trust: 'device', displayScope: 'normal'});
  }
  return events;
}

/**
 * Weeks 1-15 before the demo week (0-15 for users without one), so "A few months ahead" can match on past state (16 weeks with the demo week).
 * [kind, its ontology MET at the pace below, weekly MET-minutes 15 weeks ago, last week, weeks ago the climb starts].
 * User 1 (seeker) is flat; mentor 6 trained like him 12 weeks ago then ramped, 8 and 10 are near misses, 3 and 5 never climbed from his level.
 */
const HISTORY: Record<number, [EventKind, number, number, number, number]> = {
  1: ['run', 9.3, 1100, 1100, 1],
  3: ['strength', 3.5, 1400, 1400, 1],
  4: ['yoga', 2.3, 300, 800, 10],
  5: ['run', 9.3, 2500, 2800, 12],
  6: ['run', 9.3, 1100, 3100, 12],
  8: ['run', 9.3, 1300, 2300, 8],
  10: ['run', 9.3, 500, 1200, 12],
};

export function generateDemoHistory(userId: number, source: ConnectorId = 'mock', now = new Date()): RawEvent[] {
  const h = HISTORY[userId];
  if (!h) return [];
  const [kind, met, from, to, start] = h;
  const rand = rng(userId + 100);
  const events: RawEvent[] = [];
  // users 1-6 already have the demo week (week 0) seeded; the others get this week from here too
  for (let w = userId <= WORKOUT_PLANS.length ? 1 : 0; w <= 15; w++) {
    const load = (w >= start ? from : from * (to / from) ** ((start - w) / Math.max(1, start - 1))) * (0.95 + rand() * 0.1);
    const durationMin = Math.round(load / 3 / met);
    [1, 3, 5].forEach((day, i) => {
      const d = new Date(now.getTime() - (7 * w + day) * 24 * 3_600_000);
      d.setHours(7, 0, 0, 0);
      events.push({
        userId,
        source,
        externalId: `${source}:${userId}:hist:w${w}:${i}`,
        kind,
        startedAt: d.toISOString(),
        endedAt: new Date(d.getTime() + durationMin * 60_000).toISOString(),
        distanceKm: kind === 'run' ? Math.round((durationMin / 6) * 100) / 100 : undefined, // 10 km/h
        durationMin,
        trust: 'device',
        displayScope: 'normal',
      });
    });
  }
  return events;
}
