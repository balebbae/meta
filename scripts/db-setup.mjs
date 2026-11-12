// Creates tables and seeds demo data. Usage: DATABASE_URL=... node scripts/db-setup.mjs [--reset]
import {readFileSync} from 'node:fs';
import {neon} from '@neondatabase/serverless';
import 'dotenv/config';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
const sql = neon(url);

const reset = process.argv.includes('--reset');
if (reset) {
  await sql.query('drop table if exists user_details, notifications, stories, friendships, reactions, comments, posts, users cascade');
}
const [{seeded}] = await sql`select exists(select 1 from information_schema.tables where table_name = 'users') and (select count(*) from users) > 0 as seeded`.catch(() => [{seeded: false}]);
const files = seeded && !reset ? ['db/schema.sql'] : ['db/schema.sql', 'db/seed.sql'];
if (seeded && !reset) console.log('database already seeded; applying schema only (use --reset to reseed)');
for (const file of files) {
  const statements = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(Boolean);
  for (const s of statements) await sql.query(s);
  console.log(`applied ${file} (${statements.length} statements)`);
}
const [{count}] = await sql`select count(*)::int as count from posts`;
console.log(`posts: ${count}`);
