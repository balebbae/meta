insert into users (name, email, avatar_url, cover_url, bio, is_online) values
  ('Caleb Bae', 'caleb@example.com', 'https://i.pravatar.cc/300?img=12', 'https://picsum.photos/seed/cover-caleb/1200/450', 'HackUTD organizer. Building things at UT Dallas.', true),
  ('Priya Sharma', 'priya@example.com', 'https://i.pravatar.cc/300?img=47', 'https://picsum.photos/seed/cover-priya/1200/450', 'CS @ UTD. Coffee first.', true),
  ('Marcus Lee', 'marcus@example.com', 'https://i.pravatar.cc/300?img=33', 'https://picsum.photos/seed/cover-marcus/1200/450', 'Shipping side projects on weekends.', true),
  ('Sofia Alvarez', 'sofia@example.com', 'https://i.pravatar.cc/300?img=45', 'https://picsum.photos/seed/cover-sofia/1200/450', 'Photographer. Dallas, TX.', false),
  ('Daniel Kim', 'daniel@example.com', 'https://i.pravatar.cc/300?img=14', 'https://picsum.photos/seed/cover-daniel/1200/450', 'Runs on sunsets and tacos.', true),
  ('Amara Okafor', 'amara@example.com', 'https://i.pravatar.cc/300?img=26', 'https://picsum.photos/seed/cover-amara/1200/450', 'Product designer.', false),
  ('Noah Patel', 'noah@example.com', 'https://i.pravatar.cc/300?img=59', 'https://picsum.photos/seed/cover-noah/1200/450', 'Hackathon addict.', true),
  ('Hannah Nguyen', 'hannah@example.com', 'https://i.pravatar.cc/300?img=32', 'https://picsum.photos/seed/cover-hannah/1200/450', 'Plants, pottery, Python.', false),
  ('Liam Carter', 'liam@example.com', 'https://i.pravatar.cc/300?img=68', 'https://picsum.photos/seed/cover-liam/1200/450', 'Mechanical engineer. Climber.', false),
  ('Zoe Martin', 'zoe@example.com', 'https://i.pravatar.cc/300?img=23', 'https://picsum.photos/seed/cover-zoe/1200/450', 'Figma all day.', true),
  ('Ethan Brooks', 'ethan@example.com', 'https://i.pravatar.cc/300?img=52', 'https://picsum.photos/seed/cover-ethan/1200/450', 'Backend guy. Go + Postgres.', false),
  ('Maya Robinson', 'maya@example.com', 'https://i.pravatar.cc/300?img=38', 'https://picsum.photos/seed/cover-maya/1200/450', 'Med student. Dog mom.', true)
on conflict (email) do nothing;

-- everyone is friends with Caleb (id 1); a few other pairs
insert into friendships (user_id, friend_id, status)
select 1, u.id, 'accepted' from users u where u.id <> 1
on conflict do nothing;
insert into friendships (user_id, friend_id, status)
select u.id, 1, 'accepted' from users u where u.id <> 1
on conflict do nothing;
insert into friendships (user_id, friend_id, status) values
  (2, 3, 'accepted'), (3, 2, 'accepted'), (2, 5, 'accepted'), (5, 2, 'accepted'),
  (4, 6, 'accepted'), (6, 4, 'accepted'), (7, 8, 'pending')
on conflict do nothing;

