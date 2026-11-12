import {getMuseClient, MODELS} from '@/lib/muse/client';

/** Transcribe an audio File/Blob via Muse Voice. */
export async function transcribeAudio(file: File): Promise<string> {
  const c = getMuseClient();
  const result = await c.audio.transcriptions.create({
    file,
    model: MODELS.voice,
  });
  const text = (result as {text?: string}).text ?? '';
  if (!text.trim()) throw new Error('empty transcript');
  return text.trim();
}
