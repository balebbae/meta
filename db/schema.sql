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