insert into posts (author_id, content, image_url, audience, share_count, created_at) values
  (2, 'HackUTD weekend recap: 1,200 hackers, 48 hours, zero sleep. Thank you to every volunteer who made it run so smoothly. See you all next year!', 'https://picsum.photos/seed/hackathon/1200/800', 'public', 17, now() - interval '2 hours'),
  (3, 'Finally shipped the thing I have been teasing for months. Small team, big dreams. Link in the comments.', null, 'friends', 4, now() - interval '5 hours'),
  (5, 'Dallas sunsets do not miss.', 'https://picsum.photos/seed/sunset-dallas/1200/900', 'public', 61, now() - interval '8 hours'),
  (6, 'Looking for a roommate near Richardson starting January. DM me if you know anyone!', null, 'public', 2, now() - interval '1 day'),
  (4, 'Golden hour at White Rock Lake. Shot on film.', 'https://picsum.photos/seed/whiterock/1200/800', 'public', 23, now() - interval '1 day 3 hours'),
  (7, 'Won best beginner hack at HackTX with a team I met 10 minutes before the deadline to form teams. Absolutely unreal weekend.', 'https://picsum.photos/seed/hacktx/1200/700', 'public', 9, now() - interval '2 days'),
  (8, 'My monstera finally put out a fenestrated leaf. Proud plant parent moment.', 'https://picsum.photos/seed/monstera/1200/1200', 'friends', 1, now() - interval '2 days 6 hours'),
  (10, 'Hot take: the best design system is the one your team actually uses.', null, 'public', 12, now() - interval '3 days'),
  (9, 'First outdoor lead climb of the season. Forearms are gone.', 'https://picsum.photos/seed/climb/1200/800', 'public', 3, now() - interval '3 days 4 hours'),
  (11, 'Migrated our API from REST to gRPC over the weekend. P99 latency dropped 40%. Writeup coming soon.', null, 'public', 28, now() - interval '4 days'),
  (12, 'Match day! Heading to Dallas for residency. Could not be more excited.', 'https://picsum.photos/seed/matchday/1200/800', 'public', 44, now() - interval '5 days'),
  (1, 'Trying out a new Facebook clone we built in a day. What do you think?', null, 'friends', 0, now() - interval '30 minutes');

insert into comments (post_id, author_id, content, created_at) values
  (1, 3, 'Best organized hackathon I have been to. Food was elite.', now() - interval '1 hour 50 minutes'),
  (1, 5, 'Still recovering. Worth it.', now() - interval '1 hour 20 minutes'),
  (1, 1, 'Thank you all for coming!', now() - interval '1 hour'),
  (2, 2, 'Congrats Marcus!!', now() - interval '4 hours 30 minutes'),
  (2, 3, 'Link: https://example.com', now() - interval '4 hours 20 minutes'),
  (3, 4, 'That sky is unreal.', now() - interval '7 hours'),
  (3, 10, 'Where is this?', now() - interval '6 hours'),
  (3, 5, 'Klyde Warren Park!', now() - interval '5 hours 50 minutes'),
  (5, 1, 'Film looks so good.', now() - interval '1 day'),
  (6, 2, 'So proud of you Noah!', now() - interval '1 day 20 hours'),
  (8, 11, 'Facts.', now() - interval '2 days 20 hours'),
  (10, 1, 'Need that writeup ASAP.', now() - interval '3 days 20 hours'),
  (11, 6, 'Congratulations Maya!', now() - interval '4 days 20 hours');

insert into reactions (post_id, user_id, type)
select p.id, u.id,
  (array['like','like','like','love','love','haha','wow','care'])[1 + ((p.id * 7 + u.id * 3) % 8)]
from posts p cross join users u
where (p.id + u.id) % 3 <> 0 and u.id <> p.author_id
on conflict do nothing;

insert into stories (user_id, image_url, created_at) values
  (2, 'https://picsum.photos/seed/story-priya/600/1000', now() - interval '1 hour'),
  (3, 'https://picsum.photos/seed/story-marcus/600/1000', now() - interval '2 hours'),
  (4, 'https://picsum.photos/seed/story-sofia/600/1000', now() - interval '3 hours'),
  (5, 'https://picsum.photos/seed/story-daniel/600/1000', now() - interval '4 hours'),
  (7, 'https://picsum.photos/seed/story-noah/600/1000', now() - interval '6 hours'),
  (10, 'https://picsum.photos/seed/story-zoe/600/1000', now() - interval '9 hours'),
  (12, 'https://picsum.photos/seed/story-maya/600/1000', now() - interval '12 hours');

insert into notifications (user_id, actor_id, type, post_id, message, is_read, created_at) values
  (1, 3, 'comment', 1, 'Marcus Lee commented on a post you are following.', false, now() - interval '1 hour 50 minutes'),
  (1, 5, 'reaction', 12, 'Daniel Kim reacted to your post.', false, now() - interval '20 minutes'),
  (1, 7, 'friend_request', null, 'Noah Patel sent you a friend request.', true, now() - interval '1 day'),
  (1, 12, 'birthday', null, 'Maya Robinson has a birthday today. Wish her well!', false, now() - interval '3 hours');

