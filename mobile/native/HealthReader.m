#import <HealthKit/HealthKit.h>
#import <React/RCTBridgeModule.h>

@interface HealthReader : NSObject <RCTBridgeModule>
@end

static HKUnit *UnitForKind(NSString *kind) {
  if ([kind isEqualToString:@"count"]) return [HKUnit countUnit];
  if ([kind isEqualToString:@"kcal"]) return [HKUnit kilocalorieUnit];
  if ([kind isEqualToString:@"m"]) return [HKUnit meterUnit];
  if ([kind isEqualToString:@"min"]) return [HKUnit minuteUnit];
  if ([kind isEqualToString:@"bpm"]) return [HKUnit unitFromString:@"count/min"];
  if ([kind isEqualToString:@"kg"]) return [HKUnit gramUnitWithMetricPrefix:HKMetricPrefixKilo];
  if ([kind isEqualToString:@"cm"]) return [HKUnit meterUnitWithMetricPrefix:HKMetricPrefixCenti];
  if ([kind isEqualToString:@"ml"]) return [HKUnit literUnitWithMetricPrefix:HKMetricPrefixMilli];
  if ([kind isEqualToString:@"mg"]) return [HKUnit gramUnitWithMetricPrefix:HKMetricPrefixMilli];
  if ([kind isEqualToString:@"g"]) return [HKUnit gramUnit];
  if ([kind isEqualToString:@"c"]) return [HKUnit degreeCelsiusUnit];
  if ([kind isEqualToString:@"mmhg"]) return [HKUnit millimeterOfMercuryUnit];
  if ([kind isEqualToString:@"db"]) return [HKUnit decibelAWeightedSoundPressureLevelUnit];
  if ([kind isEqualToString:@"mps"]) return [[HKUnit meterUnit] unitDividedByUnit:[HKUnit secondUnit]];
  if ([kind isEqualToString:@"w"]) return [HKUnit wattUnit];
  if ([kind isEqualToString:@"l"]) return [HKUnit literUnit];
  if ([kind isEqualToString:@"lpm"]) return [[HKUnit literUnit] unitDividedByUnit:[HKUnit minuteUnit]];
  if ([kind isEqualToString:@"iu"]) return [HKUnit internationalUnit];
  if ([kind isEqualToString:@"vo2"]) {
    HKUnit *ml = [HKUnit literUnitWithMetricPrefix:HKMetricPrefixMilli];
    HKUnit *kg = [HKUnit gramUnitWithMetricPrefix:HKMetricPrefixKilo];
    return [ml unitDividedByUnit:[kg unitMultipliedByUnit:[HKUnit minuteUnit]]];
  }
  return nil;
}

static double Convert(HKQuantity *qty, NSString *kind) {
  if ([kind isEqualToString:@"ms"]) return round([qty doubleValueForUnit:[HKUnit secondUnit]] * 1000.0);
  if ([kind isEqualToString:@"pct"]) {
    double raw = [qty doubleValueForUnit:[HKUnit percentUnit]];
    double pct = raw <= 1.5 ? raw * 100.0 : raw;
    return round(pct * 10.0) / 10.0;
  }
  if ([kind isEqualToString:@"mgdl"]) {
    HKUnit *mg = [HKUnit gramUnitWithMetricPrefix:HKMetricPrefixMilli];
    HKUnit *dl = [HKUnit literUnitWithMetricPrefix:HKMetricPrefixDeci];
    return round([qty doubleValueForUnit:[mg unitDividedByUnit:dl]]);
  }
  if ([kind isEqualToString:@"decimal"]) {
    return round([qty doubleValueForUnit:[HKUnit countUnit]] * 10.0) / 10.0;
  }
  if ([kind isEqualToString:@"ug"]) return round([qty doubleValueForUnit:[HKUnit gramUnit]] * 1000000.0 * 10.0) / 10.0;
  if ([kind isEqualToString:@"us"]) return round([qty doubleValueForUnit:[HKUnit siemenUnit]] * 1000000.0 * 10.0) / 10.0;
  if ([kind isEqualToString:@"met"]) {
    HKUnit *perKgHour = [[HKUnit gramUnitWithMetricPrefix:HKMetricPrefixKilo] unitMultipliedByUnit:[HKUnit hourUnit]];
    return round([qty doubleValueForUnit:[[HKUnit kilocalorieUnit] unitDividedByUnit:perKgHour]] * 10.0) / 10.0;
  }
  if ([kind isEqualToString:@"effort"]) {
    if (@available(iOS 18.0, *)) return round([qty doubleValueForUnit:[HKUnit appleEffortScoreUnit]] * 10.0) / 10.0;
    return 0;
  }
  HKUnit *unit = UnitForKind(kind);
  if (unit == nil) return 0;
  double value = [qty doubleValueForUnit:unit];
  if ([kind isEqualToString:@"count"] || [kind isEqualToString:@"kcal"] || [kind isEqualToString:@"min"] ||
      [kind isEqualToString:@"bpm"] || [kind isEqualToString:@"ml"] || [kind isEqualToString:@"mg"] ||
      [kind isEqualToString:@"mmhg"] || [kind isEqualToString:@"db"]) {
    return round(value);
  }
  return round(value * 10.0) / 10.0;
}

