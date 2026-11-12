import {NextResponse, type NextRequest} from 'next/server';
import {sql} from '@/lib/db';
import {badRequest, readJson, withUser} from '@/lib/api';
import {getListing, listListings} from '@/lib/secondary-queries';
import {CONDITION_LABELS, MARKETPLACE_CATEGORIES} from '@/lib/secondary-data';

export async function GET(req: NextRequest) {
  return withUser(async user => {
    const category = req.nextUrl.searchParams.get('category') ?? undefined;
    return NextResponse.json({listings: await listListings(user.id, category)});
  });
}

export async function POST(req: NextRequest) {
  return withUser(async user => {
    const body = await readJson<{
      title?: string;
      priceCents?: number;
      category?: string;
      condition?: string;
      description?: string | null;
      imageUrl?: string;
      location?: string;
    }>(req);
    const title = body?.title?.trim();
    if (!title) return badRequest('title is required');
    const priceCents = Number(body?.priceCents);
    if (!Number.isFinite(priceCents) || priceCents < 0) return badRequest('priceCents must be a non-negative number');
    const category = MARKETPLACE_CATEGORIES.includes(body?.category ?? '') ? body!.category! : 'Classifieds';
    const condition = body?.condition && body.condition in CONDITION_LABELS ? body.condition : 'used_good';
    const imageUrl = body?.imageUrl?.trim();
    if (!imageUrl) return badRequest('imageUrl is required');
    const [row] = await sql`
      insert into marketplace_listings (seller_id, title, description, price_cents, category, condition, location, image_url)
      values (${user.id}, ${title}, ${body?.description?.trim() || null}, ${Math.round(priceCents)}, ${category}, ${condition}, ${body?.location?.trim() || 'Dallas, TX'}, ${imageUrl})
      returning id`;
    const listing = await getListing(user.id, row.id as number);
    return NextResponse.json({listing}, {status: 201});
  });
}