-- ---------- Secondary pages (idempotent) ----------
insert into groups (name, description, cover_url, icon_url, privacy, created_by) values
  ('UT Dallas Computer Science', 'Students, alumni and faculty of UTD CS. Share internships, projects and events.', 'https://picsum.photos/seed/group-utdcs/1600/600', 'https://picsum.photos/seed/icon-utdcs/200/200', 'public', 1),
  ('HackUTD Organizers', 'Private group for the HackUTD organizing team.', 'https://picsum.photos/seed/group-hackutd/1600/600', 'https://picsum.photos/seed/icon-hackutd/200/200', 'private', 1),
  ('Dallas Photography Club', 'Photowalks, critiques, and gear talk around DFW.', 'https://picsum.photos/seed/group-photo/1600/600', 'https://picsum.photos/seed/icon-photo/200/200', 'public', 4),
  ('Richardson Housing & Roommates', 'Find roommates and sublets near Richardson and Plano.', 'https://picsum.photos/seed/group-housing/1600/600', 'https://picsum.photos/seed/icon-housing/200/200', 'public', 6),
  ('Plant Parents of DFW', 'Show off your plants, trade cuttings, ask for help.', 'https://picsum.photos/seed/group-plants/1600/600', 'https://picsum.photos/seed/icon-plants/200/200', 'public', 8),
  ('Texas Climbing Community', 'Indoor and outdoor climbing across Texas.', 'https://picsum.photos/seed/group-climb/1600/600', 'https://picsum.photos/seed/icon-climb/200/200', 'private', 9)
on conflict (name) do nothing;

insert into group_members (group_id, user_id, role)
select g.id, u.id, case when g.created_by = u.id then 'admin' else 'member' end
from groups g cross join users u
where (g.id + u.id) % 3 <> 0 or u.id = 1 or g.created_by = u.id
on conflict do nothing;

insert into group_posts (group_id, author_id, content, image_url, like_count, comment_count, created_at)
select g.id, v.author_id, v.content, v.image_url, v.like_count, v.comment_count, now() - v.age
from (values
  ('UT Dallas Computer Science', 2, 'Anyone else taking CS 4348 with Ozbirn this spring? Looking to form a study group.', null, 24, 11, interval '1 hour'),
  ('UT Dallas Computer Science', 11, 'Career fair recap: 60+ companies, most were hiring for summer SWE interns. Bring printed resumes next time, half the booths asked for them.', 'https://picsum.photos/seed/gp-career/1200/700', 89, 17, interval '6 hours'),
  ('HackUTD Organizers', 1, 'Sponsor code toggle is live on HARP. Codes unlock the moment hacking starts.', null, 31, 6, interval '3 hours'),
  ('Dallas Photography Club', 4, 'Photowalk this Saturday at Klyde Warren Park, 7am for golden hour. Bring a 35 or 50.', 'https://picsum.photos/seed/gp-photowalk/1200/800', 56, 14, interval '9 hours'),
  ('Richardson Housing & Roommates', 6, '1 bed available in a 3/2 near Campbell and Coit starting January. $650 + utilities.', 'https://picsum.photos/seed/gp-room/1200/800', 12, 9, interval '1 day'),
  ('Plant Parents of DFW', 8, 'Cutting swap at the Richardson farmers market next Sunday. I have pothos, philodendron and a few hoyas.', 'https://picsum.photos/seed/gp-plants/1200/900', 73, 22, interval '1 day 4 hours'),
  ('Texas Climbing Community', 9, 'Reimers Ranch conditions report: dry, cool, perfect. Go now.', 'https://picsum.photos/seed/gp-climb/1200/800', 41, 8, interval '2 days'),
  ('UT Dallas Computer Science', 7, 'Reminder: HackUTD applications close Friday. Do not sleep on it.', null, 102, 19, interval '2 days 5 hours')
) as v(group_name, author_id, content, image_url, like_count, comment_count, age)
join groups g on g.name = v.group_name
where not exists (select 1 from group_posts gp where gp.group_id = g.id and gp.content = v.content);

