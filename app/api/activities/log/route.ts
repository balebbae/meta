import {NextResponse} from 'next/server';
import {badRequest, readJson, withUser} from '@/lib/api';
import {manualEvent, type ManualLog} from '@/lib/activities/connectors/manual';
import {parseLog} from '@/lib/activities/log-parse';
import {insertVaultEvent} from '@/lib/activities/vault';
import type {EventKind} from '@/lib/activities/types';

const KINDS: EventKind[] = ['run', 'walk', 'ride', 'strength', 'yoga', 'swim', 'steps', 'other'];

type Body = {text?: string; log?: ManualLog; parseOnly?: boolean};

/**
 * Manual log (§5.2): {log} quick form, or {text} one sentence parsed by Spark (regex fallback).
 * {text, parseOnly: true} returns the parse for confirmation without saving. Always trust 'self_reported'; implausible values come back as `flags` (lib/activities/integrity.ts).
 */
export async function POST(req: Request) {
  return withUser(async user => {
    const body = await readJson<Body>(req);
    if (!body) return badRequest('Invalid JSON');
    let log: ManualLog | null = body.log ?? null;
    let usedMuse = false;
    if (!log && body.text?.trim()) {
      const parsed = await parseLog(body.text.trim());
      usedMuse = parsed.usedMuse;
      log = {
        kind: parsed.kind,
        distanceKm: parsed.distanceKm,
        durationMin: parsed.durationMin,
        steps: parsed.steps,
        startedAt: parsed.whenOffsetHours ? new Date(Date.now() + parsed.whenOffsetHours * 3_600_000).toISOString() : undefined,
        note: body.text.trim(),
      };
      if (body.parseOnly) {
        const {activity, compendiumCode, metMinutes} = parsed;
        return NextResponse.json({parsed: log, usedMuse, saved: false, ontology: activity ? {activity, compendiumCode, metMinutes} : null});
      }
    }
    if (!log || !KINDS.includes(log.kind)) return badRequest('kind required');
    if (!log.distanceKm && !log.durationMin && !log.steps && log.kind !== 'other') return badRequest('Add a distance, a duration or steps');
    const event = manualEvent(user.id, log);
    const saved = await insertVaultEvent(event);
    return NextResponse.json({saved: true, event: {...event, id: saved.id, duplicateOf: saved.duplicateOf, trust: saved.trust}, usedMuse, ...(saved.flags.length ? {flags: saved.flags} : {})});
  });
}
