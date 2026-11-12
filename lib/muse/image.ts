import {getMuseClient, MODELS} from '@/lib/muse/client';

/** Generate badge/streak art via Muse Image. Returns a URL or b64 data URL when available. */
export async function generateBadgeArt(prompt: string): Promise<string> {
  const c = getMuseClient();
  const res = await c.images.generate({
    model: MODELS.image,
    prompt: `Simple flat social badge icon for a closeness app. ${prompt}. Soft blue (#0866FF) accent, no text, square.`,
    size: '512x512',
  });
  const first = res.data?.[0];
  if (first?.url) return first.url;
  if (first?.b64_json) return `data:image/png;base64,${first.b64_json}`;
  throw new Error('no image returned');
}