insert into marketplace_listings (seller_id, title, description, price_cents, category, condition, location, image_url, created_at)
select * from (values
  (3, 'IKEA MALM desk, white', 'Barely used, no scratches. Pickup only.', 6000, 'Home Goods', 'used_like_new', 'Richardson, TX', 'https://picsum.photos/seed/mk-desk/800/800', now() - interval '2 hours'),
  (5, '2016 Honda Civic LX', '98k miles, clean title, new tires. One owner.', 1250000, 'Vehicles', 'used_good', 'Plano, TX', 'https://picsum.photos/seed/mk-civic/800/800', now() - interval '5 hours'),
  (2, 'Sony WH-1000XM4 headphones', 'Great condition, comes with case and cable.', 15000, 'Electronics', 'used_good', 'Dallas, TX', 'https://picsum.photos/seed/mk-headphones/800/800', now() - interval '7 hours'),
  (4, 'Canon AE-1 film camera + 50mm', 'Fully working light meter. Fresh seals.', 22000, 'Electronics', 'used_good', 'Dallas, TX', 'https://picsum.photos/seed/mk-camera/800/800', now() - interval '1 day'),
  (6, 'Mid-century accent chair', 'Walnut legs, mustard upholstery.', 9500, 'Home Goods', 'used_good', 'Garland, TX', 'https://picsum.photos/seed/mk-chair/800/800', now() - interval '1 day 3 hours'),
  (7, 'Mechanical keyboard, Keychron K2', 'Brown switches, hot-swappable. Includes keycap puller.', 5500, 'Electronics', 'used_like_new', 'Richardson, TX', 'https://picsum.photos/seed/mk-keyboard/800/800', now() - interval '1 day 8 hours'),
  (8, 'Monstera deliciosa, 3ft', 'Healthy and fenestrated. Pot included.', 4000, 'Garden & Outdoor', 'new', 'Frisco, TX', 'https://picsum.photos/seed/mk-monstera/800/800', now() - interval '2 days'),
  (9, 'La Sportiva climbing shoes, 42', 'Resoled once, lots of life left.', 6500, 'Sporting Goods', 'used_good', 'Dallas, TX', 'https://picsum.photos/seed/mk-shoes/800/800', now() - interval '2 days 2 hours'),
  (10, '27in LG 4K monitor', 'UHD, USB-C. Includes stand and box.', 24000, 'Electronics', 'used_like_new', 'Addison, TX', 'https://picsum.photos/seed/mk-monitor/800/800', now() - interval '2 days 9 hours'),
  (11, 'Standing desk frame, Flexispot', 'Dual motor, works perfectly. No top.', 12000, 'Home Goods', 'used_good', 'Plano, TX', 'https://picsum.photos/seed/mk-standing/800/800', now() - interval '3 days'),
  (12, 'Queen bed frame + mattress', 'Moving out, must go this weekend.', 18000, 'Home Goods', 'used_fair', 'Dallas, TX', 'https://picsum.photos/seed/mk-bed/800/800', now() - interval '3 days 4 hours'),
  (2, 'Nintendo Switch OLED', 'With dock, Joy-Cons and two games.', 25000, 'Electronics', 'used_like_new', 'Irving, TX', 'https://picsum.photos/seed/mk-switch/800/800', now() - interval '4 days'),
  (3, 'Trek FX 2 hybrid bike', 'Size M, recently tuned.', 38000, 'Sporting Goods', 'used_good', 'Richardson, TX', 'https://picsum.photos/seed/mk-bike/800/800', now() - interval '4 days 6 hours'),
  (5, 'Patagonia down sweater, M', 'Navy. Worn a handful of times.', 11000, 'Apparel', 'used_like_new', 'Dallas, TX', 'https://picsum.photos/seed/mk-jacket/800/800', now() - interval '5 days'),
  (6, 'Dining table + 4 chairs', 'Solid oak. Minor wear on one chair.', 25000, 'Home Goods', 'used_good', 'Carrollton, TX', 'https://picsum.photos/seed/mk-table/800/800', now() - interval '5 days 3 hours'),
  (7, 'Apartment sublet near UTD', '1b/1b, Jan-May, $1,100/mo. Pets ok.', 110000, 'Property Rentals', 'new', 'Richardson, TX', 'https://picsum.photos/seed/mk-apt/800/800', now() - interval '6 days')
) as v(seller_id, title, description, price_cents, category, condition, location, image_url, created_at)
where not exists (select 1 from marketplace_listings m where m.title = v.title);

