/**
 * Which game a Reel becomes when it's sent to a group chat (pure keyword backup for Muse Ember's call).
 * dance / yoga -> Mirror Match, swim -> swim journey, run -> a paced Turf game, everything else -> the Rally boss fight.
 */
export type ReelGame = 'dance' | 'yoga' | 'swim' | 'run' | 'workout';

const RULES: [ReelGame, RegExp][] = [
  ['swim', /\bswim|freestyle stroke|breaststroke|backstroke|butterfly stroke|\bpool laps?\b|lap swim|open water/i],
  ['dance', /\bdanc|choreo|zumba|hip.?hop|salsa|tiktok trend|shuffle dance|ballet|k-?pop/i],
  ['yoga', /\byoga|asana|vinyasa|sun salutation|warrior (i|ii|1|2)|downward dog|tree pose|pilates|stretch|mobility flow/i],
  ['run', /\brun(s|ning|ner|ners)?\b|\bjog|\b(5|10|21|42)\s?k\b|marathon|tempo|fartlek|\bstrides\b|couch to|min(ute)?s?\s?(\/|per|a)\s?(km|mile)|\/km\b/i],
];

export function reelGameByText(text: string): ReelGame {
  for (const [game, re] of RULES) if (re.test(text)) return game;
  return 'workout';
}
