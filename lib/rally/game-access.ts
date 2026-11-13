import {sql} from '@/lib/db';
import {isMember} from '@/lib/messaging-queries';

/** Chat members only: returns the game's conversation id when the viewer is in it, else null (callers 404). */
export async function memberOfGame(table: 'mirror_matches' | 'swim_journeys', id: number, userId: number): Promise<number | null> {
  if (!Number.isInteger(id) || id <= 0) return null;
  const [row] = table === 'mirror_matches' ? await sql`select conversation_id from mirror_matches where id = ${id}` : await sql`select conversation_id from swim_journeys where id = ${id}`;
  if (!row) return null;
  const conv = Number(row.conversation_id);
  return (await isMember(conv, userId)) ? conv : null;
}