insert into events (host_id, title, description, location, cover_url, starts_at, ends_at, interested_count, is_online)
select * from (values
  (1, 'HackUTD 2026 Kickoff', 'Opening ceremony, team formation and sponsor expo.', 'ECSW Building, Richardson, TX', 'https://picsum.photos/seed/ev-hackutd/1200/675', date_trunc('day', now()) + interval '3 days 19 hours', date_trunc('day', now()) + interval '3 days 22 hours', 1243, false),
  (4, 'White Rock Lake Sunrise Photowalk', 'Meet at the Bath House Cultural Center.', 'White Rock Lake, Dallas, TX', 'https://picsum.photos/seed/ev-photowalk/1200/675', date_trunc('day', now()) + interval '5 days 6 hours 30 minutes', null, 86, false),
  (5, 'Deep Ellum Night Market', 'Local vendors, food trucks, live music.', 'Deep Ellum, Dallas, TX', 'https://picsum.photos/seed/ev-market/1200/675', date_trunc('day', now()) + interval '2 days 18 hours', null, 2310, false),
  (11, 'Go + Postgres Meetup: gRPC in production', 'Talks and pizza.', 'Capital Factory, Dallas, TX', 'https://picsum.photos/seed/ev-meetup/1200/675', date_trunc('day', now()) + interval '7 days 18 hours 30 minutes', null, 154, false),
  (10, 'Figma Config Watch Party', 'Streaming the keynote together.', 'Online', 'https://picsum.photos/seed/ev-figma/1200/675', date_trunc('day', now()) + interval '9 days 11 hours', null, 412, true),
  (9, 'Reimers Ranch Climbing Weekend', 'Camping Friday and Saturday night.', 'Reimers Ranch, Dripping Springs, TX', 'https://picsum.photos/seed/ev-climb/1200/675', date_trunc('day', now()) + interval '12 days 8 hours', date_trunc('day', now()) + interval '14 days 16 hours', 67, false),
  (12, 'Dallas Marathon Cheer Station', 'Signs, cowbells and coffee at mile 18.', 'Lakewood, Dallas, TX', 'https://picsum.photos/seed/ev-marathon/1200/675', date_trunc('day', now()) + interval '16 days 7 hours', null, 528, false),
  (8, 'Houseplant Swap & Sale', 'Bring a cutting, take a cutting.', 'Richardson Farmers Market, TX', 'https://picsum.photos/seed/ev-plants/1200/675', date_trunc('day', now()) + interval '4 days 10 hours', null, 231, false)
) as v(host_id, title, description, location, cover_url, starts_at, ends_at, interested_count, is_online)
where not exists (select 1 from events e where e.title = v.title);

insert into videos (channel_id, title, thumbnail_url, duration_seconds, view_count, like_count, comment_count, share_count, created_at)
select * from (values
  (2, 'HackUTD 2025 Official Recap', 'https://picsum.photos/seed/vid-recap/1280/720', 212, 48200, 2100, 143, 312, now() - interval '3 hours'),
  (4, 'Shooting Dallas on 35mm film: a day at White Rock Lake', 'https://picsum.photos/seed/vid-film/1280/720', 754, 12300, 980, 64, 51, now() - interval '9 hours'),
  (5, 'The best tacos in Dallas, ranked', 'https://picsum.photos/seed/vid-tacos/1280/720', 611, 203000, 15400, 1240, 4300, now() - interval '1 day'),
  (11, 'REST to gRPC: how we cut p99 latency 40%', 'https://picsum.photos/seed/vid-grpc/1280/720', 1512, 31500, 2400, 212, 870, now() - interval '1 day 6 hours'),
  (9, 'Reimers Ranch lead climbing, first send of the season', 'https://picsum.photos/seed/vid-climb/1280/720', 338, 8700, 610, 38, 22, now() - interval '2 days'),
  (8, 'How I keep 60 houseplants alive in a Texas apartment', 'https://picsum.photos/seed/vid-plants/1280/720', 905, 76400, 5300, 410, 1200, now() - interval '3 days'),
  (10, 'Designing a Facebook clone in a day', 'https://picsum.photos/seed/vid-design/1280/720', 1180, 19800, 1700, 156, 230, now() - interval '4 days'),
  (7, 'HackTX 2026: forming a team 10 minutes before the deadline', 'https://picsum.photos/seed/vid-hacktx/1280/720', 480, 5600, 420, 29, 18, now() - interval '5 days')
) as v(channel_id, title, thumbnail_url, duration_seconds, view_count, like_count, comment_count, share_count, created_at)
where not exists (select 1 from videos x where x.title = v.title);

