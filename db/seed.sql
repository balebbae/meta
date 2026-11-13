insert into users (name, email, avatar_url, cover_url, bio, is_online) values
  ('Caleb Bae', 'caleb@example.com', 'https://i.pravatar.cc/300?img=12', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&h=450&fit=crop&q=80', 'HackUTD organizer. Building things at UT Dallas.', true),
  ('Priya Sharma', 'priya@example.com', 'https://i.pravatar.cc/300?img=47', 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&h=450&fit=crop&q=80', 'CS @ UTD. Coffee first.', true),
  ('Marcus Lee', 'marcus@example.com', 'https://i.pravatar.cc/300?img=33', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&h=450&fit=crop&q=80', 'Shipping side projects on weekends.', true),
  ('Sofia Alvarez', 'sofia@example.com', 'https://i.pravatar.cc/300?img=45', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&h=450&fit=crop&q=80', 'Photographer. Dallas, TX.', false),
  ('Daniel Kim', 'daniel@example.com', 'https://i.pravatar.cc/300?img=14', 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1200&h=450&fit=crop&q=80', 'Runs on sunsets and tacos.', true),
  ('Amara Okafor', 'amara@example.com', 'https://i.pravatar.cc/300?img=26', 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=1200&h=450&fit=crop&q=80', 'Product designer.', false),
  ('Noah Patel', 'noah@example.com', 'https://i.pravatar.cc/300?img=59', 'https://images.unsplash.com/photo-1476231682828-37e571bc172f?w=1200&h=450&fit=crop&q=80', 'Hackathon addict.', true),
  ('Hannah Nguyen', 'hannah@example.com', 'https://i.pravatar.cc/300?img=32', 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1200&h=450&fit=crop&q=80', 'Plants, pottery, Python.', false),
  ('Liam Carter', 'liam@example.com', 'https://i.pravatar.cc/300?img=68', 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=1200&h=450&fit=crop&q=80', 'Mechanical engineer. Climber.', false),
  ('Zoe Martin', 'zoe@example.com', 'https://i.pravatar.cc/300?img=23', 'https://images.unsplash.com/photo-1486299267070-83823f5448dd?w=1200&h=450&fit=crop&q=80', 'Figma all day.', true),
  ('Ethan Brooks', 'ethan@example.com', 'https://i.pravatar.cc/300?img=52', 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1200&h=450&fit=crop&q=80', 'Backend guy. Go + Postgres.', false),
  ('Maya Robinson', 'maya@example.com', 'https://i.pravatar.cc/300?img=38', 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1200&h=450&fit=crop&q=80', 'Med student. Dog mom.', true)
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
  (2, 'HackUTD weekend recap: 1,200 hackers, 48 hours, zero sleep. Thank you to every volunteer who made it run so smoothly. See you all next year!', 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=1200&h=800&fit=crop&q=80', 'public', 17, now() - interval '2 hours'),
  (3, 'Finally shipped the thing I have been teasing for months. Small team, big dreams. Link in the comments.', null, 'friends', 4, now() - interval '5 hours'),
  (5, 'Dallas sunsets do not miss.', 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&h=900&fit=crop&q=80', 'public', 61, now() - interval '8 hours'),
  (6, 'Looking for a roommate near Richardson starting January. DM me if you know anyone!', null, 'public', 2, now() - interval '1 day'),
  (4, 'Golden hour at White Rock Lake. Shot on film.', 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&h=800&fit=crop&q=80', 'public', 23, now() - interval '1 day 3 hours'),
  (7, 'Won best beginner hack at HackTX with a team I met 10 minutes before the deadline to form teams. Absolutely unreal weekend.', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=700&fit=crop&q=80', 'public', 9, now() - interval '2 days'),
  (8, 'My monstera finally put out a fenestrated leaf. Proud plant parent moment.', 'https://images.unsplash.com/photo-1463936575829-25148e1db1b8?w=1200&h=1200&fit=crop&q=80', 'friends', 1, now() - interval '2 days 6 hours'),
  (10, 'Hot take: the best design system is the one your team actually uses.', null, 'public', 12, now() - interval '3 days'),
  (9, 'First outdoor lead climb of the season. Forearms are gone.', 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=1200&h=800&fit=crop&q=80', 'public', 3, now() - interval '3 days 4 hours'),
  (11, 'Migrated our API from REST to gRPC over the weekend. P99 latency dropped 40%. Writeup coming soon.', null, 'public', 28, now() - interval '4 days'),
  (12, 'Match day! Heading to Dallas for residency. Could not be more excited.', 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&h=800&fit=crop&q=80', 'public', 44, now() - interval '5 days'),
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
  (2, 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=1000&fit=crop&q=80', now() - interval '1 hour'),
  (3, 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=600&h=1000&fit=crop&q=80', now() - interval '2 hours'),
  (4, 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&h=1000&fit=crop&q=80', now() - interval '3 hours'),
  (5, 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=1000&fit=crop&q=80', now() - interval '4 hours'),
  (7, 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=1000&fit=crop&q=80', now() - interval '6 hours'),
  (10, 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&h=1000&fit=crop&q=80', now() - interval '9 hours'),
  (12, 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=600&h=1000&fit=crop&q=80', now() - interval '12 hours');

insert into notifications (user_id, actor_id, type, post_id, message, is_read, created_at) values
  (1, 3, 'comment', 1, 'Marcus Lee commented on a post you are following.', false, now() - interval '1 hour 50 minutes'),
  (1, 5, 'reaction', 12, 'Daniel Kim reacted to your post.', false, now() - interval '20 minutes'),
  (1, 7, 'friend_request', null, 'Noah Patel sent you a friend request.', true, now() - interval '1 day'),
  (1, 12, 'birthday', null, 'Maya Robinson has a birthday today. Wish her well!', false, now() - interval '3 hours');

-- ---------- Secondary pages (idempotent) ----------
insert into groups (name, description, cover_url, icon_url, privacy, created_by) values
  ('UT Dallas Computer Science', 'Students, alumni and faculty of UTD CS. Share internships, projects and events.', 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=1600&h=600&q=80', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=200&h=200&q=80', 'public', 1),
  ('HackUTD Organizers', 'Private group for the HackUTD organizing team.', 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1600&h=600&q=80', 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=200&h=200&q=80', 'private', 1),
  ('Dallas Photography Club', 'Photowalks, critiques, and gear talk around DFW.', 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=1600&h=600&q=80', 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=200&h=200&q=80', 'public', 4),
  ('Richardson Housing & Roommates', 'Find roommates and sublets near Richardson and Plano.', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&h=600&q=80', 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=200&h=200&q=80', 'public', 6),
  ('Plant Parents of DFW', 'Show off your plants, trade cuttings, ask for help.', 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&h=600&q=80', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=200&h=200&q=80', 'public', 8),
  ('Texas Climbing Community', 'Indoor and outdoor climbing across Texas.', 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&w=1600&h=600&q=80', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=200&h=200&q=80', 'private', 9),
  ('DFW Run Club', 'Group runs, 5Ks and trail meetups around Dallas. All paces welcome.', 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?auto=format&fit=crop&w=1600&h=600&q=80', 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=200&h=200&q=80', 'public', 5)
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
  ('UT Dallas Computer Science', 11, 'Career fair recap: 60+ companies, most were hiring for summer SWE interns. Bring printed resumes next time, half the booths asked for them.', 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&h=700&q=80', 89, 17, interval '6 hours'),
  ('HackUTD Organizers', 1, 'Sponsor code toggle is live on HARP. Codes unlock the moment hacking starts.', null, 31, 6, interval '3 hours'),
  ('Dallas Photography Club', 4, 'Photowalk this Saturday at Klyde Warren Park, 7am for golden hour. Bring a 35 or 50.', 'https://images.unsplash.com/photo-1444723121867-7a241cacace9?auto=format&fit=crop&w=1200&h=800&q=80', 56, 14, interval '9 hours'),
  ('Richardson Housing & Roommates', 6, '1 bed available in a 3/2 near Campbell and Coit starting January. $650 + utilities.', 'https://images.unsplash.com/photo-1530018607912-eff2daa1bac4?auto=format&fit=crop&w=1200&h=800&q=80', 12, 9, interval '1 day'),
  ('Plant Parents of DFW', 8, 'Cutting swap at the Richardson farmers market next Sunday. I have pothos, philodendron and a few hoyas.', 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1200&h=900&q=80', 73, 22, interval '1 day 4 hours'),
  ('Texas Climbing Community', 9, 'Reimers Ranch conditions report: dry, cool, perfect. Go now.', 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&h=800&q=80', 41, 8, interval '2 days'),
  ('UT Dallas Computer Science', 7, 'Reminder: HackUTD applications close Friday. Do not sleep on it.', null, 102, 19, interval '2 days 5 hours')
) as v(group_name, author_id, content, image_url, like_count, comment_count, age)
join groups g on g.name = v.group_name
where not exists (select 1 from group_posts gp where gp.group_id = g.id and gp.content = v.content);

insert into marketplace_listings (seller_id, title, description, price_cents, category, condition, location, image_url, created_at)
select * from (values
  (3, 'IKEA MALM desk, white', 'Barely used, no scratches. Pickup only.', 6000, 'Home Goods', 'used_like_new', 'Richardson, TX', 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=800&h=800&q=80', now() - interval '2 hours'),
  (5, '2016 Honda Civic LX', '98k miles, clean title, new tires. One owner.', 1250000, 'Vehicles', 'used_good', 'Plano, TX', 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&h=800&q=80', now() - interval '5 hours'),
  (2, 'Sony WH-1000XM4 headphones', 'Great condition, comes with case and cable.', 15000, 'Electronics', 'used_good', 'Dallas, TX', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&h=800&q=80', now() - interval '7 hours'),
  (4, 'Canon AE-1 film camera + 50mm', 'Fully working light meter. Fresh seals.', 22000, 'Electronics', 'used_good', 'Dallas, TX', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&h=800&q=80', now() - interval '1 day'),
  (6, 'Mid-century accent chair', 'Walnut legs, mustard upholstery.', 9500, 'Home Goods', 'used_good', 'Garland, TX', 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&h=800&q=80', now() - interval '1 day 3 hours'),
  (7, 'Mechanical keyboard, Keychron K2', 'Brown switches, hot-swappable. Includes keycap puller.', 5500, 'Electronics', 'used_like_new', 'Richardson, TX', 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&h=800&q=80', now() - interval '1 day 8 hours'),
  (8, 'Monstera deliciosa, 3ft', 'Healthy and fenestrated. Pot included.', 4000, 'Garden & Outdoor', 'new', 'Frisco, TX', 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?auto=format&fit=crop&w=800&h=800&q=80', now() - interval '2 days'),
  (9, 'La Sportiva climbing shoes, 42', 'Resoled once, lots of life left.', 6500, 'Sporting Goods', 'used_good', 'Dallas, TX', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=800&h=800&q=80', now() - interval '2 days 2 hours'),
  (10, '27in LG 4K monitor', 'UHD, USB-C. Includes stand and box.', 24000, 'Electronics', 'used_like_new', 'Addison, TX', 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&h=800&q=80', now() - interval '2 days 9 hours'),
  (11, 'Standing desk frame, Flexispot', 'Dual motor, works perfectly. No top.', 12000, 'Home Goods', 'used_good', 'Plano, TX', 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&h=800&q=80', now() - interval '3 days'),
  (12, 'Queen bed frame + mattress', 'Moving out, must go this weekend.', 18000, 'Home Goods', 'used_fair', 'Dallas, TX', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&h=800&q=80', now() - interval '3 days 4 hours'),
  (2, 'Nintendo Switch OLED', 'With dock, Joy-Cons and two games.', 25000, 'Electronics', 'used_like_new', 'Irving, TX', 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&w=800&h=800&q=80', now() - interval '4 days'),
  (3, 'Trek FX 2 hybrid bike', 'Size M, recently tuned.', 38000, 'Sporting Goods', 'used_good', 'Richardson, TX', 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&h=800&q=80', now() - interval '4 days 6 hours'),
  (5, 'Patagonia down sweater, M', 'Navy. Worn a handful of times.', 11000, 'Apparel', 'used_like_new', 'Dallas, TX', 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?auto=format&fit=crop&w=800&h=800&q=80', now() - interval '5 days'),
  (6, 'Dining table + 4 chairs', 'Solid oak. Minor wear on one chair.', 25000, 'Home Goods', 'used_good', 'Carrollton, TX', 'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=800&h=800&q=80', now() - interval '5 days 3 hours'),
  (7, 'Apartment sublet near UTD', '1b/1b, Jan-May, $1,100/mo. Pets ok.', 110000, 'Property Rentals', 'new', 'Richardson, TX', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&h=800&q=80', now() - interval '6 days')
) as v(seller_id, title, description, price_cents, category, condition, location, image_url, created_at)
where not exists (select 1 from marketplace_listings m where m.title = v.title);

insert into events (host_id, title, description, location, cover_url, starts_at, ends_at, interested_count, is_online)
select * from (values
  (1, 'HackUTD 2026 Kickoff', 'Opening ceremony, team formation and sponsor expo.', 'ECSW Building, Richardson, TX', 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&h=675&q=80', date_trunc('day', now()) + interval '3 days 19 hours', date_trunc('day', now()) + interval '3 days 22 hours', 1243, false),
  (4, 'White Rock Lake Sunrise Photowalk', 'Meet at the Bath House Cultural Center.', 'White Rock Lake, Dallas, TX', 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&h=675&q=80', date_trunc('day', now()) + interval '5 days 6 hours 30 minutes', null, 86, false),
  (5, 'Deep Ellum Night Market', 'Local vendors, food trucks, live music.', 'Deep Ellum, Dallas, TX', 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1200&h=675&q=80', date_trunc('day', now()) + interval '2 days 18 hours', null, 2310, false),
  (11, 'Go + Postgres Meetup: gRPC in production', 'Talks and pizza.', 'Capital Factory, Dallas, TX', 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&h=675&q=80', date_trunc('day', now()) + interval '7 days 18 hours 30 minutes', null, 154, false),
  (10, 'Figma Config Watch Party', 'Streaming the keynote together.', 'Online', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&h=675&q=80', date_trunc('day', now()) + interval '9 days 11 hours', null, 412, true),
  (9, 'Reimers Ranch Climbing Weekend', 'Camping Friday and Saturday night.', 'Reimers Ranch, Dripping Springs, TX', 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1200&h=675&q=80', date_trunc('day', now()) + interval '12 days 8 hours', date_trunc('day', now()) + interval '14 days 16 hours', 67, false),
  (12, 'Dallas Marathon Cheer Station', 'Signs, cowbells and coffee at mile 18.', 'Lakewood, Dallas, TX', 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&h=675&q=80', date_trunc('day', now()) + interval '16 days 7 hours', null, 528, false),
  (8, 'Houseplant Swap & Sale', 'Bring a cutting, take a cutting.', 'Richardson Farmers Market, TX', 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1200&h=675&q=80', date_trunc('day', now()) + interval '4 days 10 hours', null, 231, false)
) as v(host_id, title, description, location, cover_url, starts_at, ends_at, interested_count, is_online)
where not exists (select 1 from events e where e.title = v.title);

insert into videos (channel_id, title, thumbnail_url, duration_seconds, view_count, like_count, comment_count, share_count, created_at)
select * from (values
  (2, 'HackUTD 2025 Official Recap', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1280&h=720&q=80', 212, 48200, 2100, 143, 312, now() - interval '3 hours'),
  (4, 'Shooting Dallas on 35mm film: a day at White Rock Lake', 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=1280&h=720&q=80', 754, 12300, 980, 64, 51, now() - interval '9 hours'),
  (5, 'The best tacos in Dallas, ranked', 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=1280&h=720&q=80', 611, 203000, 15400, 1240, 4300, now() - interval '1 day'),
  (11, 'REST to gRPC: how we cut p99 latency 40%', 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1280&h=720&q=80', 1512, 31500, 2400, 212, 870, now() - interval '1 day 6 hours'),
  (9, 'Reimers Ranch lead climbing, first send of the season', 'https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=1280&h=720&q=80', 338, 8700, 610, 38, 22, now() - interval '2 days'),
  (8, 'How I keep 60 houseplants alive in a Texas apartment', 'https://images.unsplash.com/photo-1463320726281-696a485928c7?auto=format&fit=crop&w=1280&h=720&q=80', 905, 76400, 5300, 410, 1200, now() - interval '3 days'),
  (10, 'Designing a Facebook clone in a day', 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1280&h=720&q=80', 1180, 19800, 1700, 156, 230, now() - interval '4 days'),
  (7, 'HackTX 2026: forming a team 10 minutes before the deadline', 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1280&h=720&q=80', 480, 5600, 420, 29, 18, now() - interval '5 days')
) as v(channel_id, title, thumbnail_url, duration_seconds, view_count, like_count, comment_count, share_count, created_at)
where not exists (select 1 from videos x where x.title = v.title);

insert into saved_posts (user_id, post_id, collection)
select 1, p.id, case when p.image_url is null then 'For later' else 'Inspiration' end
from posts p where p.author_id in (3, 5, 11) and p.author_id <> 1
on conflict do nothing;

insert into saved_posts (user_id, post_id, collection)
select 2, p.id, case when p.image_url is null then 'For later' else 'Inspiration' end
from posts p where p.author_id in (1, 4, 8)
on conflict do nothing;

insert into marketplace_saved (listing_id, user_id)
select m.id, 2 from marketplace_listings m where m.title in ('Mid-century accent chair', 'Monstera deliciosa, 3ft')
on conflict do nothing;

insert into marketplace_saved (listing_id, user_id)
select m.id, 1 from marketplace_listings m where m.title in ('Canon AE-1 film camera + 50mm', '27in LG 4K monitor')
on conflict do nothing;

insert into event_rsvps (event_id, user_id, status)
select e.id, 1, 'interested' from events e where e.title in ('HackUTD 2026 Kickoff', 'Deep Ellum Night Market')
on conflict do nothing;

-- profile agent: people who are NOT friends with Caleb (for Friend Requests / People You May Know)
insert into users (name, email, avatar_url, cover_url, bio, is_online) values
  ('Olivia Chen', 'olivia@example.com', 'https://i.pravatar.cc/300?img=44', 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1200&h=450&fit=crop&q=80', 'UX researcher. Austin, TX.', true),
  ('Jamal Wright', 'jamal@example.com', 'https://i.pravatar.cc/300?img=60', 'https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=1200&h=450&fit=crop&q=80', 'Data engineer by day, DJ by night.', false),
  ('Isabella Rossi', 'isabella@example.com', 'https://i.pravatar.cc/300?img=49', 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1200&h=450&fit=crop&q=80', 'Architecture student. Espresso enthusiast.', true),
  ('Kenji Tanaka', 'kenji@example.com', 'https://i.pravatar.cc/300?img=15', 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=450&fit=crop&q=80', 'Game dev. Unity + Rust.', false),
  ('Grace Kim', 'grace@example.com', 'https://i.pravatar.cc/300?img=29', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&h=450&fit=crop&q=80', 'Pianist. Marathon runner.', true),
  ('Ravi Menon', 'ravi@example.com', 'https://i.pravatar.cc/300?img=11', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&h=450&fit=crop&q=80', 'Cloud infra @ a startup you have not heard of.', false),
  ('Lucas Fernandez', 'lucas@example.com', 'https://i.pravatar.cc/300?img=57', 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&h=450&fit=crop&q=80', 'Soccer, salsa, software.', true),
  ('Emily Park', 'emily@example.com', 'https://i.pravatar.cc/300?img=20', 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=1200&h=450&fit=crop&q=80', 'Nursing student. Cat person.', false)
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
  ('Opening ceremony energy. 1,200 hackers in one room.', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=800&fit=crop&q=80', 31, interval '6 days'),
  ('Late-night debugging with the best team.', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&h=900&fit=crop&q=80', 8, interval '9 days'),
  ('Campus in the fall never gets old.', 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&h=800&fit=crop&q=80', 14, interval '13 days'),
  ('New desk setup. Finally cable-managed.', 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&h=800&fit=crop&q=80', 5, interval '20 days'),
  ('Weekend hike at Cedar Ridge.', 'https://images.unsplash.com/photo-1476231682828-37e571bc172f?w=1200&h=900&fit=crop&q=80', 19, interval '27 days'),
  ('Sponsor fair setup is done. Doors open at 9.', 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1200&h=800&fit=crop&q=80', 3, interval '34 days'),
  ('Coffee, code, repeat.', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&h=1200&fit=crop&q=80', 2, interval '41 days'),
  ('Throwback to our first hackathon as organizers.', 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=1200&h=800&fit=crop&q=80', 27, interval '60 days'),
  ('Dallas skyline from the Reunion Tower.', 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1200&h=800&fit=crop&q=80', 12, interval '75 days')
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

-- ---------- Messaging (idempotent) ----------
-- Group: HackUTD Organizers (Caleb 1, Priya 2, Marcus 3, Noah 7)
with c as (
  insert into conversations (is_group, name, created_by, created_at, updated_at)
  select true, 'HackUTD Organizers', 1, now() - interval '6 days', now() - interval '25 minutes'
  where not exists (select 1 from conversations where name = 'HackUTD Organizers')
  returning id
)
insert into conversation_members (conversation_id, user_id, role, joined_at)
select c.id, m.uid, case when m.uid = 1 then 'admin' else 'member' end, now() - interval '6 days'
from c cross join (values (1), (2), (3), (7)) as m(uid)
on conflict do nothing;

insert into messages (conversation_id, sender_id, body, created_at)
select c.id, m.sender, m.body, now() - m.ago
from conversations c
cross join (values
  (1, 'Hey team, kicking off planning for HackUTD 2027. Who is around this week?', 1, interval '5 days 4 hours'),
  (2, 'I am free Tuesday and Thursday evenings', 2, interval '5 days 3 hours 50 minutes'),
  (3, 'Thursday works for me', 3, interval '5 days 3 hours 40 minutes'),
  (7, 'Same, Thursday. Can we do the ECSW atrium?', 4, interval '5 days 3 hours 10 minutes'),
  (1, 'Thursday 7pm ECSW it is. I will book the room', 5, interval '5 days 2 hours'),
  (2, 'Sponsor update: we have verbal yeses from Toyota and State Farm 🎉', 6, interval '3 days 6 hours'),
  (3, 'LETS GO', 7, interval '3 days 5 hours 58 minutes'),
  (7, 'Huge. That covers food for both days', 8, interval '3 days 5 hours 50 minutes'),
  (1, 'Amazing work Priya. I will draft the tier sheet tonight', 9, interval '3 days 5 hours'),
  (2, 'Also need someone to own the check-in flow in HARP this year', 10, interval '1 day 2 hours'),
  (7, 'I can take that. Wallet passes too?', 11, interval '1 day 1 hour 55 minutes'),
  (2, 'Yes please, the Apple Wallet pass was the most requested thing last year', 12, interval '1 day 1 hour 50 minutes'),
  (3, 'I pushed the new judging rubric to the drive, take a look when you can', 13, interval '2 hours'),
  (1, 'On it 👀', 14, interval '1 hour 58 minutes'),
  (2, 'Reminder: venue walkthrough tomorrow at 10am, meet at the ECSW lobby', 15, interval '25 minutes')
) as m(sender, body, ord, ago)
where c.name = 'HackUTD Organizers' and not exists (select 1 from messages where conversation_id = c.id)
order by m.ord;

-- DM: Caleb <-> Priya
with c as (
  insert into conversations (is_group, created_by, created_at, updated_at)
  select false, 1, now() - interval '10 days', now() - interval '3 hours'
  where not exists (
    select 1 from conversations x
    where not x.is_group
      and exists (select 1 from conversation_members where conversation_id = x.id and user_id = 1)
      and exists (select 1 from conversation_members where conversation_id = x.id and user_id = 2)
      and (select count(*) from conversation_members where conversation_id = x.id) = 2)
  returning id
)
insert into conversation_members (conversation_id, user_id, role, joined_at)
select c.id, m.uid, 'member', now() - interval '10 days' from c cross join (values (1), (2)) as m(uid)
on conflict do nothing;

insert into messages (conversation_id, sender_id, body, created_at)
select x.id, m.sender, m.body, now() - m.ago
from conversations x
cross join (values
  (2, 'Did you see the recap post? 1,200 hackers 😭', 1, interval '2 days 5 hours'),
  (1, 'Yes!! Still cannot believe we pulled that off', 2, interval '2 days 4 hours 58 minutes'),
  (2, 'Coffee tomorrow to debrief? Northside at 9?', 3, interval '2 days 4 hours 50 minutes'),
  (1, 'Deal. I will bring the feedback forms', 4, interval '2 days 4 hours 40 minutes'),
  (2, 'Perfect', 5, interval '2 days 4 hours 39 minutes'),
  (1, 'Also can you send me the sponsor contact sheet when you get a sec', 6, interval '1 day 3 hours'),
  (2, 'Sent to your utd email', 7, interval '1 day 2 hours 30 minutes'),
  (1, 'Got it, thank you 🙏', 8, interval '1 day 2 hours 20 minutes'),
  (2, 'Are you going to the photography club meetup Saturday?', 9, interval '3 hours 5 minutes'),
  (1, 'Planning to! Sofia said she would bring the film camera', 10, interval '3 hours')
) as m(sender, body, ord, ago)
where not x.is_group
  and exists (select 1 from conversation_members where conversation_id = x.id and user_id = 1)
  and exists (select 1 from conversation_members where conversation_id = x.id and user_id = 2)
  and (select count(*) from conversation_members where conversation_id = x.id) = 2
  and not exists (select 1 from messages where conversation_id = x.id)
order by m.ord;

-- DM: Caleb <-> Daniel
with c as (
  insert into conversations (is_group, created_by, created_at, updated_at)
  select false, 5, now() - interval '4 days', now() - interval '1 day 4 hours'
  where not exists (
    select 1 from conversations x
    where not x.is_group
      and exists (select 1 from conversation_members where conversation_id = x.id and user_id = 1)
      and exists (select 1 from conversation_members where conversation_id = x.id and user_id = 5)
      and (select count(*) from conversation_members where conversation_id = x.id) = 2)
  returning id
)
insert into conversation_members (conversation_id, user_id, role, joined_at)
select c.id, m.uid, 'member', now() - interval '4 days' from c cross join (values (1), (5)) as m(uid)
on conflict do nothing;

insert into messages (conversation_id, sender_id, body, created_at)
select x.id, m.sender, m.body, now() - m.ago
from conversations x
cross join (values
  (5, 'Yo, that sunset pic from Klyde Warren was from your spot right?', 1, interval '1 day 5 hours'),
  (1, 'Haha yes, west lawn by the food trucks', 2, interval '1 day 4 hours 50 minutes'),
  (5, 'Taco run this weekend?', 3, interval '1 day 4 hours 10 minutes'),
  (1, 'Always 🌮', 4, interval '1 day 4 hours')
) as m(sender, body, ord, ago)
where not x.is_group
  and exists (select 1 from conversation_members where conversation_id = x.id and user_id = 1)
  and exists (select 1 from conversation_members where conversation_id = x.id and user_id = 5)
  and (select count(*) from conversation_members where conversation_id = x.id) = 2
  and not exists (select 1 from messages where conversation_id = x.id)
order by m.ord;

-- Group: Dallas Photography Club (Caleb 1, Sofia 4, Zoe 10)
with c as (
  insert into conversations (is_group, name, image_url, created_by, created_at, updated_at)
  select true, 'Dallas Photography Club', 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=200&h=200&fit=crop&q=80', 4, now() - interval '20 days', now() - interval '2 days'
  where not exists (select 1 from conversations where name = 'Dallas Photography Club')
  returning id
)
insert into conversation_members (conversation_id, user_id, role, joined_at)
select c.id, m.uid, case when m.uid = 4 then 'admin' else 'member' end, now() - interval '20 days'
from c cross join (values (1), (4), (10)) as m(uid)
on conflict do nothing;

insert into messages (conversation_id, sender_id, body, image_url, created_at)
select c.id, m.sender, m.body, m.img, now() - m.ago
from conversations c
cross join (values
  (4, 'Saturday meetup is on. White Rock Lake, golden hour, bring film if you have it', null, 1, interval '2 days 3 hours'),
  (10, 'I will bring the Pentax', null, 2, interval '2 days 2 hours 40 minutes'),
  (4, 'Test roll from last week', 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=900&h=600&fit=crop&q=80', 3, interval '2 days 2 hours 30 minutes'),
  (1, 'That grain is gorgeous', null, 4, interval '2 days 2 hours')
) as m(sender, body, img, ord, ago)
where c.name = 'Dallas Photography Club' and not exists (select 1 from messages where conversation_id = c.id)
order by m.ord;

-- read state: everyone has read everything except Caleb, who has 2 unread in HackUTD Organizers and 1 in Caleb<->Priya
update conversation_members cm
set last_read_message_id = sub.max_id
from (select conversation_id, max(id) as max_id from messages group by conversation_id) sub
where cm.conversation_id = sub.conversation_id and cm.last_read_message_id is null and cm.user_id <> 1;

update conversation_members cm
set last_read_message_id = sub.cutoff
from (
  select m.conversation_id,
         (select id from messages m2 where m2.conversation_id = m.conversation_id and m2.sender_id = 1 order by id desc limit 1) as cutoff
  from messages m group by m.conversation_id
) sub
where cm.conversation_id = sub.conversation_id and cm.user_id = 1 and cm.last_read_message_id is null;

-- ---------- Activities: Discover / mentors / entry points (idempotent, subagent E) ----------
insert into activity_profiles (user_id, weekly_active_days, primary_goal, schedule, with_whom, interest_suggestions_enabled, onboarding_step)
values (1, '1-2', 'Train for an event', '{mornings,weekends}', 'friends', true, 'done')
on conflict (user_id) do nothing;

insert into user_tags (user_id, tag, kind, origin, visibility) values
  (1, 'Running', 'activity', 'selected', 'friends'), (1, 'Train for an event', 'goal', 'selected', 'friends'), (1, 'Small group', 'style', 'selected', 'friends'),
  (2, 'Running', 'activity', 'selected', 'friends'), (2, 'Be consistent', 'goal', 'selected', 'friends'),
  (3, 'Lifting', 'activity', 'selected', 'friends'), (3, 'Get stronger', 'goal', 'selected', 'friends'),
  (4, 'Yoga', 'activity', 'selected', 'friends'), (4, 'Be consistent', 'goal', 'selected', 'friends'),
  (5, 'Running', 'activity', 'selected', 'friends'), (5, 'Get faster', 'goal', 'selected', 'friends'),
  (9, 'Climbing', 'activity', 'selected', 'friends'), (12, 'Running', 'activity', 'selected', 'friends'), (12, 'Be consistent', 'goal', 'selected', 'friends')
on conflict do nothing;

-- mentors who opted into the pool (identity hidden until they accept)
insert into mentor_offers (user_id, metric, from_value, to_value, weeks, consent, anonymous) values
  (5, '5k time', '29:10', '24:40', 12, '{"workouts":true,"steps":true,"heart":false,"sleep":false,"offerText":"Two easy runs, one tempo, one long run a week. Slowed the easy days way down and raced a parkrun every month."}'::jsonb, true),
  (3, 'Bench press', '135 lb', '225 lb', 16, '{"workouts":true,"steps":false,"heart":false,"sleep":false,"offerText":"Benched three times a week on a simple linear program, ate enough, and stopped maxing out every session."}'::jsonb, true),
  (4, 'Workouts per week', '1', '4', 10, '{"workouts":true,"steps":true,"heart":false,"sleep":true,"offerText":"Put yoga on the calendar like a meeting, kept sessions to 25 minutes, and did them with a friend on weekends."}'::jsonb, false),
  (6, 'Weekly distance', '8 km', '25 km', 14, '{"workouts":true,"steps":true,"heart":false,"sleep":false,"offerText":"Added one kilometre to the long run each week, kept everything else easy, and took a down week every fourth week."}'::jsonb, true),
  (8, 'Active days', '1', '5', 8, '{"workouts":true,"steps":true,"heart":false,"sleep":false,"offerText":"Started with a 10-minute walk after lunch every day, then swapped two of them for short gym sessions once it stuck."}'::jsonb, true),
  (10, '5k time', '34:30', '28:50', 16, '{"workouts":true,"steps":false,"heart":false,"sleep":false,"offerText":"Went from run-walk intervals to running the whole way, then added one session of 400 m repeats a week."}'::jsonb, true)
on conflict (user_id) do nothing;

-- fitness event this weekend with two friends going, plus a quest boss fight IRL on Sunday
insert into events (host_id, title, description, location, cover_url, starts_at, ends_at, interested_count, is_online, settings)
select * from (values
  (5, 'Katy Trail Saturday 5k Social Run', 'Easy-pace 5k, all levels. Coffee after at the Katy Trail Ice House.', 'Katy Trail, Dallas, TX', 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?auto=format&fit=crop&w=1200&h=675&q=80', date_trunc('week', now()) + interval '5 days 8 hours', date_trunc('week', now()) + interval '5 days 9 hours 30 minutes', 86, false, '{"fitness":true}'::jsonb),
  (2, 'Boss fight IRL: Sunday 9am run', 'Final run of the week for the Rally squad. Every move counts double.', 'White Rock Lake, Dallas, TX', 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1200&h=675&q=80', date_trunc('week', now()) + interval '6 days 9 hours', date_trunc('week', now()) + interval '6 days 10 hours 30 minutes', 23, false, '{"fitness":true,"bossFight":true}'::jsonb)
) v(host_id, title, description, location, cover_url, starts_at, ends_at, interested_count, is_online, settings)
where not exists (select 1 from events e where e.title = v.title);

insert into event_rsvps (event_id, user_id, status)
select e.id, u.user_id, 'going' from events e cross join (values (2), (3)) u(user_id)
where e.title in ('Katy Trail Saturday 5k Social Run', 'Boss fight IRL: Sunday 9am run')
on conflict do nothing;

-- friends with workouts this week (vault only; Discover reads them through ask(friendId, 'friends', ...))
insert into vault_events (user_id, source, external_id, kind, started_at, ended_at, distance_km, duration_min, trust)
select * from (values
  (2, 'manual', 'seed-priya-run-1', 'run', now() - interval '1 day 2 hours', now() - interval '1 day 1 hour 25 minutes', 5.2, 35, 'self_reported'),
  (3, 'manual', 'seed-marcus-lift-1', 'strength', now() - interval '20 hours', now() - interval '19 hours', null, 55, 'self_reported'),
  (5, 'manual', 'seed-daniel-run-1', 'run', now() - interval '2 days', now() - interval '2 days' + interval '42 minutes', 8.1, 42, 'photo'),
  (12, 'manual', 'seed-maya-run-1', 'run', now() - interval '6 hours', now() - interval '5 hours 30 minutes', 4.0, 30, 'self_reported')
) v(user_id, source, external_id, kind, started_at, ended_at, distance_km, duration_min, trust)
on conflict (source, external_id) do nothing;

-- Rally (subagent C): one active boss quest for the HackUTD Organizers group chat (users 1,2,3,7) with a few moves. Idempotent.
insert into quests (title, description, xp_reward, goal_type, goal_count, week_start, muse_meta, template, spec, conversation_id, created_by, status, starts_at, ends_at, boss_hp, boss_hp_left)
select 'Plank Goblin Week', 'Plank Goblin has camped out in the group chat. Every plank the squad logs this week chips away its HP; take it down before Sunday night.', 100, 'rally', 7,
  date_trunc('week', now())::date, '{"museUsed": false, "bossKind": "goblin", "buffed": false}'::jsonb, 'boss',
  jsonb_build_object(
    'template', 'boss', 'title', 'Plank Goblin Week',
    'story', 'Plank Goblin has camped out in the group chat. Every plank the squad logs this week chips away its HP; take it down before Sunday night.',
    'source', jsonb_build_object('kind', 'sentence', 'text', 'Make us do planks every day this week'),
    'startsAt', date_trunc('week', now()), 'endsAt', date_trunc('week', now()) + interval '7 days',
    'levels', jsonb_build_array(
      jsonb_build_object('day', 1, 'name', 'Warm-up Woods', 'exercises', jsonb_build_array(jsonb_build_object('name', 'Plank', 'seconds', 40))),
      jsonb_build_object('day', 2, 'name', 'Rep Ridge', 'exercises', jsonb_build_array(jsonb_build_object('name', 'Plank', 'seconds', 44))),
      jsonb_build_object('day', 3, 'name', 'Burn Bridge', 'exercises', jsonb_build_array(jsonb_build_object('name', 'Plank', 'seconds', 48))),
      jsonb_build_object('day', 4, 'name', 'Sweat Swamp', 'exercises', jsonb_build_array(jsonb_build_object('name', 'Plank', 'seconds', 52))),
      jsonb_build_object('day', 5, 'name', 'Grit Gorge', 'exercises', jsonb_build_array(jsonb_build_object('name', 'Plank', 'seconds', 56))),
      jsonb_build_object('day', 6, 'name', 'Final Climb', 'exercises', jsonb_build_array(jsonb_build_object('name', 'Plank', 'seconds', 60))),
      jsonb_build_object('day', 7, 'name', 'Boss Gate', 'exercises', jsonb_build_array(jsonb_build_object('name', 'Plank', 'seconds', 64)))),
    'boss', jsonb_build_object('name', 'Plank Goblin', 'hp', 2400),
    'handicaps', jsonb_build_array(
      jsonb_build_object('userId', 1, 'targetScale', 1.0, 'damageScale', 1.0, 'note', 'scaled to your recent weeks'),
      jsonb_build_object('userId', 2, 'targetScale', 0.8, 'damageScale', 1.25, 'note', 'scaled to your recent weeks'),
      jsonb_build_object('userId', 3, 'targetScale', 1.0, 'damageScale', 1.0, 'note', 'scaled to your recent weeks'),
      jsonb_build_object('userId', 7, 'targetScale', 1.2, 'damageScale', 0.8, 'note', 'scaled to your recent weeks')),
    'dares', jsonb_build_array(
      jsonb_build_object('id', 'somewhere-new', 'text', 'Work out somewhere you have never trained before.', 'bonus', 15, 'needsProof', true),
      jsonb_build_object('id', 'rain', 'text', 'Get a move in while it rains.', 'bonus', 20, 'needsProof', true),
      jsonb_build_object('id', 'bring-a-friend', 'text', 'Bring a friend from outside the group to one session.', 'bonus', 15, 'needsProof', false)),
    'rewards', jsonb_build_array(
      jsonb_build_object('tier', 'gear', 'label', 'Plank Goblin trophy for every avatar'),
      jsonb_build_object('tier', 'discount', 'label', '20% off at a partner gym (demo code)'),
      jsonb_build_object('tier', 'equipment', 'label', 'Sponsored yoga mat for the squad', 'equipmentTags', jsonb_build_array('mat', 'ab roller')))),
  1, 1, 'active', date_trunc('week', now()), date_trunc('week', now()) + interval '7 days', 2400, 2400
where not exists (select 1 from quests where title = 'Plank Goblin Week' and conversation_id = 1);

insert into quest_progress (quest_id, user_id, status, progress)
select q.id, cm.user_id, 'active', '{}'::jsonb from quests q join conversation_members cm on cm.conversation_id = q.conversation_id
where q.title = 'Plank Goblin Week' and q.conversation_id = 1
on conflict (quest_id, user_id) do nothing;

insert into quest_moves (quest_id, user_id, kind, damage, note, created_at)
select q.id, v.user_id, v.kind, v.damage, v.note, now() - v.ago
from quests q, (values
  (1, 'move', 33, 'Before coffee', interval '2 days 3 hours'),
  (2, 'move', 41, 'Kitchen floor plank', interval '2 days 1 hour'),
  (3, 'move', 49, null, interval '1 day 5 hours'),
  (1, 'move', 50, 'Held it a bit longer', interval '1 day 2 hours'),
  (2, 'dare', 56, 'Rooftop!', interval '20 hours'),
  (7, 'move', 26, null, interval '6 hours'),
  (2, 'move', 41, null, interval '3 hours')
) v(user_id, kind, damage, note, ago)
where q.title = 'Plank Goblin Week' and q.conversation_id = 1
  and not exists (select 1 from quest_moves m where m.quest_id = q.id);

update quest_moves m set dare_id = 'somewhere-new', proof_status = 'approved', proof_verdict = 'Rooftop plank, looks legit'
from quests q where m.quest_id = q.id and q.title = 'Plank Goblin Week' and q.conversation_id = 1 and m.kind = 'dare' and m.dare_id is null;

update quests q set boss_hp_left = greatest(0, boss_hp - coalesce((select sum(damage) from quest_moves m where m.quest_id = q.id), 0))
where q.title = 'Plank Goblin Week' and q.conversation_id = 1 and q.boss_hp_left = q.boss_hp;

insert into messages (conversation_id, sender_id, body, kind, payload, created_at)
select 1, 1, 'Caleb started Plank Goblin Week', 'quest_card', jsonb_build_object('questId', q.id, 'title', q.title, 'template', 'boss', 'bossName', 'Plank Goblin', 'bossHp', 2400), now() - interval '2 days 4 hours'
from quests q where q.title = 'Plank Goblin Week' and q.conversation_id = 1
  and not exists (select 1 from messages m where m.kind = 'quest_card' and (m.payload->>'questId')::int = q.id);

insert into messages (conversation_id, sender_id, body, kind, payload, created_at)
select 1, v.user_id, v.text, 'rally_game', jsonb_build_object('questId', q.id, 'event', v.event, 'userId', v.user_id, 'text', v.text, 'damage', v.damage), now() - v.ago
from quests q, (values
  (1, 'move', 'Caleb hit Plank Goblin for 33. 99% HP left.', 33, interval '2 days 3 hours'),
  (2, 'dare', 'Priya completed a dare (Work out somewhere you have never trained before.) and hits Plank Goblin for 56.', 56, interval '20 hours'),
  (2, 'critical', 'CRITICAL HIT! Priya smashes Plank Goblin for 41. 88% HP left.', 41, interval '3 hours')
) v(user_id, event, text, damage, ago)
where q.title = 'Plank Goblin Week' and q.conversation_id = 1
  and not exists (select 1 from messages m where m.kind = 'rally_game' and (m.payload->>'questId')::int = q.id);


-- ---- Activities (scope A): profiles, tags, demo week of vault events for users 1-6 (idempotent) ----

insert into activity_profiles (user_id, weekly_active_days, primary_goal, schedule, with_whom, onboarding_step)
values (1, '3-4', 'Be consistent', '{Mornings,Weekends}'::text[], 'friends', 'done'),
       (2, '5+', 'Train for an event', '{Mornings}'::text[], 'match', 'done'),
       (3, '1-2', 'Get started', '{Evenings}'::text[], 'friends', 'done'),
       (4, '3-4', 'Get stronger', '{Lunch,Evenings}'::text[], 'group', 'done'),
       (5, '1-2', 'Lose the phone and go outside', '{Weekends}'::text[], 'friends', 'done'),
       (6, '3-4', 'Get faster', '{Mornings,Evenings}'::text[], 'solo', 'done')
on conflict (user_id) do nothing;

insert into user_tags (user_id, tag, kind, origin, visibility, confirmed)
values (1, 'Running', 'activity', 'selected', 'friends', true),
       (1, 'Lifting', 'activity', 'selected', 'friends', true),
       (1, 'Be consistent', 'goal', 'selected', 'friends', true),
       (1, 'Mornings', 'style', 'selected', 'friends', true),
       (1, 'Small group', 'style', 'selected', 'friends', true),
       (2, 'Running', 'activity', 'selected', 'friends', true),
       (2, 'Cycling', 'activity', 'selected', 'friends', true),
       (2, 'Train for an event', 'goal', 'selected', 'friends', true),
       (2, 'Competitive', 'style', 'selected', 'friends', true),
       (3, 'Walking', 'activity', 'selected', 'friends', true),
       (3, 'Yoga', 'activity', 'selected', 'friends', true),
       (3, 'Get started', 'goal', 'selected', 'friends', true),
       (3, 'Chill', 'style', 'selected', 'friends', true),
       (3, 'Bad knee, low impact', 'constraint', 'selected', 'muse_only', true),
       (4, 'Lifting', 'activity', 'selected', 'friends', true),
       (4, 'HIIT', 'activity', 'selected', 'friends', true),
       (4, 'Get stronger', 'goal', 'selected', 'friends', true),
       (4, 'Big group', 'style', 'selected', 'friends', true),
       (5, 'Hiking', 'activity', 'selected', 'friends', true),
       (5, 'Walking', 'activity', 'selected', 'friends', true),
       (5, 'Lose the phone and go outside', 'goal', 'selected', 'friends', true),
       (5, 'Weekends', 'style', 'selected', 'friends', true),
       (6, 'Running', 'activity', 'selected', 'friends', true),
       (6, 'Swimming', 'activity', 'selected', 'friends', true),
       (6, 'Get faster', 'goal', 'selected', 'friends', true),
       (6, 'Solo', 'style', 'selected', 'friends', true)
on conflict (user_id, kind, tag) do nothing;

-- Caleb (user 1): heart rate is Muse-only for every other audience so the live redaction demo (§14) works out of the box.
insert into share_policies (user_id, category, audience, level)
values (1, 'heart', 'game_participants', 'muse_only'), (1, 'heart', 'friends', 'muse_only'), (1, 'heart', 'mentor_match', 'muse_only'), (1, 'heart', 'public', 'none'), (1, 'heart', 'only_me', 'exact')
on conflict (user_id, category, audience) do nothing;

insert into connections (user_id, source, status, tokens, connected_at)
values (1, 'mock', 'connected', '{"device":"Demo watch","seeded":true}'::jsonb, now()), (2, 'mock', 'connected', '{"device":"Demo watch","seeded":true}'::jsonb, now()), (3, 'mock', 'connected', '{"device":"Demo watch","seeded":true}'::jsonb, now()), (4, 'mock', 'connected', '{"device":"Demo watch","seeded":true}'::jsonb, now()), (5, 'mock', 'connected', '{"device":"Demo watch","seeded":true}'::jsonb, now()), (6, 'mock', 'connected', '{"device":"Demo watch","seeded":true}'::jsonb, now())
on conflict (user_id, source) do nothing;

insert into vault_events (user_id, source, external_id, kind, started_at, ended_at, distance_km, duration_min, steps, avg_hr, trust, display_scope)
select v.* from (values
  (1, 'mock', 'mock:1:run:d6', 'run', now() - interval '9483 minutes', now() - interval '9443 minutes', 5.19, 40, null, 142, 'device', 'normal'),
  (1, 'mock', 'mock:1:strength:d5', 'strength', now() - interval '8027 minutes', now() - interval '7978 minutes', null, 49, null, 146, 'device', 'normal'),
  (1, 'mock', 'mock:1:run:d3', 'run', now() - interval '5172 minutes', now() - interval '5127 minutes', 6.65, 45, null, 139, 'device', 'normal'),
  (1, 'mock', 'mock:1:walk:d2', 'walk', now() - interval '3734 minutes', now() - interval '3702 minutes', 4.25, 32, null, 106, 'device', 'normal'),
  (1, 'mock', 'mock:1:run:d0', 'run', now() - interval '829 minutes', now() - interval '783 minutes', 3.86, 46, null, 149, 'device', 'normal'),
  (1, 'mock', 'mock:1:steps:d0', 'steps', now() - interval '1275 minutes', now() - interval '-165 minutes', null, null, 6271, null, 'device', 'normal'),
  (1, 'mock', 'mock:1:sleep:d0', 'sleep', now() - interval '1365 minutes', now() - interval '1003 minutes', null, 362, null, null, 'device', 'normal'),
  (1, 'mock', 'mock:1:steps:d1', 'steps', now() - interval '2715 minutes', now() - interval '1275 minutes', null, null, 7182, null, 'device', 'normal'),
  (1, 'mock', 'mock:1:sleep:d1', 'sleep', now() - interval '2805 minutes', now() - interval '2380 minutes', null, 425, null, null, 'device', 'normal'),
  (1, 'mock', 'mock:1:steps:d2', 'steps', now() - interval '4155 minutes', now() - interval '2715 minutes', null, null, 9843, null, 'device', 'normal'),
  (1, 'mock', 'mock:1:sleep:d2', 'sleep', now() - interval '4245 minutes', now() - interval '3763 minutes', null, 482, null, null, 'device', 'normal'),
  (1, 'mock', 'mock:1:steps:d3', 'steps', now() - interval '5595 minutes', now() - interval '4155 minutes', null, null, 10034, null, 'device', 'normal'),
  (1, 'mock', 'mock:1:sleep:d3', 'sleep', now() - interval '5685 minutes', now() - interval '5324 minutes', null, 361, null, null, 'device', 'normal'),
  (1, 'mock', 'mock:1:steps:d4', 'steps', now() - interval '7035 minutes', now() - interval '5595 minutes', null, null, 6703, null, 'device', 'normal'),
  (1, 'mock', 'mock:1:sleep:d4', 'sleep', now() - interval '7125 minutes', now() - interval '6658 minutes', null, 467, null, null, 'device', 'normal'),
  (1, 'mock', 'mock:1:steps:d5', 'steps', now() - interval '8475 minutes', now() - interval '7035 minutes', null, null, 9955, null, 'device', 'normal'),
  (1, 'mock', 'mock:1:sleep:d5', 'sleep', now() - interval '8565 minutes', now() - interval '8189 minutes', null, 376, null, null, 'device', 'normal'),
  (1, 'mock', 'mock:1:steps:d6', 'steps', now() - interval '9915 minutes', now() - interval '8475 minutes', null, null, 8675, null, 'device', 'normal'),
  (1, 'mock', 'mock:1:sleep:d6', 'sleep', now() - interval '10005 minutes', now() - interval '9590 minutes', null, 415, null, null, 'device', 'normal')
) as v(user_id, source, external_id, kind, started_at, ended_at, distance_km, duration_min, steps, avg_hr, trust, display_scope)
where not exists (select 1 from vault_events e where e.user_id = v.user_id and e.source = v.source and e.external_id = v.external_id);

insert into vault_events (user_id, source, external_id, kind, started_at, ended_at, distance_km, duration_min, steps, avg_hr, trust, display_scope)
select v.* from (values
  (2, 'mock', 'mock:2:walk:d6', 'walk', now() - interval '9456 minutes', now() - interval '9413 minutes', 3.79, 43, null, 113, 'device', 'normal'),
  (2, 'mock', 'mock:2:yoga:d5', 'yoga', now() - interval '7315 minutes', now() - interval '7280 minutes', null, 35, null, 95, 'device', 'normal'),
  (2, 'mock', 'mock:2:walk:d3', 'walk', now() - interval '5175 minutes', now() - interval '5138 minutes', 3.1, 37, null, 116, 'device', 'normal'),
  (2, 'mock', 'mock:2:walk:d2', 'walk', now() - interval '3725 minutes', now() - interval '3678 minutes', 2.95, 47, null, 105, 'device', 'normal'),
  (2, 'mock', 'mock:2:strength:d0', 'strength', now() - interval '837 minutes', now() - interval '782 minutes', null, 55, null, 144, 'device', 'normal'),
  (2, 'mock', 'mock:2:steps:d0', 'steps', now() - interval '1275 minutes', now() - interval '-165 minutes', null, null, 6757, null, 'device', 'normal'),
  (2, 'mock', 'mock:2:sleep:d0', 'sleep', now() - interval '1365 minutes', now() - interval '877 minutes', null, 488, null, null, 'device', 'normal'),
  (2, 'mock', 'mock:2:steps:d1', 'steps', now() - interval '2715 minutes', now() - interval '1275 minutes', null, null, 5722, null, 'device', 'normal'),
  (2, 'mock', 'mock:2:sleep:d1', 'sleep', now() - interval '2805 minutes', now() - interval '2340 minutes', null, 465, null, null, 'device', 'normal'),
  (2, 'mock', 'mock:2:steps:d2', 'steps', now() - interval '4155 minutes', now() - interval '2715 minutes', null, null, 8972, null, 'device', 'normal'),
  (2, 'mock', 'mock:2:sleep:d2', 'sleep', now() - interval '4245 minutes', now() - interval '3741 minutes', null, 504, null, null, 'device', 'normal'),
  (2, 'mock', 'mock:2:steps:d3', 'steps', now() - interval '5595 minutes', now() - interval '4155 minutes', null, null, 10200, null, 'device', 'normal'),
  (2, 'mock', 'mock:2:sleep:d3', 'sleep', now() - interval '5685 minutes', now() - interval '5312 minutes', null, 373, null, null, 'device', 'normal'),
  (2, 'mock', 'mock:2:steps:d4', 'steps', now() - interval '7035 minutes', now() - interval '5595 minutes', null, null, 5127, null, 'device', 'normal'),
  (2, 'mock', 'mock:2:sleep:d4', 'sleep', now() - interval '7125 minutes', now() - interval '6673 minutes', null, 452, null, null, 'device', 'normal'),
  (2, 'mock', 'mock:2:steps:d5', 'steps', now() - interval '8475 minutes', now() - interval '7035 minutes', null, null, 10550, null, 'device', 'normal'),
  (2, 'mock', 'mock:2:sleep:d5', 'sleep', now() - interval '8565 minutes', now() - interval '8121 minutes', null, 444, null, null, 'device', 'normal'),
  (2, 'mock', 'mock:2:steps:d6', 'steps', now() - interval '9915 minutes', now() - interval '8475 minutes', null, null, 9451, null, 'device', 'normal'),
  (2, 'mock', 'mock:2:sleep:d6', 'sleep', now() - interval '10005 minutes', now() - interval '9625 minutes', null, 380, null, null, 'device', 'normal')
) as v(user_id, source, external_id, kind, started_at, ended_at, distance_km, duration_min, steps, avg_hr, trust, display_scope)
where not exists (select 1 from vault_events e where e.user_id = v.user_id and e.source = v.source and e.external_id = v.external_id);

insert into vault_events (user_id, source, external_id, kind, started_at, ended_at, distance_km, duration_min, steps, avg_hr, trust, display_scope)
select v.* from (values
  (3, 'mock', 'mock:3:ride:d6', 'ride', now() - interval '9470 minutes', now() - interval '9406 minutes', 22.3, 64, null, 143, 'device', 'normal'),
  (3, 'mock', 'mock:3:run:d5', 'run', now() - interval '8052 minutes', now() - interval '8004 minutes', 7.46, 48, null, 151, 'device', 'normal'),
  (3, 'mock', 'mock:3:strength:d3', 'strength', now() - interval '5141 minutes', now() - interval '5089 minutes', null, 52, null, 158, 'device', 'normal'),
  (3, 'mock', 'mock:3:ride:d2', 'ride', now() - interval '3718 minutes', now() - interval '3657 minutes', 13, 61, null, 155, 'device', 'normal'),
  (3, 'mock', 'mock:3:steps:d0', 'steps', now() - interval '1275 minutes', now() - interval '-165 minutes', null, null, 5532, null, 'device', 'normal'),
  (3, 'mock', 'mock:3:sleep:d0', 'sleep', now() - interval '1365 minutes', now() - interval '996 minutes', null, 369, null, null, 'device', 'normal'),
  (3, 'mock', 'mock:3:steps:d1', 'steps', now() - interval '2715 minutes', now() - interval '1275 minutes', null, null, 6123, null, 'device', 'normal'),
  (3, 'mock', 'mock:3:sleep:d1', 'sleep', now() - interval '2805 minutes', now() - interval '2297 minutes', null, 508, null, null, 'device', 'normal'),
  (3, 'mock', 'mock:3:steps:d2', 'steps', now() - interval '4155 minutes', now() - interval '2715 minutes', null, null, 10626, null, 'device', 'normal'),
  (3, 'mock', 'mock:3:sleep:d2', 'sleep', now() - interval '4245 minutes', now() - interval '3844 minutes', null, 401, null, null, 'device', 'normal'),
  (3, 'mock', 'mock:3:steps:d3', 'steps', now() - interval '5595 minutes', now() - interval '4155 minutes', null, null, 8782, null, 'device', 'normal'),
  (3, 'mock', 'mock:3:sleep:d3', 'sleep', now() - interval '5685 minutes', now() - interval '5290 minutes', null, 395, null, null, 'device', 'normal'),
  (3, 'mock', 'mock:3:steps:d4', 'steps', now() - interval '7035 minutes', now() - interval '5595 minutes', null, null, 6484, null, 'device', 'normal'),
  (3, 'mock', 'mock:3:sleep:d4', 'sleep', now() - interval '7125 minutes', now() - interval '6672 minutes', null, 453, null, null, 'device', 'normal'),
  (3, 'mock', 'mock:3:steps:d5', 'steps', now() - interval '8475 minutes', now() - interval '7035 minutes', null, null, 10504, null, 'device', 'normal'),
  (3, 'mock', 'mock:3:sleep:d5', 'sleep', now() - interval '8565 minutes', now() - interval '8093 minutes', null, 472, null, null, 'device', 'normal'),
  (3, 'mock', 'mock:3:steps:d6', 'steps', now() - interval '9915 minutes', now() - interval '8475 minutes', null, null, 9493, null, 'device', 'normal'),
  (3, 'mock', 'mock:3:sleep:d6', 'sleep', now() - interval '10005 minutes', now() - interval '9542 minutes', null, 463, null, null, 'device', 'normal')
) as v(user_id, source, external_id, kind, started_at, ended_at, distance_km, duration_min, steps, avg_hr, trust, display_scope)
where not exists (select 1 from vault_events e where e.user_id = v.user_id and e.source = v.source and e.external_id = v.external_id);

insert into vault_events (user_id, source, external_id, kind, started_at, ended_at, distance_km, duration_min, steps, avg_hr, trust, display_scope)
select v.* from (values
  (4, 'mock', 'mock:4:strength:d6', 'strength', now() - interval '9484 minutes', now() - interval '9429 minutes', null, 55, null, 160, 'device', 'normal'),
  (4, 'mock', 'mock:4:strength:d5', 'strength', now() - interval '8029 minutes', now() - interval '7971 minutes', null, 58, null, 157, 'device', 'normal'),
  (4, 'mock', 'mock:4:run:d3', 'run', now() - interval '5169 minutes', now() - interval '5143 minutes', 4.6, 26, null, 162, 'device', 'normal'),
  (4, 'mock', 'mock:4:yoga:d2', 'yoga', now() - interval '3003 minutes', now() - interval '2972 minutes', null, 31, null, 100, 'device', 'normal'),
  (4, 'mock', 'mock:4:strength:d0', 'strength', now() - interval '849 minutes', now() - interval '794 minutes', null, 55, null, 158, 'device', 'normal'),
  (4, 'mock', 'mock:4:steps:d0', 'steps', now() - interval '1275 minutes', now() - interval '-165 minutes', null, null, 6283, null, 'device', 'normal'),
  (4, 'mock', 'mock:4:sleep:d0', 'sleep', now() - interval '1365 minutes', now() - interval '987 minutes', null, 378, null, null, 'device', 'normal'),
  (4, 'mock', 'mock:4:steps:d1', 'steps', now() - interval '2715 minutes', now() - interval '1275 minutes', null, null, 5162, null, 'device', 'normal'),
  (4, 'mock', 'mock:4:sleep:d1', 'sleep', now() - interval '2805 minutes', now() - interval '2359 minutes', null, 446, null, null, 'device', 'normal'),
  (4, 'mock', 'mock:4:steps:d2', 'steps', now() - interval '4155 minutes', now() - interval '2715 minutes', null, null, 9954, null, 'device', 'normal'),
  (4, 'mock', 'mock:4:sleep:d2', 'sleep', now() - interval '4245 minutes', now() - interval '3869 minutes', null, 376, null, null, 'device', 'normal'),
  (4, 'mock', 'mock:4:steps:d3', 'steps', now() - interval '5595 minutes', now() - interval '4155 minutes', null, null, 11714, null, 'device', 'normal'),
  (4, 'mock', 'mock:4:sleep:d3', 'sleep', now() - interval '5685 minutes', now() - interval '5299 minutes', null, 386, null, null, 'device', 'normal'),
  (4, 'mock', 'mock:4:steps:d4', 'steps', now() - interval '7035 minutes', now() - interval '5595 minutes', null, null, 4623, null, 'device', 'normal'),
  (4, 'mock', 'mock:4:sleep:d4', 'sleep', now() - interval '7125 minutes', now() - interval '6633 minutes', null, 492, null, null, 'device', 'normal'),
  (4, 'mock', 'mock:4:steps:d5', 'steps', now() - interval '8475 minutes', now() - interval '7035 minutes', null, null, 9874, null, 'device', 'normal'),
  (4, 'mock', 'mock:4:sleep:d5', 'sleep', now() - interval '8565 minutes', now() - interval '8164 minutes', null, 401, null, null, 'device', 'normal'),
  (4, 'mock', 'mock:4:steps:d6', 'steps', now() - interval '9915 minutes', now() - interval '8475 minutes', null, null, 8665, null, 'device', 'normal'),
  (4, 'mock', 'mock:4:sleep:d6', 'sleep', now() - interval '10005 minutes', now() - interval '9561 minutes', null, 444, null, null, 'device', 'normal')
) as v(user_id, source, external_id, kind, started_at, ended_at, distance_km, duration_min, steps, avg_hr, trust, display_scope)
where not exists (select 1 from vault_events e where e.user_id = v.user_id and e.source = v.source and e.external_id = v.external_id);

insert into vault_events (user_id, source, external_id, kind, started_at, ended_at, distance_km, duration_min, steps, avg_hr, trust, display_scope)
select v.* from (values
  (5, 'mock', 'mock:5:run:d6', 'run', now() - interval '9457 minutes', now() - interval '9410 minutes', 3.64, 47, null, 142, 'device', 'normal'),
  (5, 'mock', 'mock:5:run:d5', 'run', now() - interval '8033 minutes', now() - interval '7991 minutes', 7.1, 42, null, 158, 'device', 'normal'),
  (5, 'mock', 'mock:5:walk:d3', 'walk', now() - interval '5170 minutes', now() - interval '5144 minutes', 3.59, 26, null, 109, 'device', 'normal'),
  (5, 'mock', 'mock:5:run:d2', 'run', now() - interval '3709 minutes', now() - interval '3677 minutes', 3.89, 32, null, 152, 'device', 'normal'),
  (5, 'mock', 'mock:5:run:d0', 'run', now() - interval '823 minutes', now() - interval '789 minutes', 5.66, 34, null, 161, 'device', 'normal'),
  (5, 'mock', 'mock:5:swim:d1', 'swim', now() - interval '2286 minutes', now() - interval '2244 minutes', 1.2, 42, null, 146, 'device', 'normal'),
  (5, 'mock', 'mock:5:steps:d0', 'steps', now() - interval '1275 minutes', now() - interval '-165 minutes', null, null, 7304, null, 'device', 'normal'),
  (5, 'mock', 'mock:5:sleep:d0', 'sleep', now() - interval '1365 minutes', now() - interval '869 minutes', null, 496, null, null, 'device', 'normal'),
  (5, 'mock', 'mock:5:steps:d1', 'steps', now() - interval '2715 minutes', now() - interval '1275 minutes', null, null, 9774, null, 'device', 'normal'),
  (5, 'mock', 'mock:5:sleep:d1', 'sleep', now() - interval '2805 minutes', now() - interval '2436 minutes', null, 369, null, null, 'device', 'normal'),
  (5, 'mock', 'mock:5:steps:d2', 'steps', now() - interval '4155 minutes', now() - interval '2715 minutes', null, null, 9127, null, 'device', 'normal'),
  (5, 'mock', 'mock:5:sleep:d2', 'sleep', now() - interval '4245 minutes', now() - interval '3811 minutes', null, 434, null, null, 'device', 'normal'),
  (5, 'mock', 'mock:5:steps:d3', 'steps', now() - interval '5595 minutes', now() - interval '4155 minutes', null, null, 9510, null, 'device', 'normal'),
  (5, 'mock', 'mock:5:sleep:d3', 'sleep', now() - interval '5685 minutes', now() - interval '5312 minutes', null, 373, null, null, 'device', 'normal'),
  (5, 'mock', 'mock:5:steps:d4', 'steps', now() - interval '7035 minutes', now() - interval '5595 minutes', null, null, 5088, null, 'device', 'normal'),
  (5, 'mock', 'mock:5:sleep:d4', 'sleep', now() - interval '7125 minutes', now() - interval '6692 minutes', null, 433, null, null, 'device', 'normal'),
  (5, 'mock', 'mock:5:steps:d5', 'steps', now() - interval '8475 minutes', now() - interval '7035 minutes', null, null, 9928, null, 'device', 'normal'),
  (5, 'mock', 'mock:5:sleep:d5', 'sleep', now() - interval '8565 minutes', now() - interval '8121 minutes', null, 444, null, null, 'device', 'normal'),
  (5, 'mock', 'mock:5:steps:d6', 'steps', now() - interval '9915 minutes', now() - interval '8475 minutes', null, null, 8605, null, 'device', 'normal'),
  (5, 'mock', 'mock:5:sleep:d6', 'sleep', now() - interval '10005 minutes', now() - interval '9529 minutes', null, 476, null, null, 'device', 'normal')
) as v(user_id, source, external_id, kind, started_at, ended_at, distance_km, duration_min, steps, avg_hr, trust, display_scope)
where not exists (select 1 from vault_events e where e.user_id = v.user_id and e.source = v.source and e.external_id = v.external_id);

insert into vault_events (user_id, source, external_id, kind, started_at, ended_at, distance_km, duration_min, steps, avg_hr, trust, display_scope)
select v.* from (values
  (6, 'mock', 'mock:6:yoga:d6', 'yoga', now() - interval '8751 minutes', now() - interval '8706 minutes', null, 45, null, 94, 'device', 'normal'),
  (6, 'mock', 'mock:6:walk:d5', 'walk', now() - interval '8031 minutes', now() - interval '7997 minutes', 3.97, 34, null, 116, 'device', 'normal'),
  (6, 'mock', 'mock:6:yoga:d3', 'yoga', now() - interval '4435 minutes', now() - interval '4404 minutes', null, 31, null, 101, 'device', 'normal'),
  (6, 'mock', 'mock:6:run:d2', 'run', now() - interval '3705 minutes', now() - interval '3670 minutes', 6, 35, null, 153, 'device', 'normal'),
  (6, 'mock', 'mock:6:steps:d0', 'steps', now() - interval '1275 minutes', now() - interval '-165 minutes', null, null, 3862, null, 'device', 'normal'),
  (6, 'mock', 'mock:6:sleep:d0', 'sleep', now() - interval '1365 minutes', now() - interval '989 minutes', null, 376, null, null, 'device', 'normal'),
  (6, 'mock', 'mock:6:steps:d1', 'steps', now() - interval '2715 minutes', now() - interval '1275 minutes', null, null, 6680, null, 'device', 'normal'),
  (6, 'mock', 'mock:6:sleep:d1', 'sleep', now() - interval '2805 minutes', now() - interval '2408 minutes', null, 397, null, null, 'device', 'normal'),
  (6, 'mock', 'mock:6:steps:d2', 'steps', now() - interval '4155 minutes', now() - interval '2715 minutes', null, null, 10512, null, 'device', 'normal'),
  (6, 'mock', 'mock:6:sleep:d2', 'sleep', now() - interval '4245 minutes', now() - interval '3839 minutes', null, 406, null, null, 'device', 'normal'),
  (6, 'mock', 'mock:6:steps:d3', 'steps', now() - interval '5595 minutes', now() - interval '4155 minutes', null, null, 12041, null, 'device', 'normal'),
  (6, 'mock', 'mock:6:sleep:d3', 'sleep', now() - interval '5685 minutes', now() - interval '5284 minutes', null, 401, null, null, 'device', 'normal'),
  (6, 'mock', 'mock:6:steps:d4', 'steps', now() - interval '7035 minutes', now() - interval '5595 minutes', null, null, 7316, null, 'device', 'normal'),
  (6, 'mock', 'mock:6:sleep:d4', 'sleep', now() - interval '7125 minutes', now() - interval '6713 minutes', null, 412, null, null, 'device', 'normal'),
  (6, 'mock', 'mock:6:steps:d5', 'steps', now() - interval '8475 minutes', now() - interval '7035 minutes', null, null, 8883, null, 'device', 'normal'),
  (6, 'mock', 'mock:6:sleep:d5', 'sleep', now() - interval '8565 minutes', now() - interval '8122 minutes', null, 443, null, null, 'device', 'normal'),
  (6, 'mock', 'mock:6:steps:d6', 'steps', now() - interval '9915 minutes', now() - interval '8475 minutes', null, null, 9968, null, 'device', 'normal'),
  (6, 'mock', 'mock:6:sleep:d6', 'sleep', now() - interval '10005 minutes', now() - interval '9522 minutes', null, 483, null, null, 'device', 'normal')
) as v(user_id, source, external_id, kind, started_at, ended_at, distance_km, duration_min, steps, avg_hr, trust, display_scope)
where not exists (select 1 from vault_events e where e.user_id = v.user_id and e.source = v.source and e.external_id = v.external_id);

-- Turf (scope D): one live game around the Katy Trail in the seeded group chat, so the map is not empty.
insert into games (conversation_id, game_type, settings, status, host_id, starts_at, ends_at)
select c.id, 'turf', '{"seed":"katy-trail","center":{"lat":32.8125,"lng":-96.7985},"radiusKm":1.5,"lengthDays":7,"arenaLabel":"Katy Trail"}'::jsonb, 'live', 1, now() - interval '2 hours', now() + interval '7 days'
from conversations c
where c.name = 'HackUTD Organizers' and not exists (select 1 from games g where g.settings ->> 'seed' = 'katy-trail')
order by c.id limit 1;

insert into game_invites (game_id, user_id, invited_by, status, color, location_consent_at, responded_at)
select g.id, v.user_id, 1, v.status, v.color, case when v.status = 'accepted' then now() - interval '2 hours' end, case when v.status = 'accepted' then now() - interval '2 hours' end
from games g cross join (values (1, 'accepted', '#1877F2'), (2, 'accepted', '#F02849'), (3, 'invited', '#31A24C')) v(user_id, status, color)
where g.settings ->> 'seed' = 'katy-trail'
on conflict do nothing;

insert into turf_cells (game_id, cell, owner_id, claimed_at)
select g.id, c.cell, 1, now() - interval '90 minutes'
from games g cross join unnest(array['8b26c864b982fff','8b26c864b995fff','8b26c864b991fff','8b26c864b99cfff','8b26c864b983fff','8b26c864b980fff','8b26c864b986fff','8b26c864b9b3fff','8b26c864b994fff','8b26c864b990fff','8b26c864b993fff','8b26c864b99efff','8b26c864b998fff','8b26c864b99dfff','8b26c864b98efff','8b26c864b981fff','8b26c864b985fff','8b26c864b984fff','8b26c864b9b1fff','8b26c864b9b0fff','8b26c864b9b2fff','8b26c86486c9fff','8b26c864b996fff','8b26c864b992fff','8b26c864bd6cfff','8b26c864bd6dfff','8b26c864b99afff','8b26c864b99bfff','8b26c864b999fff','8b26c864b98afff','8b26c864b988fff','8b26c864b98cfff','8b26c864b9aafff','8b26c864b9aefff','8b26c864b9a3fff','8b26c864b9a2fff','8b26c864b9b5fff','8b26c864bd61fff','8b26c864bd6efff','8b26c864bd68fff']) as c(cell)
where g.settings ->> 'seed' = 'katy-trail'
on conflict do nothing;

insert into turf_cells (game_id, cell, owner_id, claimed_at)
select g.id, c.cell, 2, now() - interval '60 minutes'
from games g cross join unnest(array['8b26c864ba65fff','8b26c864ba64fff','8b26c864ba60fff','8b26c864ba61fff','8b26c8649692fff','8b26c8649696fff','8b26c864bb4bfff','8b26c864bb4afff','8b26c864bb59fff','8b26c864ba66fff','8b26c864ba62fff','8b26c864ba63fff','8b26c864ba6efff','8b26c864ba6cfff','8b26c8649693fff','8b26c8649690fff','8b26c8649694fff','8b26c864bb49fff','8b26c864bb48fff','8b26c864bb4efff','8b26c864bb5dfff','8b26c864bb58fff','8b26c864bb5bfff','8b26c864ba75fff','8b26c864ba71fff','8b26c864ba44fff','8b26c864ba45fff','8b26c864ba6afff','8b26c864ba68fff','8b26c864ba6dfff','8b26c864969efff','8b26c8649691fff','8b26c8649695fff','8b26c86496b3fff','8b26c86496b2fff','8b26c864bb4dfff','8b26c864bb4cfff']) as c(cell)
where g.settings ->> 'seed' = 'katy-trail'
on conflict do nothing;

insert into messages (conversation_id, sender_id, body, kind, payload, created_at)
select g.conversation_id, 1, 'Caleb invited you to Turf: Katy Trail', 'rally_invite',
  jsonb_build_object('gameId', g.id, 'gameType', 'turf', 'title', 'Turf: Katy Trail', 'arenaLabel', 'Katy Trail', 'endsAt', to_char(g.ends_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
  now() - interval '2 hours'
from games g
where g.settings ->> 'seed' = 'katy-trail'
  and not exists (select 1 from messages m where m.kind = 'rally_invite' and (m.payload ->> 'gameId')::int = g.id);


-- a group that runs a weekly Rally (group header chip + Discover "Groups & clubs")
insert into quests (title, description, xp_reward, goal_type, goal_count, week_start, template, group_id, status, created_by, starts_at, ends_at)
select 'Climbing Community weekly streak', 'Three sessions on the wall this week. Every member move counts.', 150, 'rally_move', 3, date_trunc('week', now())::date, 'streak', g.id, 'active', 9, date_trunc('week', now()), date_trunc('week', now()) + interval '7 days'
from groups g where g.name = 'Texas Climbing Community' and not exists (select 1 from quests q where q.title = 'Climbing Community weekly streak');
