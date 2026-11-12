import {NextResponse} from 'next/server';
import {museConfigured} from '@/lib/muse/client';

export function requireMuse() {
  if (!museConfigured()) {
    return NextResponse.json({error: 'MODEL_API_KEY is not set'}, {status: 503});
  }
  return null;
}

export function requireDatabase() {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({error: 'DATABASE_URL is not set'}, {status: 503});
  }
  return null;
}