insert into saved_posts (user_id, post_id, collection)
select 1, p.id, case when p.image_url is null then 'For later' else 'Inspiration' end
from posts p where p.author_id in (3, 5, 11) and p.author_id <> 1
on conflict do nothing;

insert into marketplace_saved (listing_id, user_id)
select m.id, 1 from marketplace_listings m where m.title in ('Canon AE-1 film camera + 50mm', '27in LG 4K monitor')
on conflict do nothing;

insert into event_rsvps (event_id, user_id, status)
select e.id, 1, 'interested' from events e where e.title in ('HackUTD 2026 Kickoff', 'Deep Ellum Night Market')
on conflict do nothing;
||||||| parent of 3d118bb (profile: user_details table, non-friend users with pending requests, photo posts for Caleb)

-- profile agent: people who are NOT friends with Caleb (for Friend Requests / People You May Know)
insert into users (name, email, avatar_url, cover_url, bio, is_online) values
  ('Olivia Chen', 'olivia@example.com', 'https://i.pravatar.cc/300?img=44', 'https://picsum.photos/seed/cover-olivia/1200/450', 'UX researcher. Austin, TX.', true),
  ('Jamal Wright', 'jamal@example.com', 'https://i.pravatar.cc/300?img=60', 'https://picsum.photos/seed/cover-jamal/1200/450', 'Data engineer by day, DJ by night.', false),
  ('Isabella Rossi', 'isabella@example.com', 'https://i.pravatar.cc/300?img=49', 'https://picsum.photos/seed/cover-isabella/1200/450', 'Architecture student. Espresso enthusiast.', true),
  ('Kenji Tanaka', 'kenji@example.com', 'https://i.pravatar.cc/300?img=15', 'https://picsum.photos/seed/cover-kenji/1200/450', 'Game dev. Unity + Rust.', false),
  ('Grace Kim', 'grace@example.com', 'https://i.pravatar.cc/300?img=29', 'https://picsum.photos/seed/cover-grace/1200/450', 'Pianist. Marathon runner.', true),
  ('Ravi Menon', 'ravi@example.com', 'https://i.pravatar.cc/300?img=11', 'https://picsum.photos/seed/cover-ravi/1200/450', 'Cloud infra @ a startup you have not heard of.', false),
  ('Lucas Fernandez', 'lucas@example.com', 'https://i.pravatar.cc/300?img=57', 'https://picsum.photos/seed/cover-lucas/1200/450', 'Soccer, salsa, software.', true),
  ('Emily Park', 'emily@example.com', 'https://i.pravatar.cc/300?img=20', 'https://picsum.photos/seed/cover-emily/1200/450', 'Nursing student. Cat person.', false)
on conflict (email) do nothing;

-- keep these people out of Caleb's friend list even if the seed is re-run
delete from friendships
where (user_id = 1 or friend_id = 1)
  and (user_id in (select id from users where email in ('olivia@example.com','jamal@example.com','isabella@example.com','kenji@example.com','grace@example.com','ravi@example.com','lucas@example.com','emily@example.com'))
    or friend_id in (select id from users where email in ('olivia@example.com','jamal@example.com','isabella@example.com','kenji@example.com','grace@example.com','ravi@example.com','lucas@example.com','emily@example.com')));

-- three incoming friend requests for Caleb
insert into friendships (user_id, friend_id, status)
select u.id, 1, 'pending' from users u where u.email in ('olivia@example.com', 'jamal@example.com', 'isabella@example.com')
on conflict do nothing;

-- mutual friends between the new people and Caleb's friends
insert into friendships (user_id, friend_id, status)
select a.id, b.id, 'accepted' from users a join users b on true
where (a.email, b.email) in (
  ('olivia@example.com','priya@example.com'), ('olivia@example.com','marcus@example.com'), ('olivia@example.com','daniel@example.com'),
  ('jamal@example.com','priya@example.com'), ('jamal@example.com','sofia@example.com'),
  ('isabella@example.com','zoe@example.com'), ('isabella@example.com','amara@example.com'), ('isabella@example.com','noah@example.com'), ('isabella@example.com','hannah@example.com'),
  ('kenji@example.com','marcus@example.com'), ('kenji@example.com','ethan@example.com'),
  ('grace@example.com','maya@example.com'), ('grace@example.com','hannah@example.com'), ('grace@example.com','priya@example.com'),
  ('ravi@example.com','ethan@example.com'),
  ('lucas@example.com','daniel@example.com'), ('lucas@example.com','liam@example.com'),
  ('emily@example.com','maya@example.com'))
