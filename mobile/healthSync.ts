import Constants from 'expo-constants';

export type HealthSample = {metric: string; value: number; unit: string; recordedAt: string};

const DAY = 24 * 60 * 60 * 1000;

export function isExpoGo() {
  return Constants.executionEnvironment === 'storeClient' || Constants.appOwnership === 'expo';
}

/** Reads Apple Health on iOS and Health Connect on Android. Throws in Expo Go. */
export async function readDeviceHealth(): Promise<{source: 'apple_health' | 'health_connect'; samples: HealthSample[]}> {
  if (isExpoGo()) {
    throw new Error('Expo Go cannot read Apple Health or Health Connect. Install a development build.');
  }

  const {Platform} = require('react-native') as typeof import('react-native');
  const end = new Date();
  const start = new Date(end.getTime() - DAY);

  if (Platform.OS === 'ios') return {source: 'apple_health', samples: await readApple(start)};
  if (Platform.OS === 'android') return {source: 'health_connect', samples: await readAndroid(start, end)};
  throw new Error('Health sync is only available on iOS and Android.');
}

function readApple(start: Date): Promise<HealthSample[]> {
  const {NativeModules} = require('react-native') as typeof import('react-native');
  const reader = NativeModules.HealthReader as
    | {readDay: (startISO: string) => Promise<{samples?: {metric?: string; value?: number; unit?: string; recordedAt?: string}[]}>}
    | undefined;
  if (!reader?.readDay) {
    return Promise.reject(new Error('Apple Health is not linked in this build.'));
  }

  return reader.readDay(start.toISOString()).then(result => {
    const now = new Date().toISOString();
    return (result?.samples ?? []).flatMap(row => {
      if (!row.metric || typeof row.value !== 'number' || !(row.value > 0)) return [];
      return [{metric: row.metric, value: row.value, unit: row.unit || 'count', recordedAt: row.recordedAt || now}];
    });
  });
}

const EXERCISE_NAMES: Record<number, string> = {
  8: 'Cycling',
  9: 'Stationary bike',
  25: 'Elliptical',
  36: 'HIIT',
  37: 'Hiking',
  56: 'Running',
  57: 'Treadmill',
  70: 'Strength',
  71: 'Stretching',
  73: 'Swimming',
  74: 'Swimming',
  79: 'Walking',
  83: 'Yoga',
};