static double Hours(NSTimeInterval seconds) {
  return round((seconds / 3600.0) * 10.0) / 10.0;
}

static NSString *ISO(NSDate *date) {
  NSISO8601DateFormatter *fmt = [NSISO8601DateFormatter new];
  fmt.formatOptions = NSISO8601DateFormatWithInternetDateTime;
  return [fmt stringFromDate:date] ?: @"";
}

static NSString *WorkoutName(HKWorkoutActivityType type) {
  switch (type) {
    case HKWorkoutActivityTypeRunning: return @"Running";
    case HKWorkoutActivityTypeWalking: return @"Walking";
    case HKWorkoutActivityTypeCycling: return @"Cycling";
    case HKWorkoutActivityTypeSwimming: return @"Swimming";
    case HKWorkoutActivityTypeTraditionalStrengthTraining: return @"Strength";
    case HKWorkoutActivityTypeFunctionalStrengthTraining: return @"Functional strength";
    case HKWorkoutActivityTypeHighIntensityIntervalTraining: return @"HIIT";
    case HKWorkoutActivityTypeYoga: return @"Yoga";
    case HKWorkoutActivityTypeHiking: return @"Hiking";
    case HKWorkoutActivityTypeElliptical: return @"Elliptical";
    case HKWorkoutActivityTypeRowing: return @"Rowing";
    case HKWorkoutActivityTypeStairClimbing: return @"Stair climbing";
    case HKWorkoutActivityTypeDance: return @"Dance";
    case HKWorkoutActivityTypeCooldown: return @"Cooldown";
    case HKWorkoutActivityTypeCoreTraining: return @"Core training";
    case HKWorkoutActivityTypeFlexibility: return @"Flexibility";
    case HKWorkoutActivityTypeMixedCardio: return @"Mixed cardio";
    case HKWorkoutActivityTypeSoccer: return @"Soccer";
    case HKWorkoutActivityTypeBasketball: return @"Basketball";
    case HKWorkoutActivityTypeTennis: return @"Tennis";
    case HKWorkoutActivityTypePilates: return @"Pilates";
    case HKWorkoutActivityTypeMartialArts: return @"Martial arts";
    case HKWorkoutActivityTypeBoxing: return @"Boxing";
    case HKWorkoutActivityTypeJumpRope: return @"Jump rope";
    case HKWorkoutActivityTypeClimbing: return @"Climbing";
    case HKWorkoutActivityTypeSurfingSports: return @"Surfing";
    case HKWorkoutActivityTypeDownhillSkiing: return @"Skiing";
    case HKWorkoutActivityTypeSnowboarding: return @"Snowboarding";
    case HKWorkoutActivityTypeSkatingSports: return @"Skating";
    case HKWorkoutActivityTypePaddleSports: return @"Paddling";
    case HKWorkoutActivityTypeOther: return @"Workout";
    default: return @"Workout";
  }
}

