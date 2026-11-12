import {neon, type NeonQueryFunction} from '@neondatabase/serverless';

type Sql = NeonQueryFunction<false, false>;

let _sql: Sql | null = null;

export function getSql(): Sql {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  _sql = neon(url);
  return _sql;
}

/**
 * Tagged-template SQL client.
 * Lazily connects so `next build` / deploys can succeed before DATABASE_URL is set.
 * Usage: const rows = await sql`select * from users where id = ${id}`;
 */
export const sql: Sql = ((strings: TemplateStringsArray, ...values: unknown[]) =>
  getSql()(strings, ...(values as never[]))) as Sql;
