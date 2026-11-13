/** Keyword tagger for event titles / group names; the fallback when the activity embedder (classify.ts) is absent. */
const FITNESS_WORDS = ['run', '5k', '10k', 'marathon', 'climb', 'yoga', 'lift', 'gym', 'bike', 'biking', 'cycling', 'ride', 'riding', 'hike', 'hiking', 'swim', 'workout', 'bootcamp', 'pickleball', 'boss fight', 'fitness', 'walk'];
const TAG_WORDS: Record<string, string[]> = {
  Running: ['run', '5k', '10k', 'marathon', 'trail'],
  Climbing: ['climb', 'boulder'],
  Yoga: ['yoga', 'pilates'],
  Lifting: ['lift', 'strength', 'gym', 'bench'],
  Cycling: ['bike', 'biking', 'cycling', 'ride', 'riding'],
  Hiking: ['hike', 'hiking', 'trail'],
  Swimming: ['swim'],
  Walking: ['walk', 'photowalk', 'steps'],
  Pickleball: ['pickleball'],
  Basketball: ['basketball', 'hoops'],
  Soccer: ['soccer', 'football'],
};

/** Whole words plus common endings: "ride" matches "riders" but not "pride", "run" matches "running" but not "brunch". */
const wordsRe = (words: string[]) => new RegExp(`\\b(?:${words.join('|')})(?:s|es|ed|er|ers|ing|ning|ming|ner|ners)?\\b`, 'i');
const FITNESS_RE = wordsRe(FITNESS_WORDS);
const TAG_RES = Object.entries(TAG_WORDS).map(([tag, words]) => [tag, wordsRe(words)] as const);

export function isFitnessText(text: string): boolean {
  return FITNESS_RE.test(text);
}

export function tagsForText(text: string): string[] {
  return TAG_RES.filter(([, re]) => re.test(text)).map(([tag]) => tag);
}
