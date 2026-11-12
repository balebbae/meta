import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {getSessionUser} from '@/lib/auth';
import {getListing} from '@/lib/secondary-queries';
import {ListingDetail} from '@/components/pages/ListingDetail';

export const dynamic = 'force-dynamic';

export async function generateMetadata({params}: {params: Promise<{id: string}>}): Promise<Metadata> {
  const {id} = await params;
  const listing = await getListing(0, Number(id));
  return {title: listing ? `${listing.title} | Marketplace` : 'Marketplace | Facebook'};
}

export default async function ListingPage({params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  const user = await getSessionUser();
  const listing = await getListing(user?.id ?? 0, Number(id));
  if (!listing) notFound();
  return <ListingDetail listing={listing} />;
}
