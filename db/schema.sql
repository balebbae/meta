create table if not exists users (
  id serial primary key,
  supertokens_id text unique,
  name text not null,
  email text not null unique,
  avatar_url text not null,
  cover_url text,
  bio text,
  is_online boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists posts (
  id serial primary key,
  author_id integer not null references users(id) on delete cascade,
  content text not null,
  image_url text,
  audience text not null default 'public' check (audience in ('public', 'friends', 'only_me')),
  share_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists posts_created_idx on posts (created_at desc);

create table if not exists comments (
  id serial primary key,
  post_id integer not null references posts(id) on delete cascade,
  author_id integer not null references users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists comments_post_idx on comments (post_id, created_at);

create table if not exists reactions (
  id serial primary key,
  post_id integer not null references posts(id) on delete cascade,
  user_id integer not null references users(id) on delete cascade,
  type text not null check (type in ('like', 'love', 'care', 'haha', 'wow', 'sad', 'angry')),
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table if not exists friendships (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  friend_id integer not null references users(id) on delete cascade,
  status text not null default 'accepted' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  unique (user_id, friend_id),
  check (user_id <> friend_id)
);

create table if not exists stories (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  image_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  actor_id integer references users(id) on delete set null,
  type text not null,
  post_id integer references posts(id) on delete cascade,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications (user_id, created_at desc);

-- Secondary destination pages (Groups, Marketplace, Events, Video, Saved)
create table if not exists groups (
  id serial primary key,
  name text not null unique,
  description text,
  cover_url text not null,
  icon_url text not null,
  privacy text not null default 'public' check (privacy in ('public', 'private')),
  created_by integer references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists group_members (
  id serial primary key,
  group_id integer not null references groups(id) on delete cascade,
  user_id integer not null references users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create table if not exists group_posts (
  id serial primary key,
  group_id integer not null references groups(id) on delete cascade,
  author_id integer not null references users(id) on delete cascade,
  content text not null,
  image_url text,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists group_posts_group_idx on group_posts (group_id, created_at desc);

create table if not exists marketplace_listings (
  id serial primary key,
  seller_id integer not null references users(id) on delete cascade,
  title text not null,
  description text,
  price_cents integer not null,
  category text not null,
  condition text not null default 'used_good',
  location text not null default 'Dallas, TX',
  image_url text not null,
  is_saved_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists marketplace_created_idx on marketplace_listings (created_at desc);

create table if not exists marketplace_saved (
  id serial primary key,
  listing_id integer not null references marketplace_listings(id) on delete cascade,
  user_id integer not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (listing_id, user_id)
);

create table if not exists events (
  id serial primary key,
  host_id integer not null references users(id) on delete cascade,
  title text not null,
  description text,
  location text not null,
  cover_url text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  interested_count integer not null default 0,
  is_online boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists events_starts_idx on events (starts_at);

create table if not exists event_rsvps (
  id serial primary key,
  event_id integer not null references events(id) on delete cascade,
  user_id integer not null references users(id) on delete cascade,
  status text not null default 'interested' check (status in ('interested', 'going')),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table if not exists videos (
  id serial primary key,
  channel_id integer not null references users(id) on delete cascade,
  title text not null,
  thumbnail_url text not null,
  duration_seconds integer not null,
  view_count integer not null default 0,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  share_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists saved_posts (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  post_id integer not null references posts(id) on delete cascade,
  collection text not null default 'For later',
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);

-- profile agent: About tab details (work, education, places, contact)
create table if not exists user_details (
  user_id integer primary key references users(id) on delete cascade,
  work text,
  work_title text,
  education text,
  high_school text,
  current_city text,
  hometown text,
  relationship text,
  phone text,
  website text,
  birthday text,
  gender text,
  languages text
);

-- messaging agent: direct messages + group chats
create table if not exists conversations (
  id serial primary key,
  is_group boolean not null default false,
  name text,
  image_url text,
  created_by integer references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists conversations_updated_idx on conversations (updated_at desc);

create table if not exists conversation_members (
  conversation_id integer not null references conversations(id) on delete cascade,
  user_id integer not null references users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  last_read_message_id integer,
  primary key (conversation_id, user_id)
);
create index if not exists conversation_members_user_idx on conversation_members (user_id);

create table if not exists messages (
  id serial primary key,
  conversation_id integer not null references conversations(id) on delete cascade,
  sender_id integer references users(id) on delete set null,
  body text not null default '',
  image_url text,
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_idx on messages (conversation_id, id);

create table if not exists message_reads (
  message_id integer not null references messages(id) on delete cascade,
  user_id integer not null references users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

alter table notifications add column if not exists conversation_id integer references conversations(id) on delete cascade;

-- push agent: Web Push subscriptions (one row per browser/device)
create table if not exists push_subscriptions (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on push_subscriptions (user_id);

-- sign-up: pronoun picked when Gender = Custom on /auth/reg
alter table user_details add column if not exists pronouns text;

-- Closeness / Muse gamification
create table if not exists xp_events (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  friend_id integer references users(id) on delete set null,
  source_type text not null,
  source_id integer,
  xp integer not null check (xp > 0),
  reason text not null,
  created_at timestamptz not null default now()
);
create index if not exists xp_events_user_week_idx on xp_events (user_id, created_at desc);

create table if not exists quests (
  id serial primary key,
  title text not null,
  description text not null,
  xp_reward integer not null,
  goal_type text not null,
  goal_count integer not null default 1,
  week_start date not null,
  muse_meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists quests_week_idx on quests (week_start desc);

create table if not exists quest_progress (
  id serial primary key,
  quest_id integer not null references quests(id) on delete cascade,
  user_id integer not null references users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'completed', 'expired')),
  progress jsonb,
  updated_at timestamptz not null default now(),
  unique (quest_id, user_id)
);

create table if not exists badges (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  slug text not null,
  title text not null,
  image_url text not null,
  earned_at timestamptz not null default now(),
  unique (user_id, slug)
);

create table if not exists voice_notes (
  id serial primary key,
  author_id integer not null references users(id) on delete cascade,
  post_id integer references posts(id) on delete cascade,
  audio_url text,
  transcript text not null,
  created_at timestamptz not null default now()
);
