import {MODELS, museConfigured, museJson} from '@/lib/muse/client';
import {ACTIVITY_TAGS, GOAL_TAGS, STYLE_TAGS, type TagKind} from '@/lib/activities/types';
import type {StarterAnswers} from '@/lib/activities/onboarding';

/** §4 step 2 "Just tell my Muse": one message -> the same structured answers, confirmed as chips. */
export type StarterChatResult = {answers: StarterAnswers; tags: {tag: string; kind: TagKind}[]; usedMuse: boolean};

export const WEEKLY_OPTIONS = ['0', '1-2', '3-4', '5+'] as const;
export const SCHEDULE_OPTIONS = ['Mornings', 'Lunch', 'Evenings', 'Weekends'] as const;
export const WITH_WHOM_OPTIONS = [
  {id: 'friends', label: 'Pick friends'},
  {id: 'group', label: 'A group'},
  {id: 'match', label: 'Match me'},
  {id: 'solo', label: 'Solo'},
] as const;

const TAG_WORDS: [RegExp, string, TagKind][] = [
  [/\b(run|ran|running|jog|5k|10k|half|marathon)\b/i, 'Running', 'activity'],
  [/\b(walk|walking|dog)\b/i, 'Walking', 'activity'],
  [/\b(lift|lifting|weights|gym|strength)\b/i, 'Lifting', 'activity'],
  [/\byoga\b/i, 'Yoga', 'activity'],
  [/\b(bike|biking|cycling|cycle|ride)\b/i, 'Cycling', 'activity'],
  [/\b(hike|hiking|trail)\b/i, 'Hiking', 'activity'],
  [/\b(climb|climbing|boulder)\b/i, 'Climbing', 'activity'],
  [/\b(swim|swimming)\b/i, 'Swimming', 'activity'],
  [/\bpickleball\b/i, 'Pickleball', 'activity'],
  [/\bbasketball\b/i, 'Basketball', 'activity'],
  [/\bsoccer|football\b/i, 'Soccer', 'activity'],
  [/\bdance|dancing\b/i, 'Dance', 'activity'],
  [/\bhiit\b/i, 'HIIT', 'activity'],
  [/\bpilates\b/i, 'Pilates', 'activity'],
  [/\b(5k|10k|race|marathon|event|tournament)\b/i, 'Train for an event', 'goal'],
  [/\b(consistent|routine|habit|regular)\b/i, 'Be consistent', 'goal'],
  [/\b(faster|pace|speed)\b/i, 'Get faster', 'goal'],
  [/\b(stronger|muscle|strength)\b/i, 'Get stronger', 'goal'],
  [/\b(start|starting|beginner|used to|get back|again)\b/i, 'Get started', 'goal'],
  [/\b(sleep)\b/i, 'Sleep better', 'goal'],
  [/\b(friends?|roommates?|buddy|together|with my)\b/i, 'Do it with friends', 'goal'],
  [/\b(outside|outdoors|phone)\b/i, 'Lose the phone and go outside', 'goal'],
  [/\b(morning|mornings|early)\b/i, 'Mornings', 'style'],
  [/\b(evening|evenings|after work|night)\b/i, 'Evenings', 'style'],
  [/\b(weekend|weekends|saturday|sunday)\b/i, 'Weekends', 'style'],
  [/\b(competitive|compete|win|race)\b/i, 'Competitive', 'style'],
  [/\b(chill|relaxed|casual|easy)\b/i, 'Chill', 'style'],
  [/\b(alone|solo|myself)\b/i, 'Solo', 'style'],
  [/\b(roommates?|friends?|couple of|few of us|small group)\b/i, 'Small group', 'style'],
  [/\b(club|team|big group|everyone)\b/i, 'Big group', 'style'],
];