on conflict do nothing;
insert into friendships (user_id, friend_id, status)
select f.friend_id, f.user_id, 'accepted' from friendships f
join users a on a.id = f.user_id
where f.status = 'accepted' and a.email in ('olivia@example.com','jamal@example.com','isabella@example.com','kenji@example.com','grace@example.com','ravi@example.com','lucas@example.com','emily@example.com')
on conflict do nothing;

-- photo posts for Caleb so his Photos grid is not empty
insert into posts (author_id, content, image_url, audience, share_count, created_at)
select 1, v.content, v.image_url, 'public', v.shares, now() - v.age
from (values
  ('Opening ceremony energy. 1,200 hackers in one room.', 'https://picsum.photos/seed/caleb-opening/1200/800', 31, interval '6 days'),
  ('Late-night debugging with the best team.', 'https://picsum.photos/seed/caleb-team/1200/900', 8, interval '9 days'),
  ('Campus in the fall never gets old.', 'https://picsum.photos/seed/caleb-campus/1200/800', 14, interval '13 days'),
  ('New desk setup. Finally cable-managed.', 'https://picsum.photos/seed/caleb-desk/1200/800', 5, interval '20 days'),
  ('Weekend hike at Cedar Ridge.', 'https://picsum.photos/seed/caleb-hike/1200/900', 19, interval '27 days'),
  ('Sponsor fair setup is done. Doors open at 9.', 'https://picsum.photos/seed/caleb-sponsors/1200/800', 3, interval '34 days'),
  ('Coffee, code, repeat.', 'https://picsum.photos/seed/caleb-coffee/1200/1200', 2, interval '41 days'),
  ('Throwback to our first hackathon as organizers.', 'https://picsum.photos/seed/caleb-throwback/1200/800', 27, interval '60 days'),
  ('Dallas skyline from the Reunion Tower.', 'https://picsum.photos/seed/caleb-skyline/1200/800', 12, interval '75 days')
) as v(content, image_url, shares, age)
where not exists (select 1 from posts p where p.author_id = 1 and p.image_url = v.image_url);

