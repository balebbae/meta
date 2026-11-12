import {NextResponse} from 'next/server';
import {withUser} from '@/lib/api';

export async function GET() {
  return withUser(async () => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY ?? null;
    return NextResponse.json({publicKey});
  });
}
