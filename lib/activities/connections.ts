import {sql} from '@/lib/db';
import type {ConnectorId} from '@/lib/activities/types';

export type ConnectionStatus = 'connected' | 'pending' | 'revoked' | 'error';
export type Connection = {id: number; userId: number; source: ConnectorId; status: ConnectionStatus; tokens: Record<string, unknown>; externalUserId: string | null; connectedAt: string | null};

function map(r: Record<string, unknown>): Connection {
  return {
    id: Number(r.id),
    userId: Number(r.user_id),
    source: r.source as ConnectorId,
    status: r.status as ConnectionStatus,
    tokens: (r.tokens as Record<string, unknown> | null) ?? {},
    externalUserId: (r.external_user_id as string | null) ?? null,
    connectedAt: r.connected_at ? String(r.connected_at) : null,
  };
}

export async function listConnections(userId: number): Promise<Connection[]> {
  const rows = await sql`select * from connections where user_id = ${userId} order by connected_at desc nulls last`;
  return rows.map(map);
}

export async function getConnection(userId: number, source: ConnectorId): Promise<Connection | null> {
  const rows = await sql`select * from connections where user_id = ${userId} and source = ${source}`;
  return rows[0] ? map(rows[0]) : null;
}

export async function findConnectionByExternalUser(source: ConnectorId, externalUserId: string): Promise<Connection | null> {
  const rows = await sql`select * from connections where source = ${source} and external_user_id = ${externalUserId} and status = 'connected' limit 1`;
  return rows[0] ? map(rows[0]) : null;
}

/** Tokens are stored as jsonb; never returned to the browser (see /api/activities/profile). */
export async function upsertConnection(userId: number, source: ConnectorId, patch: {status?: ConnectionStatus; tokens?: Record<string, unknown>; externalUserId?: string | null}): Promise<Connection> {
  const [row] = await sql`
    insert into connections (user_id, source, status, tokens, external_user_id, connected_at)
    values (${userId}, ${source}, ${patch.status ?? 'pending'}, ${JSON.stringify(patch.tokens ?? {})}, ${patch.externalUserId ?? null}, now())
    on conflict (user_id, source) do update set
      status = coalesce(${patch.status ?? null}, connections.status),
      tokens = case when ${patch.tokens ? 1 : 0} = 1 then ${JSON.stringify(patch.tokens ?? {})}::jsonb else connections.tokens end,
      external_user_id = coalesce(${patch.externalUserId ?? null}, connections.external_user_id),
      connected_at = case when ${patch.status ?? ''} = 'connected' then now() else connections.connected_at end
    returning *`;
  return map(row);
}

export async function revokeConnection(userId: number, source: ConnectorId): Promise<void> {
  await sql`update connections set status = 'revoked', tokens = '{}'::jsonb where user_id = ${userId} and source = ${source}`;
}

/** Public shape for the browser: no tokens. */
export function publicConnection(c: Connection): {source: ConnectorId; status: ConnectionStatus; connectedAt: string | null; externalUserId: string | null; hasIngestToken: boolean; lastSync: string | null} {
  return {source: c.source, status: c.status, connectedAt: c.connectedAt, externalUserId: c.externalUserId, hasIngestToken: Boolean(c.tokens.ingest_token), lastSync: (c.tokens.last_sync as string | undefined) ?? null};
}
