import {NextResponse} from 'next/server';
import {badRequest, withUser} from '@/lib/api';
import {awardXp} from '@/lib/closeness-queries';
import {sql} from '@/lib/db';
import {requireDatabase, requireMuse} from '@/lib/muse/guard';
import {transcribeAudio} from '@/lib/muse/transcribe';

export async function POST(req: Request) {
  const museErr = requireMuse();
  if (museErr) return museErr;
  const dbErr = requireDatabase();
  if (dbErr) return dbErr;

  return withUser(async user => {
    // Node/DOM FormData typings conflict under this tsconfig — cast the runtime form.
    const form = (await req.formData()) as unknown as {
      get(name: string): File | string | null;
    };
    const file = form.get('file');
    const postIdRaw = form.get('postId');
    if (!file || typeof file === 'string') return badRequest('file required');

    const transcript = await transcribeAudio(file);
    const postId = postIdRaw && typeof postIdRaw === 'string' ? Number(postIdRaw) : null;

    const [note] = await sql`
      insert into voice_notes (author_id, post_id, transcript)
      values (${user.id}, ${postId}, ${transcript})
      returning id, transcript, created_at`;

    const scored = await awardXp({userId: user.id, sourceType: 'voice_note', sourceId: note.id as number});

    return NextResponse.json({ok: true, transcript, voiceNote: note, xp: 'blocked' in scored ? null : scored});
  });
}
