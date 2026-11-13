import {NextResponse} from 'next/server';
import {withUser} from '@/lib/api';
import {listConnections, publicConnection} from '@/lib/activities/connections';
import {getProfile, hasOnboarded} from '@/lib/activities/onboarding';
import {getPolicies} from '@/lib/activities/policies';
import {listTags} from '@/lib/activities/tags';
import {sql} from '@/lib/db';
import {parseHero} from '@/lib/kingdom/cast';

export async function GET() {
  return withUser(async user => {
    const [profile, tags, policies, connections, [me]] = await Promise.all([getProfile(user.id), listTags(user.id), getPolicies(user.id), listConnections(user.id), sql`select hero from users where id = ${user.id}`]);
    return NextResponse.json({profile, onboarded: hasOnboarded(profile), tags, policies, connections: connections.map(publicConnection), hero: parseHero(me?.hero)});
  });
}
