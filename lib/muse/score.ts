import {MODELS, museJson} from '@/lib/muse/client';

export type ScoreInput = {
  actorName: string;
  friendName?: string;
  eventType: 'reaction' | 'comment' | 'voice_note' | 'friend_accept' | 'message' | 'quest';
  detail: string;
};

export type ScoreResult = {
  xp: number;
  reason: string;
  warmthLabel: string;
};

const schema = {
  type: 'object',
  properties: {
    xp: {type: 'integer', description: 'Closeness XP 1-25 for this single interaction'},
    reason: {type: 'string', description: 'Short reason shown to the user'},
    warmthLabel: {type: 'string', description: 'One-word warmth label e.g. Thoughtful'},
  },
  required: ['xp', 'reason', 'warmthLabel'],
  additionalProperties: false,
};

export async function scoreInteraction(input: ScoreInput): Promise<ScoreResult> {
  const result = await museJson<ScoreResult>({
    model: MODELS.ember,
    schemaName: 'closeness_score',
    schema,
    effort: 'minimal',
    input: `You score social interactions for a Facebook-like app that rewards bringing people closer.
Award XP 1-25. Prefer higher XP for voice notes, meaningful comments, and friend accepts; lower for generic likes.
Actor: ${input.actorName}
Friend: ${input.friendName ?? 'someone'}
Event: ${input.eventType}
Detail: ${input.detail}
Return JSON only.`,
  });
  return {
    xp: Math.max(1, Math.min(25, Math.round(result.xp))),
    reason: result.reason.slice(0, 200),
    warmthLabel: result.warmthLabel.slice(0, 40),
  };
}
