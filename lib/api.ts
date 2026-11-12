import {NextResponse} from 'next/server';
import {getSessionUser} from '@/lib/auth';
import type {User} from '@/lib/types';

export const unauthorized = () => NextResponse.json({error: 'Unauthorized'}, {status: 401});
export const notFound = () => NextResponse.json({error: 'Not found'}, {status: 404});
export const forbidden = () => NextResponse.json({error: 'Forbidden'}, {status: 403});
export const badRequest = (msg: string) => NextResponse.json({error: msg}, {status: 400});

/** Runs a handler with the signed-in user, or returns 401. */
export async function withUser(fn: (user: User) => Promise<Response>): Promise<Response> {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  return fn(user);
}

export async function readJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

export const AUDIENCES = ['public', 'friends', 'only_me'] as const;
export const REACTION_TYPES = ['like', 'love', 'care', 'haha', 'wow', 'sad', 'angry'] as const;
