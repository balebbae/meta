import {NextResponse, type NextRequest} from 'next/server';
import {withUser} from '@/lib/api';
import {searchUsers} from '@/lib/queries';

export async function GET(req: NextRequest) {
  return withUser(async () => {
    const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
    if (!q) return NextResponse.json({users: []});
    return NextResponse.json({users: await searchUsers(q)});
  });
}
