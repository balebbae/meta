/**
 * Game Master narration (§17.1). Text only ever mentions public facts: who moved, damage, hp left.
 * Ember writes the quip when configured (generous token cap: Ember low with 300 tokens returned empty);
 * otherwise a deterministic template. Never comments on bodies, health or why a handicap differs.
 */
import {MODELS, museConfigured, museJson} from '@/lib/muse/client';
import type {BossEvent} from '@/lib/rally/scoring';

export type NarrationInput = {event: BossEvent; actor: string; damage: number; hpLeft: number; hpMax: number; bossName: string; dareText?: string | null};

const first = (n: string) => n.split(' ')[0];

export function templateNarration(i: NarrationInput): string {
  const a = first(i.actor);
  const pct = Math.round((i.hpLeft / Math.max(1, i.hpMax)) * 100);
  switch (i.event) {
    case 'boss_down':
      return `${a} lands the final blow for ${i.damage}. ${i.bossName} is DOWN. Squad wins the week!`;
    case 'boss_low':
      return `${a} hits ${i.bossName} for ${i.damage}. It is wobbling at ${pct}% HP. Finish it!`;
    case 'critical':
      return `CRITICAL HIT! ${a} smashes ${i.bossName} for ${i.damage}. ${pct}% HP left.`;
    case 'level':
      return `${a} clears the level and hits ${i.bossName} for ${i.damage}. Next stretch of the map unlocked.`;
    default:
      return i.dareText ? `${a} completed a dare (${i.dareText}) and hits ${i.bossName} for ${i.damage}.` : `${a} hit ${i.bossName} for ${i.damage}. ${pct}% HP left.`;
  }
}

export async function narrate(i: NarrationInput): Promise<{text: string; museUsed: boolean}> {
  const fallback = templateNarration(i);
  if (!museConfigured()) return {text: fallback, museUsed: false};
  try {
    const out = await museJson<{quip: string}>({
      model: MODELS.ember,
      schemaName: 'gm_quip',
      schema: {type: 'object', properties: {quip: {type: 'string'}}, required: ['quip'], additionalProperties: false},
      effort: 'minimal',
      input: `You are the playful Game Master of a co-op fitness game. Write ONE sentence (max 22 words) narrating this moment. Facts you may use, nothing else: player "${first(i.actor)}", event "${i.event}", damage ${i.damage}, boss "${i.bossName}" at ${i.hpLeft}/${i.hpMax} HP${i.dareText ? `, dare "${i.dareText}"` : ''}. Rules: trash talk the boss, never the player; never mention bodies, weight, health, injuries, ability or why someone's score differs.`,
    });
    const quip = out.quip?.trim();
    return quip ? {text: quip.slice(0, 200), museUsed: true} : {text: fallback, museUsed: false};
  } catch {
    return {text: fallback, museUsed: false};
  }
}

/** Boss-down recap for the feed (§19 Feed). Names only members who completed >= 1 move. */
export async function recapText(i: {title: string; bossName: string; finishers: string[]; moves: number; days: number}): Promise<{text: string; museUsed: boolean}> {
  const names = i.finishers.map(first);
  const list = names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  const fallback = `Quest complete: ${i.title}. ${list || 'The squad'} took down ${i.bossName} with ${i.moves} moves over ${i.days} days. New quest drops Monday.`;
  if (!museConfigured()) return {text: fallback, museUsed: false};
  try {
    const out = await museJson<{post: string}>({
      model: MODELS.ember,
      schemaName: 'quest_recap',
      schema: {type: 'object', properties: {post: {type: 'string'}}, required: ['post'], additionalProperties: false},
      effort: 'minimal',
      input: `Write a 2-sentence upbeat Facebook post recapping a finished co-op fitness quest. Facts: quest "${i.title}", boss "${i.bossName}", players ${list || 'the squad'}, ${i.moves} moves over ${i.days} days. Only use these facts. No health, body or weight talk, no emojis spam (max 1).`,
    });
    return out.post?.trim() ? {text: out.post.trim().slice(0, 400), museUsed: true} : {text: fallback, museUsed: false};
  } catch {
    return {text: fallback, museUsed: false};
  }
}