-- About tab details for every seeded user
insert into user_details (user_id, work, work_title, education, high_school, current_city, hometown, relationship, phone, website, birthday, gender, languages)
select u.id, v.work, v.work_title, v.education, v.high_school, v.current_city, v.hometown, v.relationship, v.phone, v.website, v.birthday, v.gender, v.languages
from (values
  ('caleb@example.com', 'HackUTD', 'Director', 'The University of Texas at Dallas', 'Plano Senior High School', 'Dallas, Texas', 'Plano, Texas', 'Single', '+1 469-555-0101', 'hackutd.co', 'March 14, 2004', 'Male', 'English, Korean'),
  ('priya@example.com', 'ACM UTD', 'Officer', 'The University of Texas at Dallas', 'Coppell High School', 'Richardson, Texas', 'Coppell, Texas', 'In a relationship', '+1 972-555-0102', 'priya.dev', 'July 2, 2004', 'Female', 'English, Hindi'),
  ('marcus@example.com', 'Self-employed', 'Founder', 'University of Texas at Austin', 'Westlake High School', 'Austin, Texas', 'Houston, Texas', 'Single', '+1 512-555-0103', 'marcuslee.co', 'November 20, 2001', 'Male', 'English'),
  ('sofia@example.com', 'Freelance', 'Photographer', 'Southern Methodist University', 'Lake Highlands High School', 'Dallas, Texas', 'San Antonio, Texas', 'Married', '+1 214-555-0104', 'sofiaalvarez.photo', 'May 9, 1998', 'Female', 'English, Spanish'),
  ('daniel@example.com', 'Capital One', 'Software Engineer', 'The University of Texas at Dallas', 'Allen High School', 'Plano, Texas', 'Allen, Texas', 'Single', '+1 469-555-0105', null, 'January 30, 2002', 'Male', 'English, Korean'),
  ('amara@example.com', 'Figma', 'Product Designer', 'University of North Texas', 'Frisco High School', 'Frisco, Texas', 'Lagos, Nigeria', 'In a relationship', '+1 972-555-0106', 'amara.design', 'August 17, 2000', 'Female', 'English, Igbo'),
  ('noah@example.com', 'Student', null, 'The University of Texas at Dallas', 'Centennial High School', 'Richardson, Texas', 'Frisco, Texas', 'Single', '+1 469-555-0107', null, 'February 11, 2005', 'Male', 'English, Gujarati'),
  ('hannah@example.com', 'Texas Instruments', 'Data Analyst', 'Texas A&M University', 'Garland High School', 'Garland, Texas', 'Garland, Texas', 'Single', '+1 214-555-0108', null, 'October 5, 2000', 'Female', 'English, Vietnamese'),
  ('liam@example.com', 'Lockheed Martin', 'Mechanical Engineer', 'Texas Tech University', 'Rockwall High School', 'Fort Worth, Texas', 'Rockwall, Texas', 'Engaged', '+1 817-555-0109', null, 'June 23, 1999', 'Male', 'English'),
  ('zoe@example.com', 'Toyota Connected', 'UX Designer', 'University of North Texas', 'Hebron High School', 'Plano, Texas', 'Carrollton, Texas', 'Single', '+1 972-555-0110', 'zoemartin.design', 'April 1, 2001', 'Female', 'English, French'),
  ('ethan@example.com', 'Stripe', 'Backend Engineer', 'University of Texas at Austin', 'Keller High School', 'Austin, Texas', 'Keller, Texas', 'Married', '+1 512-555-0111', 'ethanbrooks.dev', 'September 28, 1997', 'Male', 'English'),
  ('maya@example.com', 'UT Southwestern Medical Center', 'Resident Physician', 'Baylor University', 'Highland Park High School', 'Dallas, Texas', 'Dallas, Texas', 'Single', '+1 214-555-0112', null, 'December 12, 1998', 'Female', 'English'),
  ('olivia@example.com', 'Indeed', 'UX Researcher', 'University of Texas at Austin', 'Anderson High School', 'Austin, Texas', 'Sugar Land, Texas', 'Single', '+1 512-555-0113', null, 'March 3, 2000', 'Female', 'English, Mandarin'),
  ('jamal@example.com', 'American Airlines', 'Data Engineer', 'University of Houston', 'Lamar High School', 'Fort Worth, Texas', 'Houston, Texas', 'Single', '+1 817-555-0114', null, 'July 19, 1999', 'Male', 'English'),
  ('isabella@example.com', 'Student', null, 'Rice University', 'Liceo Classico Dante', 'Houston, Texas', 'Milan, Italy', 'Single', '+1 713-555-0115', null, 'May 25, 2003', 'Female', 'Italian, English'),
  ('kenji@example.com', 'Gearbox Software', 'Gameplay Programmer', 'Southern Methodist University', 'Lewisville High School', 'Frisco, Texas', 'Osaka, Japan', 'In a relationship', '+1 972-555-0116', null, 'October 10, 1998', 'Male', 'Japanese, English'),
  ('grace@example.com', 'Dallas Symphony Orchestra', 'Pianist', 'University of North Texas', 'Plano West Senior High School', 'Dallas, Texas', 'Plano, Texas', 'Single', '+1 214-555-0117', null, 'January 8, 2001', 'Female', 'English, Korean'),
  ('ravi@example.com', 'Vercel', 'Infrastructure Engineer', 'Georgia Institute of Technology', 'Clements High School', 'Dallas, Texas', 'Sugar Land, Texas', 'Married', '+1 469-555-0118', 'ravimenon.io', 'August 30, 1995', 'Male', 'English, Malayalam'),
  ('lucas@example.com', 'FC Dallas', 'Analyst', 'University of Texas at Dallas', 'Irving High School', 'Irving, Texas', 'Monterrey, Mexico', 'Single', '+1 972-555-0119', null, 'June 6, 2002', 'Male', 'Spanish, English'),
  ('emily@example.com', 'Student', null, 'Texas Woman''s University', 'Denton High School', 'Denton, Texas', 'Denton, Texas', 'Single', '+1 940-555-0120', null, 'February 27, 2004', 'Female', 'English')
) as v(email, work, work_title, education, high_school, current_city, hometown, relationship, phone, website, birthday, gender, languages)
join users u on u.email = v.email
on conflict (user_id) do nothing;
