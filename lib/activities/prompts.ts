import {sql} from '@/lib/db';

export type PromptSurface = 'event_train' | 'group_rally' | 'composer_turf' | 'discover_interests' | 'intro';
type PromptState = {lastShownAt?: string; snoozedUntil?: string};
type Prompts = Partial<Record<PromptSurface, PromptState>>;

const WEEK_MS = 7 * 86_400_000;
const SNOOZE_MS = 30 * 86_400_000;

async function readPrompts(userId: number): Promise<Prompts> {
  const [row] = await sql`select prompts from activity_profiles where user_id = ${userId}`;
  return ((row?.prompts as Prompts) ?? {}) || {};
}

async function writePrompts(userId: number, prompts: Prompts) {
  await sql`insert into activity_profiles (user_id, prompts) values (${userId}, ${JSON.stringify(prompts)}::jsonb)
    on conflict (user_id) do update set prompts = excluded.prompts, updated_at = now()`;
}

/** §3: at most one prompt per surface per week; "Not now" snoozes the surface for 30 days. */
export async function canPrompt(userId: number, surface: PromptSurface): Promise<boolean> {
  const p = (await readPrompts(userId))[surface];
  if (!p) return true;
  const now = Date.now();
  if (p.snoozedUntil && new Date(p.snoozedUntil).getTime() > now) return false;
  if (p.lastShownAt && now - new Date(p.lastShownAt).getTime() < WEEK_MS) return false;
  return true;
}

export async function allowedSurfaces(userId: number, surfaces: PromptSurface[]): Promise<Record<string, boolean>> {
  const prompts = await readPrompts(userId);
  const out: Record<string, boolean> = {};
  const now = Date.now();
  for (const s of surfaces) {
    const p = prompts[s];
    out[s] = !p || !((p.snoozedUntil && new Date(p.snoozedUntil).getTime() > now) || (p.lastShownAt && now - new Date(p.lastShownAt).getTime() < WEEK_MS));
  }
  return out;
}

export async function markPrompt(userId: number, surface: PromptSurface, action: 'shown' | 'snooze') {
  const prompts = await readPrompts(userId);
  const cur = prompts[surface] ?? {};
  if (action === 'shown') cur.lastShownAt = new Date().toISOString();
  else cur.snoozedUntil = new Date(Date.now() + SNOOZE_MS).toISOString();
  prompts[surface] = cur;
  await writePrompts(userId, prompts);
  return prompts;
}
