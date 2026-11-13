export type WhoopSample = {metric: string; value: number; unit: string; recordedAt: string};

type Rec = Record<string, unknown>;

function num(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function when(record: Rec, fallback: string) {
  const stamp = record.end ?? record.created_at ?? record.start ?? record.updated_at;
  return typeof stamp === 'string' && !Number.isNaN(Date.parse(stamp)) ? stamp : fallback;
}

function push(out: WhoopSample[], metric: string, value: number | null, unit: string, recordedAt: string) {
  if (value == null || value === 0) return;
  const rounded = Math.round(Math.abs(value) * 10) / 10;
  if (rounded === 0) return;
  out.push({metric, value: rounded, unit: value < 0 && unit === 'm' ? 'm down' : unit, recordedAt});
}

function hours(ms: unknown) {
  const value = num(ms);
  return value == null ? null : value / 3_600_000;
}

export function whoopReadings(input: {recovery?: Rec | null; sleep?: Rec | null; cycle?: Rec | null; workouts?: Rec | null}, now = new Date().toISOString()) {
  const out: WhoopSample[] = [];
  const recovery = record(input.recovery);
  const recoveryScore = obj(recovery?.score);
  const recoveryAt = recovery ? when(recovery, now) : now;
  push(out, 'recovery_score', num(recoveryScore?.recovery_score), 'score', recoveryAt);
  push(out, 'resting_hr', num(recoveryScore?.resting_heart_rate), 'bpm', recoveryAt);
  push(out, 'hrv_ms', num(recoveryScore?.hrv_rmssd_milli), 'ms', recoveryAt);
  push(out, 'spo2_pct', num(recoveryScore?.spo2_percentage), '%', recoveryAt);
  push(out, 'skin_temp_c', num(recoveryScore?.skin_temp_celsius), '°C', recoveryAt);

  const sleep = record(input.sleep);
  const sleepScore = obj(sleep?.score);
  const stages = obj(sleepScore?.stage_summary);
  const needed = obj(sleepScore?.sleep_needed);
  const sleepAt = sleep ? when(sleep, now) : now;
  const asleep = [stages?.total_light_sleep_time_milli, stages?.total_slow_wave_sleep_time_milli, stages?.total_rem_sleep_time_milli]
    .reduce((sum: number, value) => sum + (num(value) ?? 0), 0);
  push(out, 'sleep_hours', hours(asleep), 'hours', sleepAt);
  push(out, 'sleep_light_hours', hours(stages?.total_light_sleep_time_milli), 'hours', sleepAt);
  push(out, 'sleep_sws_hours', hours(stages?.total_slow_wave_sleep_time_milli), 'hours', sleepAt);
  push(out, 'sleep_rem_hours', hours(stages?.total_rem_sleep_time_milli), 'hours', sleepAt);
  push(out, 'sleep_awake_hours', hours(stages?.total_awake_time_milli), 'hours', sleepAt);
  push(out, 'sleep_in_bed_hours', hours(stages?.total_in_bed_time_milli), 'hours', sleepAt);
  push(out, 'sleep_cycles', num(stages?.sleep_cycle_count), 'count', sleepAt);
  push(out, 'sleep_disturbances', num(stages?.disturbance_count), 'count', sleepAt);
  push(out, 'respiratory_rate', num(sleepScore?.respiratory_rate), 'breaths/min', sleepAt);
  push(out, 'sleep_performance_pct', num(sleepScore?.sleep_performance_percentage), '%', sleepAt);
  push(out, 'sleep_consistency_pct', num(sleepScore?.sleep_consistency_percentage), '%', sleepAt);
  push(out, 'sleep_efficiency_pct', num(sleepScore?.sleep_efficiency_percentage), '%', sleepAt);
  push(out, 'sleep_needed_hours', hours(needed?.baseline_milli), 'hours', sleepAt);
  push(out, 'sleep_debt_hours', hours(needed?.need_from_sleep_debt_milli), 'hours', sleepAt);
  push(out, 'strain_need_hours', hours(needed?.need_from_recent_strain_milli), 'hours', sleepAt);
  const nap = num(needed?.need_from_recent_nap_milli);
  if (nap != null && nap < 0) push(out, 'nap_credit_hours', hours(nap), 'hours', sleepAt);

  const cycle = record(input.cycle);
  const cycleScore = obj(cycle?.score);
  const cycleAt = cycle ? when(cycle, now) : now;
  push(out, 'strain', num(cycleScore?.strain), 'strain', cycleAt);
  push(out, 'cycle_kcal', num(cycleScore?.kilojoule) == null ? null : (num(cycleScore?.kilojoule) as number) / 4.184, 'kcal', cycleAt);
  push(out, 'cycle_avg_hr', num(cycleScore?.average_heart_rate), 'bpm', cycleAt);
  push(out, 'cycle_max_hr', num(cycleScore?.max_heart_rate), 'bpm', cycleAt);

  const workouts = Array.isArray(input.workouts?.records) ? input.workouts.records as Rec[] : [];
  workouts.slice(0, 10).forEach((workout, index) => {
    const score = obj(workout.score);
    const start = Date.parse(String(workout.start ?? ''));
    const end = Date.parse(String(workout.end ?? ''));
    const minutes = Number.isNaN(start) || Number.isNaN(end) ? null : (end - start) / 60000;
    const sport = typeof workout.sport_name === 'string' && workout.sport_name.trim() ? title(workout.sport_name) : 'Workout';
    const bits = [sport];
    const strain = num(score?.strain);
    const avg = num(score?.average_heart_rate);
    const max = num(score?.max_heart_rate);
    const distance = num(score?.distance_meter);
    const kcal = num(score?.kilojoule);
    if (strain) bits.push(`${strain.toFixed(1)} strain`);
    if (avg && max) bits.push(`${Math.round(avg)}–${Math.round(max)} bpm`);
    else if (avg) bits.push(`${Math.round(avg)} bpm`);
    if (distance) bits.push(distance >= 1000 ? `${(distance / 1000).toFixed(2)} km` : `${Math.round(distance)} m`);
    if (kcal) bits.push(`${Math.round(kcal / 4.184)} kcal`);
    const at = when(workout, now);
    push(out, `workout_${index + 1}`, minutes, bits.join(' · ').slice(0, 80), at);
    if (index === 0) {
      const zones = obj(score?.zone_duration);
      push(out, 'zone_0_min', zoneMin(zones?.zone_zero_milli), 'min', at);
      push(out, 'zone_1_min', zoneMin(zones?.zone_one_milli), 'min', at);
      push(out, 'zone_2_min', zoneMin(zones?.zone_two_milli), 'min', at);
      push(out, 'zone_3_min', zoneMin(zones?.zone_three_milli), 'min', at);
      push(out, 'zone_4_min', zoneMin(zones?.zone_four_milli), 'min', at);
      push(out, 'zone_5_min', zoneMin(zones?.zone_five_milli), 'min', at);
      push(out, 'workout_altitude_m', num(score?.altitude_gain_meter), 'm', at);
      const change = num(score?.altitude_change_meter);
      if (change) push(out, 'workout_altitude_change_m', change, 'm', at);
    }
  });
  return out;
}

function record(body: Rec | null | undefined) {
  const records = body?.records;
  return Array.isArray(records) ? (records[0] as Rec | undefined) : undefined;
}

function obj(value: unknown) {
  return value && typeof value === 'object' ? value as Rec : undefined;
}

function zoneMin(value: unknown) {
  const ms = num(value);
  return ms == null ? null : ms / 60000;
}

function title(value: string) {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}
