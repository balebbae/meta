import type {QuestState, LogMoveResult, QuestRow} from '@/lib/rally/queries';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {error?: string};
    throw new Error(err.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}
const post = (url: string, body?: unknown) => fetch(url, {method: 'POST', headers: {'content-type': 'application/json'}, body: body === undefined ? undefined : JSON.stringify(body)});

export type OkMove = Extract<LogMoveResult, {ok: true}>;

export const rallyApi = {
  state: (id: number) => fetch(`/api/quests/${id}/state`, {cache: 'no-store'}).then(r => json<QuestState>(r)),
  list: (conversationId?: number) => fetch(conversationId ? `/api/quests?conversationId=${conversationId}` : '/api/quests', {cache: 'no-store'}).then(r => json<{quests: QuestRow[]}>(r)),
  move: (id: number, body: {source: 'manual' | 'photo' | 'voice' | 'vault'; note?: string; image?: string | null; amount?: number | null}) => post(`/api/quests/${id}/moves`, body).then(r => json<OkMove>(r)),
  dare: (id: number, dareId: string, body: {image?: string | null; note?: string}) => post(`/api/quests/${id}/dares/${dareId}`, body).then(r => json<OkMove>(r)),
  fromSentence: (text: string, conversationId: number) => post('/api/games/from-sentence', {text, conversationId}).then(r => json<{quest: QuestRow; museUsed: boolean}>(r)),
  fromReel: (reelId: number, conversationId: number) => post('/api/games/from-reel', {reelId, conversationId}).then(r => json<{quest: QuestRow; museUsed: boolean}>(r)),
  claim: (rewardId: number) => post(`/api/rewards/${rewardId}/claim`).then(r => json<{reward: {id: number; status: string; code: string | null}}>(r)),
};

export function fileToDataUrl(file: File, max = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => reject(new Error('unreadable image'));
    img.src = url;
  });
}
