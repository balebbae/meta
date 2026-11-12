import {NextResponse} from 'next/server';
import {withUser} from '@/lib/api';
import {listConnections, publicConnection} from '@/lib/activities/connections';
import {getProfile, hasOnboarded} from '@/lib/activities/onboarding';
import {getPolicies} from '@/lib/activities/policies';
import {listTags} from '@/lib/activities/tags';

export async function GET() {
  return withUser(async user => {
    const [profile, tags, policies, connections] = await Promise.all([getProfile(user.id), listTags(user.id), getPolicies(user.id), listConnections(user.id)]);
    return NextResponse.json({profile, onboarded: hasOnboarded(profile), tags, policies, connections: connections.map(publicConnection)});
  });
}
