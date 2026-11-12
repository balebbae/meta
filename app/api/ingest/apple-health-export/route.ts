import {NextResponse} from 'next/server';
import {badRequest, withUser} from '@/lib/api';
import {APPLE_EXPORT_CAP, ingestAppleExport} from '@/lib/activities/connectors/apple_health';

/** POST multipart {file: export.zip | export.xml}, capped at 5 MB (§5.2). */
export async function POST(req: Request) {
  return withUser(async user => {
    const len = Number(req.headers.get('content-length') ?? 0);
    if (len > APPLE_EXPORT_CAP + 4096) return badRequest('Export is larger than 5 MB. Export a shorter range or upload export.xml.');
    const form = (await req.formData()) as unknown as {get(name: string): File | string | null};
    const file = form.get('file');
    if (!file || typeof file === 'string') return badRequest('file required');
    if (file.size > APPLE_EXPORT_CAP) return badRequest('Export is larger than 5 MB. Export a shorter range or upload export.xml.');
    try {
      const result = await ingestAppleExport(user.id, Buffer.from(await file.arrayBuffer()), file.name);
      return NextResponse.json({ok: true, ...result});
    } catch (err) {
      return badRequest((err as Error).message);
    }
  });
}