static NSArray *Catalog(void) {
  return @[
    @{@"id" : @"HKQuantityTypeIdentifierStepCount", @"metric" : @"steps", @"kind" : @"count", @"unit" : @"count", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDistanceWalkingRunning", @"metric" : @"distance_walk", @"kind" : @"m", @"unit" : @"m", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDistanceCycling", @"metric" : @"distance_cycle", @"kind" : @"m", @"unit" : @"m", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDistanceSwimming", @"metric" : @"distance_swim", @"kind" : @"m", @"unit" : @"m", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDistanceWheelchair", @"metric" : @"distance_wheelchair", @"kind" : @"m", @"unit" : @"m", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierFlightsClimbed", @"metric" : @"flights", @"kind" : @"count", @"unit" : @"count", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierActiveEnergyBurned", @"metric" : @"active_energy", @"kind" : @"kcal", @"unit" : @"kcal", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierBasalEnergyBurned", @"metric" : @"basal_energy", @"kind" : @"kcal", @"unit" : @"kcal", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierAppleExerciseTime", @"metric" : @"exercise_min", @"kind" : @"min", @"unit" : @"min", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierAppleStandTime", @"metric" : @"stand_min", @"kind" : @"min", @"unit" : @"min", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierPushCount", @"metric" : @"push_count", @"kind" : @"count", @"unit" : @"count", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierSwimmingStrokeCount", @"metric" : @"swim_strokes", @"kind" : @"count", @"unit" : @"count", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierTimeInDaylight", @"metric" : @"daylight_min", @"kind" : @"min", @"unit" : @"min", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietaryEnergyConsumed", @"metric" : @"dietary_energy", @"kind" : @"kcal", @"unit" : @"kcal", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietaryWater", @"metric" : @"dietary_water", @"kind" : @"ml", @"unit" : @"ml", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietaryCaffeine", @"metric" : @"dietary_caffeine", @"kind" : @"mg", @"unit" : @"mg", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietaryProtein", @"metric" : @"dietary_protein", @"kind" : @"g", @"unit" : @"g", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietaryCarbohydrates", @"metric" : @"dietary_carbs", @"kind" : @"g", @"unit" : @"g", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietaryFatTotal", @"metric" : @"dietary_fat", @"kind" : @"g", @"unit" : @"g", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierHeartRate", @"metric" : @"heart_rate", @"kind" : @"bpm", @"unit" : @"bpm", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierRestingHeartRate", @"metric" : @"resting_hr", @"kind" : @"bpm", @"unit" : @"bpm", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierWalkingHeartRateAverage", @"metric" : @"walking_hr", @"kind" : @"bpm", @"unit" : @"bpm", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierHeartRateVariabilitySDNN", @"metric" : @"hrv_ms", @"kind" : @"ms", @"unit" : @"ms", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierHeartRateRecoveryOneMinute", @"metric" : @"hr_recovery", @"kind" : @"bpm", @"unit" : @"bpm", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierOxygenSaturation", @"metric" : @"oxygen_pct", @"kind" : @"pct", @"unit" : @"%", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierRespiratoryRate", @"metric" : @"respiratory_rate", @"kind" : @"bpm", @"unit" : @"breaths/min", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierVO2Max", @"metric" : @"vo2_max", @"kind" : @"vo2", @"unit" : @"ml/kg/min", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierAtrialFibrillationBurden", @"metric" : @"afib_burden_pct", @"kind" : @"pct", @"unit" : @"%", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierBodyMass", @"metric" : @"weight_kg", @"kind" : @"kg", @"unit" : @"kg", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierHeight", @"metric" : @"height_cm", @"kind" : @"cm", @"unit" : @"cm", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierBodyMassIndex", @"metric" : @"bmi", @"kind" : @"decimal", @"unit" : @"bmi", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierBodyFatPercentage", @"metric" : @"body_fat_pct", @"kind" : @"pct", @"unit" : @"%", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierLeanBodyMass", @"metric" : @"lean_mass_kg", @"kind" : @"kg", @"unit" : @"kg", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierWaistCircumference", @"metric" : @"waist_cm", @"kind" : @"cm", @"unit" : @"cm", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierBodyTemperature", @"metric" : @"temperature_c", @"kind" : @"c", @"unit" : @"°C", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierAppleSleepingWristTemperature", @"metric" : @"wrist_temperature_c", @"kind" : @"c", @"unit" : @"°C", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierBloodPressureSystolic", @"metric" : @"bp_systolic", @"kind" : @"mmhg", @"unit" : @"mmHg", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierBloodPressureDiastolic", @"metric" : @"bp_diastolic", @"kind" : @"mmhg", @"unit" : @"mmHg", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierBloodGlucose", @"metric" : @"glucose_mg", @"kind" : @"mgdl", @"unit" : @"mg/dL", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierWalkingSpeed", @"metric" : @"walking_speed", @"kind" : @"mps", @"unit" : @"m/s", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierWalkingStepLength", @"metric" : @"step_length_cm", @"kind" : @"cm", @"unit" : @"cm", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierWalkingAsymmetryPercentage", @"metric" : @"walking_asymmetry_pct", @"kind" : @"pct", @"unit" : @"%", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierWalkingDoubleSupportPercentage", @"metric" : @"double_support_pct", @"kind" : @"pct", @"unit" : @"%", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierStairAscentSpeed", @"metric" : @"stair_up_mps", @"kind" : @"mps", @"unit" : @"m/s", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierStairDescentSpeed", @"metric" : @"stair_down_mps", @"kind" : @"mps", @"unit" : @"m/s", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierSixMinuteWalkTestDistance", @"metric" : @"six_min_walk_m", @"kind" : @"m", @"unit" : @"m", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierEnvironmentalAudioExposure", @"metric" : @"audio_env_db", @"kind" : @"db", @"unit" : @"dB", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierHeadphoneAudioExposure", @"metric" : @"audio_headphones_db", @"kind" : @"db", @"unit" : @"dB", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierEnvironmentalSoundReduction", @"metric" : @"sound_reduction_db", @"kind" : @"db", @"unit" : @"dB", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierAppleMoveTime", @"metric" : @"move_min", @"kind" : @"min", @"unit" : @"min", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDistanceCrossCountrySkiing", @"metric" : @"distance_ski", @"kind" : @"m", @"unit" : @"m", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDistanceDownhillSnowSports", @"metric" : @"distance_snow", @"kind" : @"m", @"unit" : @"m", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDistancePaddleSports", @"metric" : @"distance_paddle", @"kind" : @"m", @"unit" : @"m", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDistanceRowing", @"metric" : @"distance_row", @"kind" : @"m", @"unit" : @"m", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDistanceSkatingSports", @"metric" : @"distance_skate", @"kind" : @"m", @"unit" : @"m", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierNumberOfTimesFallen", @"metric" : @"falls", @"kind" : @"count", @"unit" : @"count", @"mode" : @"sum_year"},
    @{@"id" : @"HKQuantityTypeIdentifierNikeFuel", @"metric" : @"nike_fuel", @"kind" : @"count", @"unit" : @"count", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierPhysicalEffort", @"metric" : @"physical_effort", @"kind" : @"met", @"unit" : @"MET", @"mode" : @"latest_day"},
    @{@"id" : @"HKQuantityTypeIdentifierEstimatedWorkoutEffortScore", @"metric" : @"effort_score", @"kind" : @"effort", @"unit" : @"score", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierWorkoutEffortScore", @"metric" : @"workout_effort", @"kind" : @"effort", @"unit" : @"score", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierRunningPower", @"metric" : @"running_power_w", @"kind" : @"w", @"unit" : @"W", @"mode" : @"latest_day"},
    @{@"id" : @"HKQuantityTypeIdentifierRunningSpeed", @"metric" : @"running_speed", @"kind" : @"mps", @"unit" : @"m/s", @"mode" : @"latest_day"},
    @{@"id" : @"HKQuantityTypeIdentifierRunningGroundContactTime", @"metric" : @"ground_contact_ms", @"kind" : @"ms", @"unit" : @"ms", @"mode" : @"latest_day"},
    @{@"id" : @"HKQuantityTypeIdentifierRunningStrideLength", @"metric" : @"stride_m", @"kind" : @"m", @"unit" : @"m", @"mode" : @"latest_day"},
    @{@"id" : @"HKQuantityTypeIdentifierRunningVerticalOscillation", @"metric" : @"vertical_osc_cm", @"kind" : @"cm", @"unit" : @"cm", @"mode" : @"latest_day"},
    @{@"id" : @"HKQuantityTypeIdentifierCyclingPower", @"metric" : @"cycling_power_w", @"kind" : @"w", @"unit" : @"W", @"mode" : @"latest_day"},
    @{@"id" : @"HKQuantityTypeIdentifierCyclingSpeed", @"metric" : @"cycling_speed", @"kind" : @"mps", @"unit" : @"m/s", @"mode" : @"latest_day"},
    @{@"id" : @"HKQuantityTypeIdentifierCyclingCadence", @"metric" : @"cycling_cadence", @"kind" : @"bpm", @"unit" : @"bpm", @"mode" : @"latest_day"},
    @{@"id" : @"HKQuantityTypeIdentifierCyclingFunctionalThresholdPower", @"metric" : @"cycling_ftp_w", @"kind" : @"w", @"unit" : @"W", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierRowingSpeed", @"metric" : @"rowing_speed", @"kind" : @"mps", @"unit" : @"m/s", @"mode" : @"latest_day"},
    @{@"id" : @"HKQuantityTypeIdentifierPaddleSportsSpeed", @"metric" : @"paddle_speed", @"kind" : @"mps", @"unit" : @"m/s", @"mode" : @"latest_day"},
    @{@"id" : @"HKQuantityTypeIdentifierCrossCountrySkiingSpeed", @"metric" : @"ski_speed", @"kind" : @"mps", @"unit" : @"m/s", @"mode" : @"latest_day"},
    @{@"id" : @"HKQuantityTypeIdentifierUnderwaterDepth", @"metric" : @"underwater_m", @"kind" : @"m", @"unit" : @"m", @"mode" : @"latest_day"},
    @{@"id" : @"HKQuantityTypeIdentifierWaterTemperature", @"metric" : @"water_temp_c", @"kind" : @"c", @"unit" : @"°C", @"mode" : @"latest_day"},
    @{@"id" : @"HKQuantityTypeIdentifierHeartRateVariabilityRMSSD", @"metric" : @"hrv_rmssd_ms", @"kind" : @"ms", @"unit" : @"ms", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierPeripheralPerfusionIndex", @"metric" : @"perfusion_pct", @"kind" : @"pct", @"unit" : @"%", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierAppleWalkingSteadiness", @"metric" : @"walking_steadiness_pct", @"kind" : @"pct", @"unit" : @"%", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierUVExposure", @"metric" : @"uv_exposure", @"kind" : @"decimal", @"unit" : @"count", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierElectrodermalActivity", @"metric" : @"eda_us", @"kind" : @"us", @"unit" : @"µS", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierBasalBodyTemperature", @"metric" : @"basal_temp_c", @"kind" : @"c", @"unit" : @"°C", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierAppleSleepingBreathingDisturbances", @"metric" : @"breathing_disturbances", @"kind" : @"count", @"unit" : @"count", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierForcedExpiratoryVolume1", @"metric" : @"fev1_l", @"kind" : @"l", @"unit" : @"L", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierForcedVitalCapacity", @"metric" : @"fvc_l", @"kind" : @"l", @"unit" : @"L", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierPeakExpiratoryFlowRate", @"metric" : @"pefr", @"kind" : @"lpm", @"unit" : @"L/min", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierInhalerUsage", @"metric" : @"inhaler_count", @"kind" : @"count", @"unit" : @"count", @"mode" : @"sum_year"},
    @{@"id" : @"HKQuantityTypeIdentifierInsulinDelivery", @"metric" : @"insulin_iu", @"kind" : @"iu", @"unit" : @"IU", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierBloodAlcoholContent", @"metric" : @"bac_pct", @"kind" : @"pct", @"unit" : @"%", @"mode" : @"latest"},
    @{@"id" : @"HKQuantityTypeIdentifierNumberOfAlcoholicBeverages", @"metric" : @"alcohol_drinks", @"kind" : @"count", @"unit" : @"count", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietarySugar", @"metric" : @"dietary_sugar", @"kind" : @"g", @"unit" : @"g", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietaryFiber", @"metric" : @"dietary_fiber", @"kind" : @"g", @"unit" : @"g", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietaryFatSaturated", @"metric" : @"dietary_sat_fat", @"kind" : @"g", @"unit" : @"g", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietaryFatMonounsaturated", @"metric" : @"dietary_mono_fat", @"kind" : @"g", @"unit" : @"g", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietaryFatPolyunsaturated", @"metric" : @"dietary_poly_fat", @"kind" : @"g", @"unit" : @"g", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietaryCholesterol", @"metric" : @"dietary_cholesterol", @"kind" : @"mg", @"unit" : @"mg", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietarySodium", @"metric" : @"dietary_sodium", @"kind" : @"mg", @"unit" : @"mg", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietaryCalcium", @"metric" : @"dietary_calcium", @"kind" : @"mg", @"unit" : @"mg", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietaryChloride", @"metric" : @"dietary_chloride", @"kind" : @"mg", @"unit" : @"mg", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietaryCopper", @"metric" : @"dietary_copper", @"kind" : @"mg", @"unit" : @"mg", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietaryIron", @"metric" : @"dietary_iron", @"kind" : @"mg", @"unit" : @"mg", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietaryMagnesium", @"metric" : @"dietary_magnesium", @"kind" : @"mg", @"unit" : @"mg", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietaryManganese", @"metric" : @"dietary_manganese", @"kind" : @"mg", @"unit" : @"mg", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietaryNiacin", @"metric" : @"dietary_niacin", @"kind" : @"mg", @"unit" : @"mg", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietaryPantothenicAcid", @"metric" : @"dietary_pantothenic", @"kind" : @"mg", @"unit" : @"mg", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietaryPhosphorus", @"metric" : @"dietary_phosphorus", @"kind" : @"mg", @"unit" : @"mg", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietaryPotassium", @"metric" : @"dietary_potassium", @"kind" : @"mg", @"unit" : @"mg", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietaryRiboflavin", @"metric" : @"dietary_riboflavin", @"kind" : @"mg", @"unit" : @"mg", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietaryThiamin", @"metric" : @"dietary_thiamin", @"kind" : @"mg", @"unit" : @"mg", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietaryVitaminB6", @"metric" : @"dietary_vitamin_b6", @"kind" : @"mg", @"unit" : @"mg", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietaryVitaminC", @"metric" : @"dietary_vitamin_c", @"kind" : @"mg", @"unit" : @"mg", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietaryVitaminE", @"metric" : @"dietary_vitamin_e", @"kind" : @"mg", @"unit" : @"mg", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietaryZinc", @"metric" : @"dietary_zinc", @"kind" : @"mg", @"unit" : @"mg", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietaryBiotin", @"metric" : @"dietary_biotin", @"kind" : @"ug", @"unit" : @"µg", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietaryChromium", @"metric" : @"dietary_chromium", @"kind" : @"ug", @"unit" : @"µg", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietaryFolate", @"metric" : @"dietary_folate", @"kind" : @"ug", @"unit" : @"µg", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietaryIodine", @"metric" : @"dietary_iodine", @"kind" : @"ug", @"unit" : @"µg", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietaryMolybdenum", @"metric" : @"dietary_molybdenum", @"kind" : @"ug", @"unit" : @"µg", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietarySelenium", @"metric" : @"dietary_selenium", @"kind" : @"ug", @"unit" : @"µg", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietaryVitaminA", @"metric" : @"dietary_vitamin_a", @"kind" : @"ug", @"unit" : @"µg", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietaryVitaminB12", @"metric" : @"dietary_vitamin_b12", @"kind" : @"ug", @"unit" : @"µg", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietaryVitaminD", @"metric" : @"dietary_vitamin_d", @"kind" : @"ug", @"unit" : @"µg", @"mode" : @"sum"},
    @{@"id" : @"HKQuantityTypeIdentifierDietaryVitaminK", @"metric" : @"dietary_vitamin_k", @"kind" : @"ug", @"unit" : @"µg", @"mode" : @"sum"},
  ];
}

@implementation HealthReader

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

RCT_EXPORT_METHOD(readDay:(NSString *)startISO
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    @try {
      if (![HKHealthStore isHealthDataAvailable]) {
        reject(@"health", @"Apple Health is not available on this iPhone.", nil);
        return;
      }

      static HKHealthStore *store;
      static dispatch_once_t once;
      dispatch_once(&once, ^{
        store = [HKHealthStore new];
      });

      NSISO8601DateFormatter *parser = [NSISO8601DateFormatter new];
      NSDate *now = [NSDate date];
      NSDate *dayStart = [parser dateFromString:startISO] ?: [now dateByAddingTimeInterval:-24 * 60 * 60];
      NSDate *yearStart = [now dateByAddingTimeInterval:-365 * 24 * 60 * 60];
      NSDate *sleepStart = [now dateByAddingTimeInterval:-48 * 60 * 60];
      NSDate *workoutStart = [now dateByAddingTimeInterval:-90 * 24 * 60 * 60];
      NSDate *monthStart = [now dateByAddingTimeInterval:-30 * 24 * 60 * 60];
      NSPredicate *dayPredicate = [HKQuery predicateForSamplesWithStartDate:dayStart endDate:now options:HKQueryOptionStrictStartDate];
      NSPredicate *yearPredicate = [HKQuery predicateForSamplesWithStartDate:yearStart endDate:now options:HKQueryOptionStrictStartDate];
      NSPredicate *sleepPredicate = [HKQuery predicateForSamplesWithStartDate:sleepStart endDate:now options:HKQueryOptionNone];
      NSPredicate *workoutPredicate = [HKQuery predicateForSamplesWithStartDate:workoutStart endDate:now options:HKQueryOptionStrictStartDate];

      NSMutableSet *readTypes = [NSMutableSet set];
      NSMutableArray *defs = [NSMutableArray array];
      for (NSDictionary *def in Catalog()) {
        HKQuantityType *type = [HKQuantityType quantityTypeForIdentifier:def[@"id"]];
        if (type == nil) continue;
        NSMutableDictionary *row = [def mutableCopy];
        row[@"type"] = type;
        [defs addObject:row];
        [readTypes addObject:type];
      }
      HKCategoryType *sleepType = [HKCategoryType categoryTypeForIdentifier:@"HKCategoryTypeIdentifierSleepAnalysis"];
      HKCategoryType *mindfulType = [HKCategoryType categoryTypeForIdentifier:@"HKCategoryTypeIdentifierMindfulSession"];
      HKWorkoutType *workoutType = [HKWorkoutType workoutType];
      if (sleepType != nil) [readTypes addObject:sleepType];
      if (mindfulType != nil) [readTypes addObject:mindfulType];
      [readTypes addObject:workoutType];
      for (NSString *eventId in @[
        @"HKCategoryTypeIdentifierAppleStandHour",
        @"HKCategoryTypeIdentifierHighHeartRateEvent",
        @"HKCategoryTypeIdentifierLowHeartRateEvent",
        @"HKCategoryTypeIdentifierIrregularHeartRhythmEvent",
        @"HKCategoryTypeIdentifierLowCardioFitnessEvent",
        @"HKCategoryTypeIdentifierSleepApneaEvent",
      ]) {
        HKCategoryType *eventType = [HKCategoryType categoryTypeForIdentifier:eventId];
        if (eventType != nil) [readTypes addObject:eventType];
      }

      [store requestAuthorizationToShareTypes:nil readTypes:readTypes completion:^(BOOL success, NSError *error) {
        if (!success) {
          reject(@"health", error.localizedDescription ?: @"Apple Health permission was denied.", nil);
          return;
        }

        NSMutableArray *samples = [NSMutableArray array];
        NSLock *lock = [NSLock new];
        void (^add)(NSString *, double, NSString *, NSDate *) = ^(NSString *metric, double value, NSString *unit, NSDate *when) {
          if (!(value > 0) || metric.length == 0) return;
          NSDictionary *row = @{
            @"metric" : metric,
            @"value" : @(value),
            @"unit" : unit ?: @"",
            @"recordedAt" : ISO(when ?: now),
          };
          [lock lock];
          [samples addObject:row];
          [lock unlock];
        };

        dispatch_group_t group = dispatch_group_create();
        NSSortDescriptor *newest = [NSSortDescriptor sortDescriptorWithKey:HKSampleSortIdentifierEndDate ascending:NO];

        for (NSDictionary *def in defs) {
          HKQuantityType *type = def[@"type"];
          NSString *metric = def[@"metric"];
          NSString *kind = def[@"kind"];
          NSString *unit = def[@"unit"];
          NSString *mode = def[@"mode"];
          BOOL sum = [mode isEqualToString:@"sum"] || [mode isEqualToString:@"sum_year"];
          NSPredicate *window = [mode isEqualToString:@"sum"] ? dayPredicate : [mode isEqualToString:@"latest_day"] ? workoutPredicate : yearPredicate;
          dispatch_group_enter(group);
          if (sum) {
            HKStatisticsQuery *query = [[HKStatisticsQuery alloc] initWithQuantityType:type
                                                               quantitySamplePredicate:window
                                                                               options:HKStatisticsOptionCumulativeSum
                                                                     completionHandler:^(__unused HKStatisticsQuery *q, HKStatistics *stats, __unused NSError *err) {
              @try {
                if (stats.sumQuantity != nil) add(metric, Convert(stats.sumQuantity, kind), unit, now);
              } @catch (NSException *exception) {
              }
              dispatch_group_leave(group);
            }];
            [store executeQuery:query];
          } else {
            HKSampleQuery *query = [[HKSampleQuery alloc] initWithSampleType:type
                                                                    predicate:window
                                                                        limit:1
                                                              sortDescriptors:@[newest]
                                                               resultsHandler:^(__unused HKSampleQuery *q, NSArray *rows, __unused NSError *err) {
              @try {
                HKQuantitySample *sample = rows.firstObject;
                if (sample != nil) add(metric, Convert(sample.quantity, kind), unit, sample.endDate);
              } @catch (NSException *exception) {
              }
              dispatch_group_leave(group);
            }];
            [store executeQuery:query];
          }
        }

        HKQuantityType *heartType = [HKQuantityType quantityTypeForIdentifier:@"HKQuantityTypeIdentifierHeartRate"];
        if (heartType != nil) {
          dispatch_group_enter(group);
          HKStatisticsQuery *heartQuery = [[HKStatisticsQuery alloc] initWithQuantityType:heartType
                                                                  quantitySamplePredicate:dayPredicate
                                                                                  options:HKStatisticsOptionDiscreteAverage | HKStatisticsOptionDiscreteMin | HKStatisticsOptionDiscreteMax
                                                                        completionHandler:^(__unused HKStatisticsQuery *q, HKStatistics *stats, __unused NSError *err) {
            @try {
              if (stats.averageQuantity != nil) add(@"heart_rate_avg", Convert(stats.averageQuantity, @"bpm"), @"bpm", now);
              if (stats.minimumQuantity != nil) add(@"heart_rate_min", Convert(stats.minimumQuantity, @"bpm"), @"bpm", now);
              if (stats.maximumQuantity != nil) add(@"heart_rate_max", Convert(stats.maximumQuantity, @"bpm"), @"bpm", now);
            } @catch (NSException *exception) {
            }
            dispatch_group_leave(group);
          }];
          [store executeQuery:heartQuery];
        }

        if (sleepType != nil) {
          dispatch_group_enter(group);
          HKSampleQuery *sleepQuery = [[HKSampleQuery alloc] initWithSampleType:sleepType
                                                                       predicate:sleepPredicate
                                                                           limit:HKObjectQueryNoLimit
                                                                 sortDescriptors:nil
                                                                  resultsHandler:^(__unused HKSampleQuery *q, NSArray *rows, __unused NSError *err) {
            @try {
              NSDate *latestEnd = nil;
              for (HKCategorySample *sample in rows) {
                if (latestEnd == nil || [sample.endDate compare:latestEnd] == NSOrderedDescending) latestEnd = sample.endDate;
              }
              if (latestEnd != nil) {
                NSDate *nightStart = [latestEnd dateByAddingTimeInterval:-18 * 60 * 60];
                double asleep = 0, rem = 0, core = 0, deep = 0, awake = 0, inBed = 0;
                for (HKCategorySample *sample in rows) {
                  if ([sample.endDate compare:nightStart] != NSOrderedDescending) continue;
                  NSTimeInterval dur = [sample.endDate timeIntervalSinceDate:sample.startDate];
                  if (dur <= 0) continue;
                  switch (sample.value) {
                    case HKCategoryValueSleepAnalysisInBed: inBed += dur; break;
                    case HKCategoryValueSleepAnalysisAwake: awake += dur; break;
                    case HKCategoryValueSleepAnalysisAsleepCore: core += dur; asleep += dur; break;
                    case HKCategoryValueSleepAnalysisAsleepDeep: deep += dur; asleep += dur; break;
                    case HKCategoryValueSleepAnalysisAsleepREM: rem += dur; asleep += dur; break;
                    default: asleep += dur; break;
                  }
                }
                add(@"sleep_hours", Hours(asleep), @"hours", latestEnd);
                add(@"sleep_rem_hours", Hours(rem), @"hours", latestEnd);
                add(@"sleep_core_hours", Hours(core), @"hours", latestEnd);
                add(@"sleep_deep_hours", Hours(deep), @"hours", latestEnd);
                add(@"sleep_awake_hours", Hours(awake), @"hours", latestEnd);
                add(@"sleep_in_bed_hours", Hours(inBed), @"hours", latestEnd);
              }
            } @catch (NSException *exception) {
            }
            dispatch_group_leave(group);
          }];
          [store executeQuery:sleepQuery];
        }

        if (mindfulType != nil) {
          dispatch_group_enter(group);
          NSPredicate *week = [HKQuery predicateForSamplesWithStartDate:[now dateByAddingTimeInterval:-7 * 24 * 60 * 60] endDate:now options:HKQueryOptionStrictStartDate];
          HKSampleQuery *mindQuery = [[HKSampleQuery alloc] initWithSampleType:mindfulType
                                                                      predicate:week
                                                                          limit:HKObjectQueryNoLimit
                                                                sortDescriptors:nil
                                                                 resultsHandler:^(__unused HKSampleQuery *q, NSArray *rows, __unused NSError *err) {
            @try {
              NSTimeInterval dur = 0;
              for (HKCategorySample *sample in rows) dur += [sample.endDate timeIntervalSinceDate:sample.startDate];
              if (dur > 0) add(@"mindful_min", round(dur / 60.0), @"min", now);
            } @catch (NSException *exception) {
            }
            dispatch_group_leave(group);
          }];
          [store executeQuery:mindQuery];
        }

        NSPredicate *monthPredicate = [HKQuery predicateForSamplesWithStartDate:monthStart endDate:now options:HKQueryOptionStrictStartDate];
        NSArray *events = @[
          @[@"HKCategoryTypeIdentifierAppleStandHour", @"stand_hours", @0, dayPredicate],
          @[@"HKCategoryTypeIdentifierHighHeartRateEvent", @"high_hr_events", @(-1), monthPredicate],
          @[@"HKCategoryTypeIdentifierLowHeartRateEvent", @"low_hr_events", @(-1), monthPredicate],
          @[@"HKCategoryTypeIdentifierIrregularHeartRhythmEvent", @"irregular_hr_events", @(-1), monthPredicate],
          @[@"HKCategoryTypeIdentifierLowCardioFitnessEvent", @"low_fitness_events", @(-1), monthPredicate],
          @[@"HKCategoryTypeIdentifierSleepApneaEvent", @"sleep_apnea_events", @(-1), monthPredicate],
        ];
        for (NSArray *event in events) {
          HKCategoryType *eventType = [HKCategoryType categoryTypeForIdentifier:event[0]];
          if (eventType == nil) continue;
          dispatch_group_enter(group);
          HKSampleQuery *eventQuery = [[HKSampleQuery alloc] initWithSampleType:eventType
                                                                       predicate:event[3]
                                                                           limit:HKObjectQueryNoLimit
                                                                 sortDescriptors:nil
                                                                  resultsHandler:^(__unused HKSampleQuery *q, NSArray *rows, __unused NSError *err) {
            @try {
              NSInteger match = [event[2] integerValue];
              NSUInteger count = 0;
              for (HKCategorySample *sample in rows) {
                if (match < 0 || sample.value == match) count += 1;
              }
              if (count > 0) add(event[1], count, @"count", now);
            } @catch (NSException *exception) {
            }
            dispatch_group_leave(group);
          }];
          [store executeQuery:eventQuery];
        }

        dispatch_group_enter(group);
        HKSampleQuery *workoutQuery = [[HKSampleQuery alloc] initWithSampleType:workoutType
                                                                       predicate:workoutPredicate
                                                                           limit:30
                                                                 sortDescriptors:@[newest]
                                                                  resultsHandler:^(__unused HKSampleQuery *q, NSArray *rows, __unused NSError *err) {
          @try {
            NSUInteger index = 0;
            HKQuantityType *heartType = [HKQuantityType quantityTypeForIdentifier:@"HKQuantityTypeIdentifierHeartRate"];
            for (HKWorkout *workout in rows) {
              if (workout.duration <= 0) continue;
              index += 1;
              NSMutableString *label = [WorkoutName(workout.workoutActivityType) mutableCopy];
              if (workout.totalEnergyBurned != nil) {
                [label appendFormat:@" · %.0f kcal", [workout.totalEnergyBurned doubleValueForUnit:[HKUnit kilocalorieUnit]]];
              }
              if (workout.totalDistance != nil) {
                double meters = [workout.totalDistance doubleValueForUnit:[HKUnit meterUnit]];
                if (meters >= 1000) [label appendFormat:@" · %.2f km", meters / 1000.0];
                else if (meters > 0) [label appendFormat:@" · %.0f m", meters];
              }
              HKStatistics *heart = heartType == nil ? nil : [workout statisticsForType:heartType];
              if (heart.averageQuantity != nil) {
                [label appendFormat:@" · %.0f bpm", [heart.averageQuantity doubleValueForUnit:[HKUnit unitFromString:@"count/min"]]];
              }
              if (label.length > 160) [label deleteCharactersInRange:NSMakeRange(160, label.length - 160)];
              add([NSString stringWithFormat:@"workout_%lu", (unsigned long)index], round(workout.duration / 60.0), label, workout.endDate);
            }
          } @catch (NSException *exception) {
          }
          dispatch_group_leave(group);
        }];
        [store executeQuery:workoutQuery];

        dispatch_group_notify(group, dispatch_get_main_queue(), ^{
          if (samples.count == 0) {
            reject(@"health", @"Apple Health returned no readings. Allow every category on the permission sheet, then sync again.", nil);
            return;
          }
          resolve(@{@"samples" : samples});
        });
      }];
    } @catch (NSException *exception) {
      reject(@"health", exception.reason ?: exception.name, nil);
    }
  });
}

@end
