import {MODELS, museJson} from '@/lib/muse/client';

export type QuestDraft = {
  title: string;
  description: string;
  xpReward: number;
  goalType: 'comments' | 'reactions' | 'voice_notes' | 'friend_replies' | 'mixed';
  goalCount: number;
};

export type GenerateQuestsResult = {quests: QuestDraft[]};

const questSchema = {
  type: 'object',
  properties: {
    quests: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: {type: 'string'},
          description: {type: 'string'},
          xpReward: {type: 'integer'},
          goalType: {
            type: 'string',
            enum: ['comments', 'reactions', 'voice_notes', 'friend_replies', 'mixed'],
          },
          goalCount: {type: 'integer'},
        },
        required: ['title', 'description', 'xpReward', 'goalType', 'goalCount'],
        additionalProperties: false,
      },
    },
  },
  required: ['quests'],
  additionalProperties: false,
};

export async function generateWeeklyQuests(friendNames: string[]): Promise<QuestDraft[]> {
  const result = await museJson<GenerateQuestsResult>({
    model: MODELS.spark,
    schemaName: 'weekly_quests',
    schema: questSchema,
    effort: 'low',
    input: `Design 3 weekly closeness quests for a social app.
Friends the user often sees: ${friendNames.slice(0, 8).join(', ') || 'their friends'}
Quests should encourage real contact (comments, voice notes, checking in), not vanity likes.
xpReward between 30 and 100. goalCount between 1 and 5.`,
  });
  return result.quests.slice(0, 3).map(q => ({
    ...q,
    xpReward: Math.max(30, Math.min(100, q.xpReward)),
    goalCount: Math.max(1, Math.min(5, q.goalCount)),
    title: q.title.slice(0, 80),
    description: q.description.slice(0, 240),
  }));
}

export type VerifyResult = {completed: boolean; progressNote: string};

export async function verifyQuestCompletion(opts: {
  title: string;
  description: string;
  goalType: string;
  goalCount: number;
  evidence: string;
}): Promise<VerifyResult> {
  return museJson<VerifyResult>({
    model: MODELS.ember,
    schemaName: 'quest_verify',
    schema: {
      type: 'object',
      properties: {
        completed: {type: 'boolean'},
        progressNote: {type: 'string'},
      },
      required: ['completed', 'progressNote'],
      additionalProperties: false,
    },
    effort: 'minimal',
    input: `Did the user complete this quest?
Quest: ${opts.title} — ${opts.description}
Goal: ${opts.goalType} x${opts.goalCount}
Evidence: ${opts.evidence}`,
  });
}
