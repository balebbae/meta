import {NextResponse} from 'next/server';
import {withUser} from '@/lib/api';
import {listStories} from '@/lib/queries';

export async function GET() {
  return withUser(async () => NextResponse.json({stories: await listStories()}));
}
