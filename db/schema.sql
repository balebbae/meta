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

-- ============================================================
-- Activities: Muse vault, privacy, Rally quests, Turf, Reels, mentors
-- (spec §12 + §19.2, with the §21.1 schema fixes)
-- ============================================================

-- Messenger cards: kind = 'text' | 'rally_invite' | 'rally_game' | 'quest_card' | 'turf_recap' | 'proof' | 'system'
alter table messages add column if not exists kind text not null default 'text';
alter table messages add column if not exists payload jsonb;

create table if not exists activity_profiles (
  user_id integer primary key references users(id) on delete cascade,
  weekly_active_days text,
  primary_goal text,
  schedule text[],
  with_whom text,
  go_easy_note text,
  interest_suggestions_enabled boolean not null default false,
  onboarding_step text not null default 'intro',
  modal_snoozed_until timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists user_tags (
  user_id integer not null references users(id) on delete cascade,
  tag text not null,
  kind text not null check (kind in ('activity', 'goal', 'style', 'constraint')),
  origin text not null default 'selected' check (origin in ('selected', 'derived', 'suggested')),
  visibility text not null default 'friends' check (visibility in ('public', 'friends', 'only_me', 'muse_only')),
  confirmed boolean not null default true,
  reason text,
  created_at timestamptz not null default now(),
  primary key (user_id, kind, tag)
);

create table if not exists connections (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  source text not null,
  status text not null default 'pending' check (status in ('connected', 'pending', 'revoked', 'error')),
  tokens jsonb,
  external_user_id text,
  refresh_lock_until timestamptz,
  connected_at timestamptz default now(),
  unique (user_id, source)
);

create table if not exists vault_events (
  id bigserial primary key,
  user_id integer not null references users(id) on delete cascade,
  source text not null,
  external_id text,
  kind text not null check (kind in ('run', 'walk', 'ride', 'strength', 'yoga', 'swim', 'steps', 'sleep', 'recovery', 'other')),
  started_at timestamptz not null,
  ended_at timestamptz,
  distance_km numeric,
  duration_min numeric,
  steps integer,
  avg_hr integer,
  trust text not null default 'self_reported' check (trust in ('self_reported', 'photo', 'device', 'verified')),
  display_scope text not null default 'normal' check (display_scope in ('normal', 'owner_only')),
  duplicate_of bigint references vault_events(id) on delete set null,
  raw jsonb,
  created_at timestamptz not null default now(),
  unique (source, external_id)
);
create index if not exists vault_events_user_idx on vault_events (user_id, started_at desc);

create table if not exists share_policies (
  user_id integer not null references users(id) on delete cascade,
  category text not null check (category in ('workouts', 'steps', 'heart', 'sleep', 'body', 'location')),
  audience text not null check (audience in ('only_me', 'game_participants', 'friends', 'mentor_match', 'public')),
  level text not null check (level in ('exact', 'rounded', 'boolean', 'muse_only', 'none')),
  updated_at timestamptz not null default now(),
  primary key (user_id, category, audience)
);

create table if not exists answers_log (
  id bigserial primary key,
  owner_id integer not null references users(id) on delete cascade,
  asker text not null,
  audience text not null,
  question text not null,
  answer jsonb,
  level text,
  created_at timestamptz not null default now()
);
create index if not exists answers_log_owner_idx on answers_log (owner_id, id desc);

create table if not exists games (
  id serial primary key,
  conversation_id integer references conversations(id) on delete set null,
  game_type text not null default 'turf',
  settings jsonb not null default '{}'::jsonb,
  state jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'live', 'ended', 'cancelled')),
  host_id integer references users(id) on delete set null,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists game_invites (
  game_id integer not null references games(id) on delete cascade,
  user_id integer not null references users(id) on delete cascade,
  invited_by integer references users(id) on delete set null,
  status text not null default 'invited' check (status in ('invited', 'accepted', 'declined', 'expired', 'left')),
  color text,
  location_consent_at timestamptz,
  responded_at timestamptz,
  primary key (game_id, user_id)
);

create table if not exists turf_outings (
  id bigserial primary key,
  game_id integer not null references games(id) on delete cascade,
  user_id integer not null references users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  trail_cells text[] not null default '{}',
  status text not null default 'open' check (status in ('open', 'claimed', 'cut', 'discarded')),
  cells_claimed integer not null default 0
);
create index if not exists turf_outings_game_idx on turf_outings (game_id, status);

create table if not exists turf_cells (
  game_id integer not null references games(id) on delete cascade,
  cell text not null,
  owner_id integer references users(id) on delete set null,
  claimed_at timestamptz not null default now(),
  primary key (game_id, cell)
);

