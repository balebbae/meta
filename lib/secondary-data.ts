/** Client-safe static data + formatters for the secondary destination pages. */

export type Game = {
  id: string;
  name: string;
  publisher: string;
  players: string;
  cover: string;
  tag?: string;
  instant?: boolean;
};

export const GAMES: Game[] = [
  {id: 'words-with-friends', name: 'Words With Friends 2', publisher: 'Zynga', players: '2.1M monthly players', cover: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=640&h=360&q=80', tag: 'Word'},
  {id: 'solitaire', name: 'Solitaire Grand Harvest', publisher: 'Supertreat', players: '1.4M monthly players', cover: 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=640&h=360&q=80', tag: 'Card'},
  {id: 'uno', name: 'UNO!', publisher: 'Mattel163', players: '3.8M monthly players', cover: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=640&h=360&q=80', tag: 'Card'},
  {id: '8ball', name: '8 Ball Pool', publisher: 'Miniclip', players: '5.2M monthly players', cover: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=640&h=360&q=80', tag: 'Sports', instant: true},
  {id: 'basketball', name: 'Basketball FRVR', publisher: 'FRVR', players: '890K monthly players', cover: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=640&h=360&q=80', tag: 'Arcade', instant: true},
  {id: 'ludo', name: 'Ludo Club', publisher: 'Moonfrog', players: '2.7M monthly players', cover: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=640&h=360&q=80', tag: 'Board', instant: true},
  {id: 'bubble', name: 'Bubble Shooter Legend', publisher: 'Ilyon', players: '640K monthly players', cover: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=640&h=360&q=80', tag: 'Puzzle', instant: true},
  {id: 'chess', name: 'Chess Royale', publisher: 'Gameloft', players: '1.1M monthly players', cover: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=640&h=360&q=80', tag: 'Strategy', instant: true},
];

export const MARKETPLACE_CATEGORIES = [
  'Vehicles',
  'Property Rentals',
  'Apparel',
  'Classifieds',
  'Electronics',
  'Entertainment',
  'Family',
  'Free Stuff',
  'Garden & Outdoor',
  'Hobbies',
  'Home Goods',
  'Home Improvement Supplies',
  'Home Sales',
  'Musical Instruments',
  'Office Supplies',
  'Pet Supplies',
  'Sporting Goods',
  'Toys & Games',
  'Buy and sell groups',
];

export const MARKETPLACE_LOCATION = {city: 'Dallas, Texas', radius: '65 mi'};

export const CONDITION_LABELS: Record<string, string> = {
  new: 'New',
  used_like_new: 'Used - Like New',
  used_good: 'Used - Good',
  used_fair: 'Used - Fair',
};

export function formatPrice(cents: number) {
  if (cents === 0) return 'Free';
  return new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 0}).format(cents / 100);
}

export function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return String(n);
}

export function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

/** "2h", "3d", "Just now" style used in post headers. */
export function timeAgo(iso: string, now = Date.now()) {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w`;
  return new Date(iso).toLocaleDateString('en-US', {month: 'long', day: 'numeric'});
}

/** "2 hours ago", "3 days ago" (Marketplace / Groups wording). */
export function timeAgoLong(iso: string, now = Date.now()) {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} day${d === 1 ? '' : 's'} ago`;
  const w = Math.floor(d / 7);
  return `${w} week${w === 1 ? '' : 's'} ago`;
}

/** "SAT, NOV 15 AT 7 PM" */
export function formatEventDate(iso: string) {
  const d = new Date(iso);
  const day = d.toLocaleDateString('en-US', {weekday: 'short'}).toUpperCase();
  const month = d.toLocaleDateString('en-US', {month: 'short'}).toUpperCase();
  const h = d.getHours();
  const mins = d.getMinutes();
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const time = mins ? `${hour12}:${String(mins).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}` : `${hour12} ${h < 12 ? 'AM' : 'PM'}`;
  return `${day}, ${month} ${d.getDate()} AT ${time}`;
}

/** "Saturday, November 15, 2026 at 7:00 PM" */
export function formatEventDateLong(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'})} at ${d.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'})}`;
}
