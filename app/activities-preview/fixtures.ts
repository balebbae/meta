import type {MuseActionsPayload} from '@/lib/activities/actions';
import type {DiscoverPayload} from '@/lib/activities/discover';
import type {Goal} from '@/lib/activities/goals';
import type {HomeProgress, Nearby} from '@/lib/activities/home';
import type {FitnessLevel} from '@/lib/activities/level';
import type {ListingBrief} from '@/lib/rally/queries';
import type {MyGame} from '@/components/activities/DiscoverPage';
import {gridDisk, latLngToCell} from 'h3-js';
import type {FriendRequestItem} from '@/components/layout/FriendRequests';
import type {Conversation, ConversationMember, Message} from '@/lib/messaging-types';
import type {Contact} from '@/lib/queries';
import type {QuestState} from '@/lib/rally/queries';
import type {TurfState} from '@/lib/turf/types';
import type {User} from '@/lib/types';

/** Fixture data for /activities-preview (dev only): the redesign without a database or a session. */
const img = (id: string, w = 1200, h = 675) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;
const at = (days: number, hour: number) => {
  const d = new Date();
  d.setUTCHours(hour, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
};

export const user: User = {id: 1, supertokensId: null, name: 'Sahas Sharma', email: 'preview@example.com', avatarUrl: 'https://i.pravatar.cc/160?img=12', coverUrl: null, bio: null, isOnline: true, createdAt: at(-400, 12)};

export const progress: HomeProgress = {stepsToday: 6420, stepGoal: 8000, activeDays: 3, activeTarget: 4, sleepHours: 7.4, movedToday: true, distanceKm: 7.2, workouts: 3, avgHr: 152};

export const level: FitnessLevel = {tier: 'building', weeks: 4, perWeek: 3.2, activeDaysPerWeek: 3.4, activities: [{kind: 'run', tier: 'building', perWeek: 2.1, kmPerWeek: 11.5, longestKm: 6.2, trend: 'up'}], stepsPerDay: 7400, sleepHours: 7.1, easyWeek: null};

export const goal: Goal = {
  id: 7,
  userId: 1,
  rawText: 'Run the Katy Trail 5k in December',
  title: 'Katy Trail 5k',
  eventKind: '5k',
  eventDate: at(23, 14),
  plan: {
    summary: 'Build to a comfortable 5k in four weeks.',
    weeks: 4,
    components: [{id: 'run', name: 'Running', detail: 'Three easy runs a week'}],
    phases: [
      {id: 'base', name: 'Base', startWeek: 1, endWeek: 2, focus: 'easy miles'},
      {id: 'sharpen', name: 'Sharpen', startWeek: 3, endWeek: 4, focus: 'strides and a tune-up run'},
    ],
    milestones: [
      {id: 'm1', title: 'First 3 km without stopping', week: 1, phaseId: 'base', componentId: 'run', done: true, doneAt: at(-9, 12)},
      {id: 'm2', title: 'Three runs in one week', week: 2, phaseId: 'base', componentId: 'run', done: true, doneAt: at(-2, 12)},
      {id: 'm3', title: '4 km at an easy pace', week: 3, phaseId: 'sharpen', componentId: 'run', done: false, doneAt: null},
      {id: 'm4', title: 'Race day', week: 4, phaseId: 'sharpen', componentId: 'run', done: false, doneAt: null},
    ],
  },
  checkin: null,
  conversationId: null,
  questId: null,
  status: 'active',
  museUsed: true,
  createdAt: at(-14, 12),
  week: 3,
  progress: {done: 2, total: 4, pct: 50},
};

export const museActions: MuseActionsPayload = {
  stale: false,
  needsLocation: false,
  museOffline: true,
  actions: [
    {id: 1, kind: 'event', title: 'Book the Katy Trail Saturday 5k', detail: 'Sat 8:00 · Katy Trail', why: "You're free Saturday morning and it's 3 km from you. It's also week 3 of your plan.", price: 'Free', url: '/events?id=12', imageUrl: img('1452626038306-9aae5e071dd3'), startsAt: at(2, 14), status: 'suggested', confirmation: null},
    {id: 2, kind: 'buy', title: 'Nike Pegasus 41, size 10', detail: 'Marketplace · Dallas', why: 'Your trainers are at 600 km. These retail for $140, so this is a deal.', price: '$65', url: '/marketplace/item/3', imageUrl: null, startsAt: null, status: 'suggested', confirmation: null},
    {id: 3, kind: 'event', title: 'Boss fight IRL: Sunday 9am run', detail: 'Sun 9:00 · White Rock Lake', why: 'Final run of the week for your Rally squad. Moves there count double.', price: 'Free', url: '/events?id=13', imageUrl: null, startsAt: at(3, 15), status: 'done', confirmation: 'RL-48213'},
  ],
};

export const games: MyGame[] = [
  {key: 'q1', href: '/activities/games/1', title: 'Goblin of Greenville', subtitle: '340 / 1200 HP', boss: {kind: 'goblin', name: 'Goblin of Greenville'}},
  {key: 't2', href: '/games/2', title: 'Turf with friends', subtitle: 'Turf · live', boss: null},
];

export const listings: ListingBrief[] = [
  {id: 3, title: 'Nike Pegasus 41, size 10', priceCents: 6500, imageUrl: img('1542291026-7eec264c27ff', 600, 600), location: 'Dallas, TX'},
  {id: 4, title: 'Garmin Forerunner 255', priceCents: 18000, imageUrl: img('1523275335684-37898b6baf30', 600, 600), location: 'Plano, TX'},
  {id: 5, title: 'Foam roller + bands set', priceCents: 2500, imageUrl: img('1517836357463-d25dfeac3438', 600, 600), location: 'Richardson, TX'},
  {id: 6, title: 'Trek FX 2 hybrid bike', priceCents: 42000, imageUrl: img('1485965120184-e220f721d03e', 600, 600), location: 'Irving, TX'},
  {id: 7, title: 'Hydro Flask 32 oz', priceCents: 2000, imageUrl: img('1602143407151-7111542de6e8', 600, 600), location: 'Dallas, TX'},
];

export const nearby: Nearby = {
  home: {lat: 32.7767, lng: -96.797},
  events: [
    {id: 12, title: 'Katy Trail Saturday 5k Social Run', location: 'Katy Trail, Dallas, TX', startsAt: at(2, 14), coverUrl: img('1452626038306-9aae5e071dd3'), pin: {lat: 32.8054, lng: -96.8046}, distanceKm: 3.3},
    {id: 13, title: 'Boss fight IRL: Sunday 9am run', location: 'White Rock Lake, Dallas, TX', startsAt: at(3, 15), coverUrl: img('1476480862126-209bfaa8edc8'), pin: {lat: 32.8296, lng: -96.7215}, distanceKm: 9.2},
    {id: 14, title: 'Sunrise yoga on the lawn', location: 'Klyde Warren Park, Dallas, TX', startsAt: at(5, 12), coverUrl: img('1544367567-0f2fcb009e0b'), pin: {lat: 32.7894, lng: -96.8016}, distanceKm: 1.5},
    {id: 15, title: 'Deep Ellum community ride', location: 'Deep Ellum, Dallas, TX', startsAt: at(9, 22), coverUrl: img('1471506480208-91b3a4cc78be'), pin: {lat: 32.7843, lng: -96.7836}, distanceKm: 1.6},
  ],
};

export const data: DiscoverPayload = {
  tags: ['Running', 'Yoga'],
  museOffline: true,
  generatedAt: at(0, 12),
  sections: [
    {
      id: 'first_move',
      title: 'Up next',
      cards: [{id: 'first-event-12', kind: 'event', title: 'Train for Katy Trail Saturday 5k', subtitle: '2 friends are going', why: 'Maya and Jordan RSVP’d and it matches your Running tag.', href: '/events?id=12', cta: 'Train with them', imageUrl: img('1452626038306-9aae5e071dd3'), tag: 'Running', score: 80, meta: {friends: 2}}],
    },
    {
      id: 'groups',
      title: 'Communities',
      cards: [
        {id: 'group-1', kind: 'group', title: 'Dallas Run Club', subtitle: '2,431 members · 3 friends · weekly Rally', why: 'Matches your Running tag and 3 of your friends are in it.', href: '/groups/1', cta: 'Join', imageUrl: img('1552674605-db6ffd4facb5'), tag: 'Running', score: 20, meta: {joined: false, rally: true}},
        {id: 'group-2', kind: 'group', title: 'Yoga at Klyde Warren', subtitle: '812 members · 1 friend', why: 'Matches your Yoga tag and 1 of your friends is in it.', href: '/groups/2', cta: 'Join', imageUrl: img('1544367567-0f2fcb009e0b'), tag: 'Yoga', score: 10, meta: {joined: false, rally: false}},
        {id: 'group-3', kind: 'group', title: 'White Rock Lake Cyclists', subtitle: '1,140 members · weekly Rally', why: 'This group runs a weekly Rally.', href: '/groups/3', cta: 'Open', imageUrl: img('1471506480208-91b3a4cc78be'), score: 6, meta: {joined: true, rally: true}},
        {id: 'group-4', kind: 'group', title: 'UTD Lifting Crew', subtitle: '390 members · 2 friends', why: '2 of your friends are in it.', href: '/groups/4', cta: 'Join', imageUrl: img('1534438327276-14e5300c3a48'), score: 5, meta: {joined: false, rally: false}},
      ],
    },
    {
      id: 'learn',
      title: 'Workout reels',
      cards: [
        {id: 'reel-1', kind: 'reel', title: 'Easy-pace running form in 60 seconds', why: 'For your Running tag.', href: '/reels', imageUrl: img('1461896836934-ffe607ba8211', 800, 800), score: 9, meta: {label: 'Runners'}},
        {id: 'reel-2', kind: 'reel', title: 'Five-minute hip opener', why: 'For your Yoga tag.', href: '/reels', imageUrl: img('1575052814086-f385e2e2ad1b', 600, 800), score: 8, meta: {label: 'Yoga'}},
        {id: 'reel-3', kind: 'reel', title: 'What a 5k taper week looks like', why: 'Week 3 of your plan.', href: '/reels', imageUrl: img('1486218119243-13883505764c', 600, 800), score: 7, meta: {label: 'Runners'}},
        {id: 'reel-4', kind: 'reel', title: 'Sleep and recovery, explained', why: 'You slept 7.4 h.', href: '/reels', imageUrl: img('1541781774459-bb2af2f05b55', 600, 800), score: 6, meta: {label: 'Recovery'}},
        {id: 'reel-5', kind: 'reel', title: 'Katy Trail at sunrise', why: 'Near you.', href: '/reels', imageUrl: img('1502904550040-7534597429ae', 600, 800), score: 5, meta: {label: 'Dallas'}},
        {id: 'reel-6', kind: 'reel', title: 'Strides: the 10-minute speed habit', why: 'For your Running tag.', href: '/reels', imageUrl: img('1483721310020-03333e577078', 800, 500), score: 4, meta: {label: 'Runners'}},
      ],
    },
    {
      id: 'friends',
      title: 'Friends on the same path',
      cards: [
        {id: 'friend-2', kind: 'friend', title: 'Maya Chen', subtitle: 'Also training for a 5k', why: 'Maya logged 3 runs this week, like you.', href: '/profile/2', cta: 'Say hi', avatarUrl: 'https://i.pravatar.cc/160?img=47', score: 9},
        {id: 'friend-3', kind: 'friend', title: 'Jordan Lee', subtitle: 'Yoga, 4 days a week', why: 'Jordan is in Yoga at Klyde Warren too.', href: '/profile/3', cta: 'Say hi', avatarUrl: 'https://i.pravatar.cc/160?img=33', score: 8},
      ],
    },
    {
      id: 'mentors',
      title: 'Mentors',
      cards: [{id: 'mentor-1', kind: 'mentor', title: 'Someone who ran their first 5k in May', subtitle: 'Now at 10k · regular', why: 'They trained like you do now, 16 weeks ago.', href: '/activities/mentor/1', cta: 'Ask through Muses', score: 7}],
    },
    {
      id: 'start',
      title: 'Start a game',
      cards: [
        {id: 'start-turf', kind: 'start', title: 'Turf', subtitle: 'Own the streets you run this week', why: 'Friends only see the blocks you claim, never your route.', cta: 'Start Turf', imageUrl: img('1524661135-423995f22d0b'), score: 3, meta: {template: 'turf'}},
        {id: 'start-sentence', kind: 'start', title: 'Quest from a sentence', subtitle: 'Describe the game, Muse builds the boss', why: 'Works with any group chat.', cta: 'Build it', imageUrl: img('1517649763962-0c623066013b'), score: 2, meta: {template: 'sentence'}},
      ],
    },
  ],
};

// ---- Activities mode chrome + Messages challenge cards (round 2) ----------------------------------------------

const person = (id: number, name: string, pic: number) => ({id, name, avatarUrl: `https://i.pravatar.cc/160?img=${pic}`});
const maya = person(2, 'Maya Chen', 47);
const jordan = person(3, 'Jordan Lee', 33);
const priya = person(4, 'Priya Patel', 45);
const me = {id: user.id, name: user.name, avatarUrl: user.avatarUrl};
const member = (p: {id: number; name: string; avatarUrl: string}, online = false): ConversationMember => ({...p, isOnline: online, role: p.id === user.id ? 'admin' : 'member', lastReadMessageId: null});

/** Facebook-side right rail (hidden in the mode, back on /activities-preview/feed). */
export const contacts: Contact[] = [maya, jordan, priya].map((p, i) => ({...p, isOnline: i < 2}));
export const requests: FriendRequestItem[] = [{...person(9, 'Sam Rivera', 15), mutualCount: 4}];

/** GET /api/leaderboard: other people's XP is banded, the viewer's is exact. */
export const leaderboard = {
  period: 'week',
  rows: [
    {userId: 2, ...maya, xp: '150–199'},
    {userId: 1, ...me, xp: 124},
    {userId: 3, ...jordan, xp: '50–99'},
    {userId: 4, ...priya, xp: '50–99'},
  ],
};

const msg = (id: number, sender: typeof me, body: string, kind: Message['kind'], payload: Record<string, unknown> | null, minsAgo: number): Message => ({id, conversationId: 21, sender, body, imageUrl: null, kind, payload, createdAt: new Date(Date.now() - minsAgo * 60_000).toISOString()});

/** One of each challenge card, as they arrive in a squad chat (components/messages/cards).
 *  Player colours below are data: Turf stores a hex per player and MapLibre paints cannot read CSS variables. */
export const thread: Message[] = [
  msg(101, maya, 'New quest: Goblin of Greenville', 'quest_card', {questId: 1, title: 'Goblin of Greenville', template: 'boss', bossName: 'Goblin of Greenville', bossHp: 1200}, 190),
  msg(102, jordan, 'Jordan lands a 3 km run on the goblin.', 'rally_game', {questId: 1, event: 'move', userId: 3, text: 'Jordan lands a 3 km run on the goblin. It staggers.', damage: 90, hpLeft: 430}, 64),
  msg(103, maya, 'Critical hit!', 'rally_game', {questId: 1, event: 'critical', userId: 2, text: 'Maya ran before breakfast and it shows. The goblin drops its club.', damage: 180, hpLeft: 340}, 41),
  msg(104, priya, 'Turf: White Rock loop', 'rally_invite', {gameId: 2, gameType: 'turf', title: 'Turf with friends', arenaLabel: 'White Rock loop', endsAt: at(3, 23)}, 30),
  msg(105, priya, 'Final standings', 'turf_recap', {gameId: 3, title: 'Katy Trail week', final: true, museUsed: false, text: 'Maya closed two loops on Sunday and took the north end. Good week, everyone.', standings: [
    {userId: 2, name: 'Maya Chen', color: '#ff7a1a', cells: 64},
    {userId: 1, name: 'Sahas Sharma', color: '#0866ff', cells: 41},
    {userId: 3, name: 'Jordan Lee', color: '#31a24c', cells: 18},
  ]}, 12),
];

export const squad: Conversation = {
  id: 21,
  isGroup: true,
  title: 'Dallas Run Club',
  imageUrl: '',
  isOnline: true,
  members: [member(me, true), member(maya, true), member(jordan), member(priya)],
  lastMessage: thread[2],
  unreadCount: 3,
  createdBy: 1,
  createdAt: at(-30, 12),
  updatedAt: at(0, 12),
};

/** GET /api/conversations: the right rail keeps the group chats ("Your squads"). */
export const conversations = {
  unreadCount: 1,
  conversations: [
    squad,
    {...squad, id: 22, title: 'Sunday long run', members: [member(me, true), member(jordan), member(priya)], lastMessage: msg(201, priya, 'Turf starts Saturday. Who is in?', 'text', null, 300), unreadCount: 0},
    {...squad, id: 23, title: 'Yoga at Klyde Warren', members: [member(me, true), member(jordan)], lastMessage: null, unreadCount: 0},
    {...squad, id: 24, isGroup: false, title: 'Maya Chen', imageUrl: maya.avatarUrl, members: [member(me, true), member(maya, true)], lastMessage: null, unreadCount: 0},
  ] satisfies Conversation[],
};

const level1 = {day: 1, name: 'Day 1: Easy miles', exercises: [{name: 'Easy run', seconds: 1200}, {name: 'Squats', reps: 20}]};
const squadMember = (p: typeof me, damage: number, moves: number) => ({...p, damage, moves, level: 3, team: null, gear: moves > 2 ? ['cape'] : [], target: p.id === user.id ? 20 : null, handicapNote: '', hero: null});

/** GET /api/quests/1/state: what the quest card polls. */
export const questState: QuestState = {
  quest: {
    id: 1,
    title: 'Goblin of Greenville',
    template: 'boss',
    conversationId: 21,
    reelId: null,
    createdBy: 2,
    status: 'active',
    startsAt: at(-2, 12),
    endsAt: at(5, 12),
    bossHp: 1200,
    bossHpLeft: 340,
    bossKind: 'goblin',
    museUsed: false,
    buffed: false,
    createdAt: at(-2, 12),
    spec: {
      template: 'boss',
      title: 'Goblin of Greenville',
      story: 'A goblin has moved into Greenville Avenue and will not leave until the squad out-moves it. Every run, ride and stretch counts.',
      source: {kind: 'sentence', text: 'A boss fight for our run club this week'},
      startsAt: at(-2, 12),
      endsAt: at(5, 12),
      levels: [level1, {...level1, day: 2, name: 'Day 2: Hills'}, {...level1, day: 3, name: 'Day 3: Strides'}],
      boss: {name: 'Goblin of Greenville', hp: 1200},
      handicaps: [],
      dares: [],
      rewards: [],
    },
  },
  viewerId: 1,
  members: [squadMember(maya, 380, 4), squadMember(me, 250, 3), squadMember(jordan, 180, 2), squadMember(priya, 50, 1)],
  mvp: 2,
  moves: [],
  dares: [],
  rewards: [],
  gear: [],
  listings: [],
  relay: {legs: {A: 0, B: 0}, totalLegs: 6, winner: null},
  streak: {},
  levelDay: 3,
  museUsed: false,
  fairness: null,
  myHandicap: null,
  myReadiness: {fit: 'good', note: 'You have run three times in the last two weeks.'},
};

const arena = {center: {lat: 32.8296, lng: -96.7215}, radiusKm: 1.5};
const patch = (dLat: number, dLng: number, k: number, owner: number): [string, number][] => gridDisk(latLngToCell(arena.center.lat + dLat, arena.center.lng + dLng, 10), k).map(c => [c, owner]);

/** GET /api/games/2/state: what the Turf invite card polls. */
export const turfState: TurfState = {
  id: 2,
  type: 'turf',
  title: 'White Rock loop',
  status: 'live',
  conversationId: 21,
  hostId: 4,
  arena,
  lengthDays: 7,
  pace: null,
  reelId: null,
  startsAt: at(-1, 12),
  endsAt: at(3, 23),
  now: at(0, 12),
  players: [
    {...priya, color: '#ff7a1a', status: 'accepted', isHost: true},
    {...maya, color: '#31a24c', status: 'accepted', isHost: false},
    {...me, color: '#0866ff', status: 'invited', isHost: false},
    {...jordan, color: '#f3425f', status: 'invited', isHost: false},
  ],
  cells: [...patch(0.004, -0.004, 3, 4), ...patch(-0.005, 0.005, 2, 2)],
  scores: [
    {playerId: 4, cells: 37, rank: 1},
    {playerId: 2, cells: 19, rank: 2},
  ],
  winnerId: null,
  me: {id: 1, status: 'invited', isHost: false, onboarded: true, canAccept: true, canStart: false, canResend: false, outing: null},
};
