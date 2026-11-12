import {neon} from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

/** Tagged-template SQL client. Usage: const rows = await sql`select * from users where id = ${id}`; */
export const sql = neon(url);
