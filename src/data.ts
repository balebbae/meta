export type User = {id: string; name: string; avatar: string; online?: boolean};

export type Post = {
  id: string;
  author: User;
  time: string;
  audience: 'Public' | 'Friends';
  text: string;
  image?: string;
  likes: number;
  comments: number;
  shares: number;
};

export type Story = {id: string; user: User; image: string};

const avatar = (seed: number) => `https://i.pravatar.cc/150?img=${seed}`;
const photo = (seed: string, w = 800, h = 500) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

export const me: User = {id: 'me', name: 'Caleb Bae', avatar: avatar(12)};

export const people: User[] = [
  {id: 'u1', name: 'Priya Sharma', avatar: avatar(47), online: true},
  {id: 'u2', name: 'Marcus Lee', avatar: avatar(33), online: true},
  {id: 'u3', name: 'Sofia Alvarez', avatar: avatar(45)},
  {id: 'u4', name: 'Daniel Kim', avatar: avatar(14), online: true},
  {id: 'u5', name: 'Amara Okafor', avatar: avatar(26)},
  {id: 'u6', name: 'Noah Patel', avatar: avatar(59), online: true},
  {id: 'u7', name: 'Hannah Nguyen', avatar: avatar(32)},
  {id: 'u8', name: 'Liam Carter', avatar: avatar(68)},
  {id: 'u9', name: 'Zoe Martin', avatar: avatar(23), online: true},
  {id: 'u10', name: 'Ethan Brooks', avatar: avatar(52)},
];

export const stories: Story[] = people.slice(0, 7).map((user, i) => ({
  id: `s${i}`,
  user,
  image: photo(`story-${i}`, 300, 500),
}));

export const posts: Post[] = [
  {
    id: 'p1',
    author: people[0],
    time: '2h',
    audience: 'Public',
    text: 'HackUTD weekend recap: 1,200 hackers, 48 hours, zero sleep. Thank you to every volunteer who made it run so smoothly.',
    image: photo('hackathon', 800, 520),
    likes: 384,
    comments: 42,
    shares: 17,
  },
  {
    id: 'p2',
    author: people[1],
    time: '5h',
    audience: 'Friends',
    text: 'Finally shipped the thing I have been teasing for months. Small team, big dreams. Link in comments.',
    likes: 96,
    comments: 23,
    shares: 4,
  },
  {
    id: 'p3',
    author: people[3],
    time: '8h',
    audience: 'Public',
    text: 'Dallas sunsets do not miss.',
    image: photo('sunset-dallas', 800, 600),
    likes: 1203,
    comments: 88,
    shares: 61,
  },
  {
    id: 'p4',
    author: people[4],
    time: '1d',
    audience: 'Public',
    text: 'Looking for a roommate near Richardson starting January. DM me if you know anyone!',
    likes: 12,
    comments: 9,
    shares: 2,
  },
  {
    id: 'p5',
    author: people[6],
    time: '1d',
    audience: 'Friends',
    text: 'Weekend climbing trip photos are up. Who is in for next month?',
    image: photo('climbing', 800, 540),
    likes: 220,
    comments: 31,
    shares: 6,
  },
];

export const sponsored = [
  {id: 'ad1', title: 'Ray-Ban Meta Gen 2', domain: 'meta.com', image: photo('glasses', 200, 200)},
  {id: 'ad2', title: 'Learn StyleX in a weekend', domain: 'stylexjs.com', image: photo('code', 200, 200)},
];

export const groups = [
  {id: 'g1', name: 'HackUTD Organizers', image: photo('g1', 80, 80)},
  {id: 'g2', name: 'UTD Computer Science', image: photo('g2', 80, 80)},
  {id: 'g3', name: 'Dallas Startups', image: photo('g3', 80, 80)},
];
