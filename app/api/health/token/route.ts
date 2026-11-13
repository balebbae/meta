import {NextResponse} from 'next/server';
import {withUser} from '@/lib/api';
import {issueHealthToken} from '@/lib/health';
import {requireDatabase} from '@/lib/muse/guard';

export async function POST() {
  const dbErr = requireDatabase();
  if (dbErr) return dbErr;
  return withUser(async user => {
    const token = await issueHealthToken(user.id);
    return NextResponse.json({token, expiresIn: 600});
  });
}
