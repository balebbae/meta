import {NextResponse} from 'next/server';
import {notFound, withUser} from '@/lib/api';
import {claimReward} from '@/lib/rally/queries';

type Ctx = {params: Promise<{id: string}>};

export async function POST(_req: Request, {params}: Ctx) {
  return withUser(async user => {
    const reward = await claimReward(Number((await params).id), user.id);
    if (!reward) return notFound();
    return NextResponse.json({reward});
  });
}