export function parseStarterChat(text: string): StarterChatResult {
  const t = text.toLowerCase();
  const tags: {tag: string; kind: TagKind}[] = [];
  for (const [re, tag, kind] of TAG_WORDS) if (re.test(t) && !tags.some(x => x.tag === tag)) tags.push({tag, kind});
  const answers: StarterAnswers = {};
  const days = t.match(/(\d)\s*(?:days?|x|times)\s*(?:a|per|\/)?\s*week/);
  if (days) {
    const n = parseInt(days[1], 10);
    answers.weeklyActiveDays = n === 0 ? '0' : n <= 2 ? '1-2' : n <= 4 ? '3-4' : '5+';
  } else if (/\b(every ?day|daily)\b/.test(t)) answers.weeklyActiveDays = '5+';
  else if (/\b(never|don'?t really|haven'?t|not active|out of shape|mostly walk|used to)\b/.test(t)) answers.weeklyActiveDays = '1-2';
  else if (/\b(sometimes|occasionally|once in a while)\b/.test(t)) answers.weeklyActiveDays = '1-2';
  const goal = tags.find(x => x.kind === 'goal');
  if (goal) answers.primaryGoal = goal.tag;
  const schedule = SCHEDULE_OPTIONS.filter(s => (s === 'Lunch' ? /\blunch\b/ : s === 'Mornings' ? /\bmorning|early\b/ : s === 'Evenings' ? /\bevening|after work|night\b/ : /\bweekend|saturday|sunday\b/).test(t));
  if (schedule.length) answers.schedule = [...schedule];
  if (/\b(roommates?|friends?|buddy|together|with my)\b/.test(t)) answers.withWhom = 'friends';
  else if (/\b(club|group|team)\b/.test(t)) answers.withWhom = 'group';
  else if (/\b(alone|solo|myself)\b/.test(t)) answers.withWhom = 'solo';
  else if (/\b(match|meet people|new people)\b/.test(t)) answers.withWhom = 'match';
  const easy = t.match(/\b(?:bad|sore|injur\w*|recovering|hurt|weak|low impact|asthma|pregnan\w*|surgery)\b[^.,;]*/);
  if (easy) answers.goEasyNote = easy[0].trim().slice(0, 140);
  return {answers, tags, usedMuse: false};
}

const schema = {
  type: 'object',
  properties: {
    weeklyActiveDays: {type: ['string', 'null'], enum: ['0', '1-2', '3-4', '5+', null]},
    primaryGoal: {type: ['string', 'null'], enum: [...GOAL_TAGS, null]},
    schedule: {type: 'array', items: {type: 'string', enum: [...SCHEDULE_OPTIONS]}},
    withWhom: {type: ['string', 'null'], enum: ['friends', 'group', 'match', 'solo', null]},
    goEasyNote: {type: ['string', 'null']},
    activityTags: {type: 'array', items: {type: 'string', enum: [...ACTIVITY_TAGS]}},
    goalTags: {type: 'array', items: {type: 'string', enum: [...GOAL_TAGS]}},
    styleTags: {type: 'array', items: {type: 'string', enum: [...STYLE_TAGS]}},
  },
  required: ['weeklyActiveDays', 'primaryGoal', 'schedule', 'withWhom', 'goEasyNote', 'activityTags', 'goalTags', 'styleTags'],
  additionalProperties: false,
};

type MuseOut = {weeklyActiveDays: string | null; primaryGoal: string | null; schedule: string[]; withWhom: string | null; goEasyNote: string | null; activityTags: string[]; goalTags: string[]; styleTags: string[]};

export async function starterChat(text: string): Promise<StarterChatResult> {
  const fallback = parseStarterChat(text);
  if (!museConfigured()) return fallback;
  try {
    const r = await museJson<MuseOut>({
      model: MODELS.spark,
      schemaName: 'starter_profile',
      schema,
      effort: 'minimal',
      input: `A person describes how they move and what they want. Fill the onboarding profile from what they SAID only; use null / empty when not stated.
weeklyActiveDays: how many days a week they currently move 30+ minutes. withWhom: friends | group | match | solo.
goEasyNote: anything they ask us to go easy on (injury, low impact), copied in their words, else null. Never add medical advice or judge their fitness.
Message: """${text.slice(0, 800)}"""`,
    });
    const tags = [
      ...r.activityTags.map(tag => ({tag, kind: 'activity' as const})),
      ...r.goalTags.map(tag => ({tag, kind: 'goal' as const})),
      ...r.styleTags.map(tag => ({tag, kind: 'style' as const})),
    ];
    return {
      answers: {weeklyActiveDays: r.weeklyActiveDays, primaryGoal: r.primaryGoal ?? r.goalTags[0] ?? null, schedule: r.schedule, withWhom: r.withWhom, goEasyNote: r.goEasyNote},
      tags: tags.length ? tags : fallback.tags,
      usedMuse: true,
    };
  } catch {
    return fallback;
  }
}