create table if not exists mentor_offers (
  user_id integer primary key references users(id) on delete cascade,
  metric text not null,
  from_value text,
  to_value text,
  weeks integer,
  consent jsonb not null default '{}'::jsonb,
  anonymous boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists mentor_requests (
  id serial primary key,
  seeker_id integer not null references users(id) on delete cascade,
  mentor_id integer not null references users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'completed', 'revoked')),
  consent jsonb not null default '{}'::jsonb,
  transcript jsonb not null default '[]'::jsonb,
  plan jsonb,
  created_at timestamptz not null default now()
);

create table if not exists reels (
  id serial primary key,
  pexels_id bigint unique,
  video_url text not null,
  poster_url text,
  duration_sec integer,
  width integer,
  height integer,
  creator_name text,
  creator_url text,
  source_url text,
  slug text,
  caption text,
  transcript text,
  synthetic boolean not null default true,
  is_fitness boolean not null default true,
  exercises jsonb not null default '[]'::jsonb,
  difficulty text,
  equipment text[] not null default '{}',
  setting text,
  tags text[] not null default '{}',
  confidence numeric,
  plays integer not null default 0,
  created_at timestamptz not null default now()
);

-- Rally quests reuse the Closeness quests table (§19.1). template null = legacy closeness quest.
alter table quests add column if not exists template text check (template in ('boss', 'relay', 'streak'));
alter table quests add column if not exists spec jsonb;
alter table quests add column if not exists conversation_id integer references conversations(id) on delete set null;
alter table quests add column if not exists reel_id integer references reels(id) on delete set null;
alter table quests add column if not exists group_id integer references groups(id) on delete set null;
alter table quests add column if not exists created_by integer references users(id) on delete set null;
alter table quests add column if not exists status text not null default 'active';
alter table quests add column if not exists starts_at timestamptz;
alter table quests add column if not exists ends_at timestamptz;
alter table quests add column if not exists boss_hp integer;
alter table quests add column if not exists boss_hp_left integer;
alter table quests add column if not exists boss_image_url text;

create table if not exists quest_moves (
  id bigserial primary key,
  quest_id integer not null references quests(id) on delete cascade,
  user_id integer not null references users(id) on delete cascade,
  vault_event_id bigint references vault_events(id) on delete set null,
  kind text not null default 'move' check (kind in ('move', 'dare')),
  dare_id text,
  damage integer not null default 0,
  note text,
  proof_image_url text,
  proof_status text check (proof_status in ('pending', 'approved', 'rejected')),
  proof_verdict text,
  created_at timestamptz not null default now()
);
create index if not exists quest_moves_quest_idx on quest_moves (quest_id, id desc);

create table if not exists avatar_gear (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  slug text not null,
  label text not null,
  description text,
  image_url text,
  quest_id integer references quests(id) on delete set null,
  earned_at timestamptz not null default now(),
  unique (user_id, slug)
);

create table if not exists reward_claims (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  quest_id integer references quests(id) on delete set null,
  tier text not null check (tier in ('gear', 'discount', 'equipment')),
  label text not null,
  sponsor text,
  code text,
  status text not null default 'unlocked' check (status in ('unlocked', 'claimed')),
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Discover / entry points / mentor exchange (subagent E)
alter table activity_profiles add column if not exists prompts jsonb not null default '{}'::jsonb;
alter table events add column if not exists settings jsonb not null default '{}'::jsonb;
alter table mentor_requests add column if not exists updated_at timestamptz not null default now();
create table if not exists reel_plays (
  user_id integer not null references users(id) on delete cascade,
  reel_id integer not null references reels(id) on delete cascade,
  played_at timestamptz not null default now(),
  primary key (user_id, reel_id)
);


-- Turf (scope D): owner-only GPS points and trail bookkeeping; the game state only exposes turf_cells.
alter table turf_outings add column if not exists raw jsonb not null default '[]'::jsonb;
alter table turf_outings add column if not exists trail jsonb not null default '[]'::jsonb;
alter table turf_outings add column if not exists consumed integer not null default 0;
alter table turf_outings add column if not exists source text not null default 'live';
alter table turf_outings add column if not exists result jsonb not null default '{}'::jsonb;
alter table game_invites add column if not exists resent_at timestamptz;
create index if not exists turf_cells_owner_idx on turf_cells (game_id, owner_id);

create table if not exists turf_privacy_zones (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  label text not null default 'Home',
  lat double precision not null,
  lng double precision not null,
  radius_m integer not null default 200,
  created_at timestamptz not null default now()
);
create index if not exists turf_privacy_zones_user_idx on turf_privacy_zones (user_id);