async function readAndroid(start: Date, end: Date): Promise<HealthSample[]> {
  const hc = require('react-native-health-connect');
  const ok = await hc.initialize();
  if (!ok) throw new Error('Health Connect is not available on this phone.');
  const types = [
    'Steps', 'Distance', 'FloorsClimbed', 'ActiveCaloriesBurned', 'TotalCaloriesBurned',
    'SleepSession', 'HeartRate', 'RestingHeartRate', 'HeartRateVariabilityRmssd', 'ExerciseSession',
    'Weight', 'Height', 'BodyFat', 'LeanBodyMass', 'OxygenSaturation', 'RespiratoryRate', 'Vo2Max',
    'BloodPressure', 'BloodGlucose', 'BodyTemperature', 'Hydration', 'Nutrition',
  ];
  try {
    await hc.requestPermission(types.map(recordType => ({accessType: 'read', recordType})));
  } catch {
    // A missing record type should not block the ones this phone does have.
  }

  const day = range(start, end);
  const year = range(new Date(end.getTime() - 365 * DAY), end);
  const sleepWindow = range(new Date(end.getTime() - 2 * DAY), end);
  const workouts = range(new Date(end.getTime() - 90 * DAY), end);
  const recordedAt = end.toISOString();
  const samples: HealthSample[] = [];
  const add = (metric: string, value: number, unit: string, when = recordedAt) => {
    if (value > 0) samples.push({metric, value: Math.round(value * 10) / 10, unit, recordedAt: when});
  };
  const rows = async (type: string, window: {operator: 'between'; startTime: string; endTime: string}) => {
    try {
      const res = await hc.readRecords(type, {timeRangeFilter: window, pageSize: 500});
      return res.records ?? [];
    } catch {
      return [];
    }
  };

  const steps = await rows('Steps', day);
  add('steps', steps.reduce((sum: number, row: {count?: number}) => sum + (row.count ?? 0), 0), 'count');
  const distance = await rows('Distance', day);
  add('distance_walk', distance.reduce((sum: number, row: {distance?: Measure}) => sum + meters(row.distance), 0), 'm');
  const floors = await rows('FloorsClimbed', day);
  add('flights', floors.reduce((sum: number, row: {floors?: number}) => sum + (row.floors ?? 0), 0), 'count');
  const active = await rows('ActiveCaloriesBurned', day);
  const activeKcal = active.reduce((sum: number, row: {energy?: Measure}) => sum + kcal(row.energy), 0);
  add('active_energy', activeKcal, 'kcal');
  const total = await rows('TotalCaloriesBurned', day);
  const totalKcal = total.reduce((sum: number, row: {energy?: Measure}) => sum + kcal(row.energy), 0);
  add('basal_energy', Math.max(0, totalKcal - activeKcal), 'kcal');

  const sleep = await rows('SleepSession', sleepWindow);
  const latestSleepEnd = sleep.reduce((latest: number, row: {endTime?: string}) => Math.max(latest, Date.parse(row.endTime ?? '') || 0), 0);
  if (latestSleepEnd) {
    const nightStart = latestSleepEnd - 18 * 60 * 60 * 1000;
    let asleep = 0;
    let rem = 0;
    let core = 0;
    let deep = 0;
    let awake = 0;
    for (const session of sleep as {startTime?: string; endTime?: string; stages?: {startTime: string; endTime: string; stage: number}[]}[]) {
      if ((Date.parse(session.endTime ?? '') || 0) <= nightStart) continue;
      const stages = session.stages ?? [];
      if (!stages.length) asleep += Math.max(0, (Date.parse(session.endTime ?? '') || 0) - (Date.parse(session.startTime ?? '') || 0));
      for (const stage of stages) {
        const dur = Math.max(0, Date.parse(stage.endTime) - Date.parse(stage.startTime));
        if (stage.stage === 1) awake += dur;
        else if (stage.stage === 6) { rem += dur; asleep += dur; }
        else if (stage.stage === 5) { deep += dur; asleep += dur; }
        else if (stage.stage === 4 || stage.stage === 2) { core += dur; asleep += dur; }
      }
    }
    const when = new Date(latestSleepEnd).toISOString();
    const hours = (ms: number) => Math.round((ms / 3_600_000) * 10) / 10;
    add('sleep_hours', hours(asleep), 'hours', when);
    add('sleep_rem_hours', hours(rem), 'hours', when);
    add('sleep_core_hours', hours(core), 'hours', when);
    add('sleep_deep_hours', hours(deep), 'hours', when);
    add('sleep_awake_hours', hours(awake), 'hours', when);
  }

  const beats = (await rows('HeartRate', day)).flatMap((row: {samples?: {beatsPerMinute?: number; time?: string}[]}) => row.samples ?? []);
  const bpms = beats.map(sample => sample.beatsPerMinute ?? 0).filter(value => value > 0);
  if (bpms.length) {
    add('heart_rate', bpms[bpms.length - 1], 'bpm', beats.at(-1)?.time);
    add('heart_rate_avg', bpms.reduce((sum, value) => sum + value, 0) / bpms.length, 'bpm');
    add('heart_rate_min', Math.min(...bpms), 'bpm');
    add('heart_rate_max', Math.max(...bpms), 'bpm');
  }

  const resting = await rows('RestingHeartRate', year);
  add('resting_hr', resting.at(-1)?.beatsPerMinute ?? 0, 'bpm', resting.at(-1)?.time);
  const hrv = await rows('HeartRateVariabilityRmssd', year);
  add('hrv_ms', hrv.at(-1)?.heartRateVariabilityMillis ?? 0, 'ms', hrv.at(-1)?.time);
  const weight = await rows('Weight', year);
  add('weight_kg', massKg(weight.at(-1)?.weight), 'kg', weight.at(-1)?.time);
  const height = await rows('Height', year);
  add('height_cm', meters(height.at(-1)?.height) * 100, 'cm', height.at(-1)?.time);
  const fat = await rows('BodyFat', year);
  add('body_fat_pct', (fat.at(-1)?.percentage ?? 0) <= 1.5 ? (fat.at(-1)?.percentage ?? 0) * 100 : fat.at(-1)?.percentage ?? 0, '%', fat.at(-1)?.time);
  const lean = await rows('LeanBodyMass', year);
  add('lean_mass_kg', massKg(lean.at(-1)?.mass), 'kg', lean.at(-1)?.time);
  const oxygen = await rows('OxygenSaturation', year);
  add('oxygen_pct', (oxygen.at(-1)?.percentage ?? 0) <= 1.5 ? (oxygen.at(-1)?.percentage ?? 0) * 100 : oxygen.at(-1)?.percentage ?? 0, '%', oxygen.at(-1)?.time);
  const breath = await rows('RespiratoryRate', year);
  add('respiratory_rate', breath.at(-1)?.rate ?? 0, 'breaths/min', breath.at(-1)?.time);
  const vo2 = await rows('Vo2Max', year);
  add('vo2_max', vo2.at(-1)?.vo2MillilitersPerMinuteKilogram ?? 0, 'ml/kg/min', vo2.at(-1)?.time);
  const pressure = await rows('BloodPressure', year);
  add('bp_systolic', pressure.at(-1)?.systolic?.value ?? 0, 'mmHg', pressure.at(-1)?.time);
  add('bp_diastolic', pressure.at(-1)?.diastolic?.value ?? 0, 'mmHg', pressure.at(-1)?.time);
  const glucose = await rows('BloodGlucose', year);
  const level = glucose.at(-1)?.level;
  add('glucose_mg', level?.unit === 'millimolesPerLiter' ? (level.value ?? 0) * 18 : level?.value ?? 0, 'mg/dL', glucose.at(-1)?.time);
  const temp = await rows('BodyTemperature', year);
  add('temperature_c', celsius(temp.at(-1)?.temperature), '°C', temp.at(-1)?.time);
  const water = await rows('Hydration', day);
  add('dietary_water', water.reduce((sum: number, row: {volume?: Measure}) => sum + ml(row.volume), 0), 'ml');

  const meals = await rows('Nutrition', day);
  add('dietary_energy', meals.reduce((sum: number, row: {energy?: Measure}) => sum + kcal(row.energy), 0), 'kcal');
  add('dietary_protein', meals.reduce((sum: number, row: {protein?: Measure}) => sum + grams(row.protein), 0), 'g');
  add('dietary_carbs', meals.reduce((sum: number, row: {totalCarbohydrate?: Measure}) => sum + grams(row.totalCarbohydrate), 0), 'g');
  add('dietary_fat', meals.reduce((sum: number, row: {totalFat?: Measure}) => sum + grams(row.totalFat), 0), 'g');
  add('dietary_caffeine', meals.reduce((sum: number, row: {caffeine?: Measure}) => sum + grams(row.caffeine) * 1000, 0), 'mg');
  const nutrients: [string, string, string][] = [
    ['dietary_sugar', 'sugar', 'g'],
    ['dietary_fiber', 'dietaryFiber', 'g'],
    ['dietary_sat_fat', 'saturatedFat', 'g'],
    ['dietary_mono_fat', 'monounsaturatedFat', 'g'],
    ['dietary_poly_fat', 'polyunsaturatedFat', 'g'],
    ['dietary_sodium', 'sodium', 'mg'],
    ['dietary_cholesterol', 'cholesterol', 'mg'],
    ['dietary_calcium', 'calcium', 'mg'],
    ['dietary_iron', 'iron', 'mg'],
    ['dietary_potassium', 'potassium', 'mg'],
    ['dietary_vitamin_c', 'vitaminC', 'mg'],
    ['dietary_vitamin_a', 'vitaminA', 'µg'],
    ['dietary_vitamin_d', 'vitaminD', 'µg'],
  ];
  for (const [metric, key, unit] of nutrients) {
    const total = meals.reduce((sum: number, row: Record<string, Measure | undefined>) => {
      const mass = grams(row[key]);
      if (unit === 'mg') return sum + mass * 1000;
      if (unit === 'µg') return sum + mass * 1_000_000;
      return sum + mass;
    }, 0);
    add(metric, total, unit);
  }

  const exercise = await rows('ExerciseSession', workouts);
  exercise.slice(-30).forEach((session: {startTime?: string; endTime?: string; title?: string; exerciseType?: number}, index: number) => {
    const minutes = Math.round(Math.max(0, (Date.parse(session.endTime ?? '') || 0) - (Date.parse(session.startTime ?? '') || 0)) / 60000);
    add(`workout_${index + 1}`, minutes, session.title || EXERCISE_NAMES[session.exerciseType ?? -1] || 'Workout', session.endTime);
  });
  return samples;
}

