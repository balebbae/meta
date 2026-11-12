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
