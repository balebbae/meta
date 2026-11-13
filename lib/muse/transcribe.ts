import {MODELS} from '@/lib/muse/client';

/** Transcribe a mono 16/24 kHz PCM WAV via Muse Voice (`POST /v1/asr/transcribe`; the OpenAI-style audio path does not exist on api.meta.ai). */
export async function transcribeAudio(file: Blob): Promise<string> {
  const apiKey = process.env.MODEL_API_KEY?.trim();
  if (!apiKey) throw new Error('MODEL_API_KEY is not set');
  const fd = new FormData();
  fd.append('request', new Blob([JSON.stringify({model: MODELS.voice, audioEncoding: 'WAV', mode: 'PUSH_TO_TALK'})], {type: 'application/json'}));
  fd.append('audio', file, 'note.wav');
  const res = await fetch('https://api.meta.ai/v1/asr/transcribe', {method: 'POST', headers: {authorization: `Bearer ${apiKey}`, accept: 'application/json'}, body: fd});
  if (!res.ok) throw new Error(`Muse Voice ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const text = ((await res.json()) as {transcript?: string}).transcript ?? '';
  if (!text.trim()) throw new Error('empty transcript');
  return text.trim();
}
