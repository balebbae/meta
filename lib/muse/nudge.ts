import {MODELS, museJson} from '@/lib/muse/client';

export type NudgeInput = {
  recipientName: string;
  actorName: string;
  context: string;
};

export type NudgeResult = {
  message: string;
  tone: string;
};

const schema = {
  type: 'object',
  properties: {
    message: {
      type: 'string',
      description: 'Notification copy under 120 chars, warm not spammy',
    },
    tone: {type: 'string', description: 'e.g. warm, playful, grateful'},
  },
  required: ['message', 'tone'],
  additionalProperties: false,
};

export async function generateNudge(input: NudgeInput): Promise<NudgeResult> {
  const result = await museJson<NudgeResult>({
    model: MODELS.ember,
    schemaName: 'closeness_nudge',
    schema,
    effort: 'minimal',
    input: `Write a short in-app notification that helps friends feel closer.
Recipient: ${input.recipientName}
Actor: ${input.actorName}
Context: ${input.context}
No emojis. No hashtags. Sound human.`,
  });
  return {
    message: result.message.slice(0, 160),
    tone: result.tone.slice(0, 40),
  };
}
