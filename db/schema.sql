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
