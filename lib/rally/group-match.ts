/** Which of the viewer's groups fit an activity, so "Post to groups" can preselect them. Pure: no DB, no Muse. */
const FAMILIES: RegExp[] = [
  /\b(run\w*|jog\w*|5k|10k|marathon\w*|trail\w*|track)\b/,
  /\b(walk\w*|hik\w*|steps?)\b/,
  /\b(bik\w*|cycl\w*|rid(e|es|ing)|spin)\b/,
  /\bswim\w*\b/,
  /\b(climb\w*|boulder\w*)\b/,
  /\b(lift\w*|gym|strength|weights?|squats?|planks?|push-?ups?|crossfit)\b/,
  /\b(yoga|pilates|stretch\w*)\b/,
];
const FITNESS = /\b(fitness|sports?|athlet\w*|workouts?|exercise)\b/;

export function groupScore(activityText: string, group: {name: string; description: string | null}): number {
  const a = activityText.toLowerCase();
  const g = `${group.name} ${group.description ?? ''}`.toLowerCase();
  const shared = FAMILIES.filter(f => f.test(a) && f.test(g)).length;
  const fitnessGroup = FAMILIES.some(f => f.test(g)) || FITNESS.test(g);
  return shared * 3 + (fitnessGroup ? 1 : 0);
}

/** Highest score first; ties keep the input order. score > 0 means "suggested". */
export function rankGroups<G extends {name: string; description: string | null}>(activityText: string, groups: G[]): (G & {score: number})[] {
  return groups.map(g => ({...g, score: groupScore(activityText, g)})).sort((x, y) => y.score - x.score);
}
