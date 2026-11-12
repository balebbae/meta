/**
 * Thread recaps (§10.4). The text is built from the deterministic outing result only: who, how many
 * cells, whose trail was cut. No routes, no times, no positions, nothing from the vault.
 * Ember rewrites the line when configured; the template is the fallback ("Muse offline").
 */
import {MODELS, museConfigured, museJson} from '@/lib/muse/client';
import type {OutingResult} from './types';

const first = (n: string) => n.split(' ')[0] || n;
const cells = (n: number) => `${n} ${n === 1 ? 'cell' : 'cells'}`;
const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

export type RecapInput = {actor: string; result: OutingResult; names: Record<string, string>; ongoing?: boolean};

/** null = nothing changed on the map, so nothing is posted (an empty outing is nobody's business). */
export function templateRecap(i: RecapInput): string | null {
  const a = first(i.actor);
  const r = i.result;
  const name = (id: string | number) => first(i.names[String(id)] ?? 'a player');
  const takenFrom = Object.entries(r.taken).filter(([, n]) => n > 0).sort((x, y) => y[1] - x[1]);
  const takenTotal = takenFrom.reduce((s, [, n]) => s + n, 0);
  const victims = r.cutVictims.map(name);

  if (r.cutBy != null && r.gained === 0) return `${name(r.cutBy)} cut ${a}'s trail. That outing claims nothing.`;
  if (victims.length) {
    const fromVictims = r.cutVictims.reduce((s, v) => s + (r.taken[String(v)] ?? 0), 0);
    if (fromVictims > 0 && victims.length === 1) {
      const extra = r.gained > fromVictims ? ` ${a} claimed ${cells(r.gained)} in all.` : '';
      return `${a} cut ${victims[0]}'s trail and took ${cells(fromVictims)}.${extra}`;
    }
    if (r.gained > 0) return `${a} cut ${list(victims)}'s trail and claimed ${cells(r.gained)}.`;
    return `${a} cut ${list(victims)}'s trail. That outing claims nothing.`;
  }
  if (r.gained > 0) {
    const took = takenTotal > 0 ? `, ${takenTotal} of them from ${list(takenFrom.map(([id]) => name(id)))}` : '';
    const tail = i.ongoing ? ` ${a}'s trail is still open.` : '';
    return `${a} closed ${r.loops > 1 ? `${r.loops} loops` : 'a loop'} and claimed ${cells(r.gained)}${took}.${tail}`;
  }
  return null;
}

export async function narrateRecap(i: RecapInput): Promise<{text: string; museUsed: boolean} | null> {
  const fallback = templateRecap(i);
  if (!fallback) return null;
  if (!museConfigured()) return {text: fallback, museUsed: false};
  try {
    const out = await museJson<{line: string}>({
      model: MODELS.ember,
      schemaName: 'turf_recap',
      schema: {type: 'object', properties: {line: {type: 'string'}}, required: ['line'], additionalProperties: false},
      effort: 'minimal',
      input: `You narrate Turf, a territory game played by walking and running, in a group chat. Rewrite this result as ONE lively sentence (max 24 words). Keep every name and every number exactly as given and add no new facts: "${fallback}". Never mention speed, pace, time of day, routes, places, bodies, health or fitness.`,
    });
    const line = out.line?.trim();
    // Muse may only restyle: every number in the template must survive, or the template wins.
    const nums = fallback.match(/\d+/g) ?? [];
    if (!line || line.length > 240 || nums.some(n => !line.includes(n))) return {text: fallback, museUsed: false};
    return {text: line, museUsed: true};
  } catch {
    return {text: fallback, museUsed: false};
  }
}

export type FinalStanding = {userId: number; name: string; color: string; cells: number};

export function finalText(title: string, standings: FinalStanding[]): string {
  if (!standings.length || standings[0].cells === 0) return `Turf: ${title} is over. Nobody claimed any ground.`;
  const [w, second] = standings;
  const tie = second && second.cells === w.cells ? ` (tied on cells; ${first(w.name)} got there first)` : '';
  const rest = standings.slice(1).filter(s => s.cells > 0).map(s => `${first(s.name)} ${s.cells}`);
  return `Turf: ${title} is over. ${first(w.name)} wins with ${cells(w.cells)}${tie}.${rest.length ? ` ${list(rest)}.` : ''}`;
}
