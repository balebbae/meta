/** Copy of finetune/rally_ft/tasks/exercise_check.py PROMPT and SCHEMA (the Glimmer fine-tune's input/output); exercise-check.test.ts keeps them in sync. */
export const SHOWS = ['exercise_frames', 'workout_screen', 'race_bib', 'not_a_workout', 'unclear'] as const;
export const EXERCISES = ['push_up', 'squat', 'lunge', 'jumping_jack', 'sit_up', 'run', 'walk', 'ride', 'other', 'none'] as const;

export const EXERCISE_CHECK_SCHEMA = {
  type: 'object',
  properties: {
    shows: {type: 'string', enum: SHOWS},
    ex: {type: 'string', enum: EXERCISES},
    match: {type: 'boolean'},
    km: {type: ['number', 'null']},
    min: {type: ['number', 'null']},
    steps: {type: ['integer', 'null']},
    ok: {type: 'boolean'},
    why: {type: 'string'},
  },
  required: ['shows', 'ex', 'match', 'km', 'min', 'steps', 'ok', 'why'],
  additionalProperties: false,
};

export const EXERCISE_CHECK_PROMPT = `You check proof for a fitness challenge. Today's task: "{task}".
You get 1 photo or 3 stills from a short clip (in time order). Say what they show and whether they prove the task.
shows: exercise_frames (a person doing an exercise), workout_screen (treadmill, watch, phone, bike, rower or similar screen with workout numbers), race_bib, not_a_workout, or unclear (too blurry or dark to tell or read).
ex: the exercise or activity seen: push_up, squat, lunge, jumping_jack, sit_up, run, walk, ride, other, or none. For a screen use the activity it reports (a steps count is walk; swim, row, elliptical, strength and yoga are other). none if no workout is shown.
match: true only if the shown activity is the task's activity and, for a screen, its numbers reach the task's distance, time or steps. Do not count reps or judge form.
km, min, steps: distance, duration and step count printed on a workout screen (convert miles to km x1.609, mm:ss to decimal minutes), else null.
An idle, menu, all-zero/dash or lifetime/odometer total screen is not_a_workout.
ok: true only if shows is exercise_frames or workout_screen and match is true.
why: at most 15 words about what is visible. Never comment on a person's body, looks, age or health.
Return only JSON with keys shows, ex, match, km, min, steps, ok, why.`;

export const exerciseCheckPrompt = (task: string) => EXERCISE_CHECK_PROMPT.replace('{task}', () => task); // function form: a task containing "$&" stays literal