type Measure = {value?: number; unit?: string};

function range(start: Date, end: Date) {
  return {operator: 'between' as const, startTime: start.toISOString(), endTime: end.toISOString()};
}

function massKg(mass: Measure | undefined) {
  if (!mass?.value) return 0;
  if (mass.unit === 'grams') return mass.value / 1000;
  if (mass.unit === 'pounds') return mass.value * 0.453592;
  if (mass.unit === 'ounces') return mass.value * 0.0283495;
  return mass.value;
}

function meters(length: Measure | undefined) {
  if (!length?.value) return 0;
  if (length.unit === 'kilometers') return length.value * 1000;
  if (length.unit === 'miles') return length.value * 1609.34;
  if (length.unit === 'inches') return length.value * 0.0254;
  if (length.unit === 'feet') return length.value * 0.3048;
  return length.value;
}

function kcal(energy: Measure | undefined) {
  if (!energy?.value) return 0;
  if (energy.unit === 'calories') return energy.value / 1000;
  if (energy.unit === 'joules') return energy.value / 4184;
  if (energy.unit === 'kilojoules') return energy.value / 4.184;
  return energy.value;
}

function grams(mass: Measure | undefined) {
  if (!mass?.value) return 0;
  if (mass.unit === 'kilograms') return mass.value * 1000;
  if (mass.unit === 'milligrams') return mass.value / 1000;
  return mass.value;
}

function ml(volume: Measure | undefined) {
  if (!volume?.value) return 0;
  if (volume.unit === 'liters') return volume.value * 1000;
  if (volume.unit === 'fluidOuncesUs') return volume.value * 29.5735;
  return volume.value;
}

function celsius(temp: Measure | undefined) {
  if (!temp?.value) return 0;
  if (temp.unit === 'fahrenheit') return ((temp.value - 32) * 5) / 9;
  return temp.value;
}

export async function postHealth(apiBase: string, token: string, payload: {source: string; samples: HealthSample[]}) {
  const res = await fetch(`${apiBase}/api/health/sync`, {
    method: 'POST',
    headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Sync failed (${res.status})`);
  return data as {ok: boolean; saved: number};
}
