import {NextResponse, type NextRequest} from 'next/server';
import {withUser} from '@/lib/api';
import {searchApp} from '@/lib/search';

export async function GET(req: NextRequest) {
  return withUser(async user => {
    const q = req.nextUrl.searchParams.get('q') ?? '';
    return NextResponse.json(await searchApp(user.id, q));
  });
}
