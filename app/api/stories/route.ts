import {NextResponse, type NextRequest} from 'next/server';
import {badRequest, readJson, withUser} from '@/lib/api';
import {MAX_DATA_URL_LENGTH, isImageDataUrl} from '@/lib/image-upload';
import {createStory, listStories} from '@/lib/queries';

export async function GET() {
  return withUser(async () => NextResponse.json({stories: await listStories()}));
}

/** Body: {imageUrl} — an http(s) URL or a base64 image data URL from the client-side uploader. Stories expire after 24 h. */
export async function POST(req: NextRequest) {
  return withUser(async user => {
    const body = await readJson<{imageUrl?: string}>(req);
    const imageUrl = body?.imageUrl?.trim();
    if (!imageUrl) return badRequest('imageUrl is required');
    if (!/^https?:\/\/\S+$/i.test(imageUrl) && !isImageDataUrl(imageUrl as unknown)) {
      return badRequest(imageUrl.length > MAX_DATA_URL_LENGTH ? 'imageUrl is too large: photos must be under 400 KB' : 'imageUrl must be an http(s) URL or an image data URL');
    }
    const story = await createStory(user.id, imageUrl);
    return NextResponse.json({story}, {status: 201});
  });
}
