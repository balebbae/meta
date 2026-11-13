/**
 * Which game a Reel becomes when it's sent to a group chat (pure keyword backup for Muse Ember's call).
 * dance / yoga -> Mirror Match, swim -> swim journey, everything else -> the Rally boss fight.
 */
export type ReelGame = 'dance' | 'yoga' | 'swim' | 'workout';

const RULES: [ReelGame, RegExp][] = [
  ['swim', /\bswim|freestyle stroke|breaststroke|backstroke|butterfly stroke|\bpool laps?\b|lap swim|open water/i],
  ['dance', /\bdanc|choreo|zumba|hip.?hop|salsa|tiktok trend|shuffle dance|ballet|k-?pop/i],
  ['yoga', /\byoga|asana|vinyasa|sun salutation|warrior (i|ii|1|2)|downward dog|tree pose|pilates|stretch|mobility flow/i],
];

export function reelGameByText(text: string): ReelGame {
  for (const [game, re] of RULES) if (re.test(text)) return game;
  return 'workout';
}
