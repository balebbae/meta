const METRIC = /^[a-z][a-z0-9_]{0,40}$/;

export function cleanHealthSample(sample: {metric: string; value: number; unit: string; recordedAt: string}) {
  if (!METRIC.test(sample.metric ?? '')) return null;
  if (typeof sample.unit !== 'string' || sample.unit.length === 0 || sample.unit.length > 80) return null;
  if (!Number.isFinite(sample.value) || sample.value <= 0 || sample.value >= 1e9) return null;
  const recorded = Date.parse(sample.recordedAt);
  if (Number.isNaN(recorded)) return null;
  return {metric: sample.metric, value: sample.value, unit: sample.unit, recordedAt: new Date(recorded).toISOString()};
}

export type HealthReading = {metric: string; value: number; unit: string; recordedAt: string};
export type HealthRow = {key: string; label: string; value: string; when: string};
export type HealthSection = {title: string; rows: HealthRow[]};

const LABELS: Record<string, string> = {
  steps: 'Steps',
  distance_walk: 'Walking + running',
  distance_cycle: 'Cycling',
  distance_swim: 'Swimming distance',
  distance_wheelchair: 'Wheelchair distance',
  flights: 'Flights climbed',
  active_energy: 'Active energy',
  basal_energy: 'Resting energy',
  exercise_min: 'Exercise',
  stand_min: 'Stand time',
  push_count: 'Pushes',
  swim_strokes: 'Swim strokes',
  daylight_min: 'Daylight',
  heart_rate: 'Heart rate',
  heart_rate_avg: "Today's average",
  heart_rate_min: "Today's low",
  heart_rate_max: "Today's high",
  resting_hr: 'Resting heart rate',
  walking_hr: 'Walking heart rate',
  hrv_ms: 'Heart rate variability',
  hr_recovery: 'Heart rate recovery',
  oxygen_pct: 'Blood oxygen',
  respiratory_rate: 'Respiratory rate',
  vo2_max: 'VO₂ max',
  afib_burden_pct: 'AFib burden',
  sleep_hours: 'Asleep',
  sleep_rem_hours: 'REM',
  sleep_core_hours: 'Core',
  sleep_deep_hours: 'Deep',
  sleep_awake_hours: 'Awake',
  sleep_in_bed_hours: 'In bed',
  weight_kg: 'Weight',
  height_cm: 'Height',
  bmi: 'BMI',
  body_fat_pct: 'Body fat',
  lean_mass_kg: 'Lean mass',
  waist_cm: 'Waist',
  temperature_c: 'Temperature',
  wrist_temperature_c: 'Wrist temperature',
  bp_systolic: 'Systolic',
  bp_diastolic: 'Diastolic',
  glucose_mg: 'Blood glucose',
  walking_speed: 'Walking speed',
  step_length_cm: 'Step length',
  walking_asymmetry_pct: 'Walking asymmetry',
  double_support_pct: 'Double support',
  stair_up_mps: 'Stair ascent',
  stair_down_mps: 'Stair descent',
  six_min_walk_m: 'Six-minute walk',
  audio_env_db: 'Environmental sound',
  audio_headphones_db: 'Headphone audio',
  dietary_energy: 'Calories eaten',
  dietary_water: 'Water',
  dietary_caffeine: 'Caffeine',
  dietary_protein: 'Protein',
  dietary_carbs: 'Carbs',
  dietary_fat: 'Fat',
  dietary_sugar: 'Sugar',
  dietary_fiber: 'Fiber',
  dietary_sodium: 'Sodium',
  dietary_cholesterol: 'Cholesterol',
  dietary_sat_fat: 'Saturated fat',
  uv_exposure: 'UV exposure',
  walking_steadiness_pct: 'Walking steadiness',
  mindful_min: 'Mindfulness',
  recovery_score: 'Recovery',
  spo2_pct: 'Blood oxygen',
  skin_temp_c: 'Skin temperature',
  sleep_light_hours: 'Light sleep',
  sleep_sws_hours: 'Slow-wave sleep',
  sleep_cycles: 'Sleep cycles',
  sleep_disturbances: 'Disturbances',
  sleep_performance_pct: 'Sleep performance',
  sleep_consistency_pct: 'Sleep consistency',
  sleep_efficiency_pct: 'Sleep efficiency',
  sleep_needed_hours: 'Sleep needed',
  sleep_debt_hours: 'Sleep debt',
  strain_need_hours: 'Extra sleep from strain',
  nap_credit_hours: 'Nap credit',
  strain: 'Day strain',
  cycle_kcal: 'Calories burned',
  cycle_avg_hr: 'Average heart rate',
  cycle_max_hr: 'Max heart rate',
  zone_0_min: 'HR zone 0',
  zone_1_min: 'HR zone 1',
  zone_2_min: 'HR zone 2',
  zone_3_min: 'HR zone 3',
  zone_4_min: 'HR zone 4',
  zone_5_min: 'HR zone 5',
  workout_altitude_m: 'Altitude gain',
  workout_altitude_change_m: 'Altitude change',
  workout_minutes: 'Workouts',
};

const HIGHLIGHTS = ['recovery_score', 'strain', 'steps', 'sleep_hours', 'heart_rate', 'active_energy', 'resting_hr', 'hrv_ms'];

const SECTIONS: {title: string; metrics: string[]}[] = [
  {title: 'Activity', metrics: ['steps', 'distance_walk', 'distance_cycle', 'distance_swim', 'distance_wheelchair', 'flights', 'active_energy', 'basal_energy', 'exercise_min', 'stand_min', 'push_count', 'swim_strokes', 'daylight_min']},
  {title: 'Heart', metrics: ['heart_rate', 'heart_rate_avg', 'heart_rate_min', 'heart_rate_max', 'resting_hr', 'walking_hr', 'hrv_ms', 'hr_recovery', 'oxygen_pct', 'spo2_pct', 'respiratory_rate', 'vo2_max', 'afib_burden_pct', 'cycle_avg_hr', 'cycle_max_hr', 'zone_0_min', 'zone_1_min', 'zone_2_min', 'zone_3_min', 'zone_4_min', 'zone_5_min']},
  {title: 'Sleep', metrics: ['sleep_hours', 'sleep_rem_hours', 'sleep_core_hours', 'sleep_deep_hours', 'sleep_light_hours', 'sleep_sws_hours', 'sleep_awake_hours', 'sleep_in_bed_hours', 'sleep_cycles', 'sleep_disturbances', 'sleep_performance_pct', 'sleep_consistency_pct', 'sleep_efficiency_pct', 'sleep_needed_hours', 'sleep_debt_hours', 'strain_need_hours', 'nap_credit_hours']},
  {title: 'Body', metrics: ['weight_kg', 'height_cm', 'bmi', 'body_fat_pct', 'lean_mass_kg', 'waist_cm', 'temperature_c', 'wrist_temperature_c', 'skin_temp_c', 'walking_steadiness_pct']},
  {title: 'Vitals', metrics: ['glucose_mg']},
  {title: 'Mobility', metrics: ['walking_speed', 'step_length_cm', 'walking_asymmetry_pct', 'double_support_pct', 'stair_up_mps', 'stair_down_mps', 'six_min_walk_m', 'workout_altitude_m', 'workout_altitude_change_m']},
  {title: 'Hearing', metrics: ['audio_env_db', 'audio_headphones_db']},
  {title: 'Nutrition', metrics: ['dietary_energy', 'dietary_water', 'dietary_caffeine', 'dietary_protein', 'dietary_carbs', 'dietary_fat', 'dietary_sugar', 'dietary_fiber', 'dietary_sodium', 'dietary_cholesterol', 'dietary_sat_fat', 'uv_exposure', 'mindful_min']},
  {title: 'Whoop', metrics: ['recovery_score', 'strain', 'cycle_kcal', 'workout_minutes']},
];

function grouped(value: number) {
  return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatHours(hours: number) {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatMinutes(min: number) {
  const total = Math.round(min);
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function formatHealthValue(unit: string, value: number) {
  if (unit === 'hours') return formatHours(value);
  if (unit === 'min') return formatMinutes(value);
  if (unit === 'count') return grouped(value);
  if (unit === 'm') return value >= 1000 ? `${(value / 1000).toFixed(2)} km` : `${Math.round(value)} m`;
  if (unit === 'ml') return value >= 1000 ? `${(value / 1000).toFixed(1)} L` : `${grouped(value)} ml`;
  if (unit === 'kcal') return `${grouped(value)} kcal`;
  if (unit === 'bpm' || unit === 'ms' || unit === 'mmHg' || unit === 'dB' || unit === 'mg' || unit === 'mg/dL') return `${grouped(value)} ${unit}`;
  if (unit === '%') return `${value.toFixed(value % 1 ? 1 : 0)}%`;
  if (unit === 'kg' || unit === '°C' || unit === 'ml/kg/min' || unit === 'm/s') return `${value.toFixed(1)} ${unit}`;
  if (unit === 'cm' || unit === 'g') return `${value.toFixed(value % 1 ? 1 : 0)} ${unit}`;
  if (unit === 'breaths/min') return `${grouped(value)} breaths/min`;
  if (unit === 'bmi' || unit === 'strain' || unit === 'score') return `${value.toFixed(1)} ${unit}`;
  return `${value} ${unit}`;
}

function when(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'});
}

function row(sample: HealthReading, label: string, value: string): HealthRow {
  return {key: sample.metric, label, value, when: when(sample.recordedAt)};
}

export function layoutHealth(samples: HealthReading[]) {
  const byMetric = new Map(samples.map(sample => [sample.metric, sample]));
  const highlights = HIGHLIGHTS.flatMap(metric => {
    const sample = byMetric.get(metric);
    return sample ? [row(sample, LABELS[metric] ?? metric, formatHealthValue(sample.unit, sample.value))] : [];
  }).slice(0, 4);

  const sections: HealthSection[] = [];
  const seen = new Set(HIGHLIGHTS);
  for (const section of SECTIONS) {
    const rows = section.metrics.flatMap(metric => {
      if (seen.has(metric)) return [];
      const sample = byMetric.get(metric);
      if (!sample) return [];
      seen.add(metric);
      return [row(sample, LABELS[metric] ?? metric, formatHealthValue(sample.unit, sample.value))];
    });
    if (section.title === 'Vitals') {
      const systolic = byMetric.get('bp_systolic');
      const diastolic = byMetric.get('bp_diastolic');
      if (systolic && diastolic) {
        seen.add('bp_systolic');
        seen.add('bp_diastolic');
        rows.unshift(row(systolic, 'Blood pressure', `${Math.round(systolic.value)}/${Math.round(diastolic.value)} mmHg`));
      }
    }
    if (rows.length) sections.push({title: section.title, rows});
  }

  const workouts = samples
    .filter(sample => sample.metric.startsWith('workout_'))
    .map(sample => row(sample, sample.unit, formatMinutes(sample.value)));
  if (workouts.length) sections.push({title: 'Workouts', rows: workouts});

  const more = samples
    .filter(sample => !seen.has(sample.metric) && !sample.metric.startsWith('workout_'))
    .map(sample => row(sample, LABELS[sample.metric] ?? sample.metric, formatHealthValue(sample.unit, sample.value)));
  if (more.length) sections.push({title: 'More', rows: more});

  return {highlights, sections};
}
