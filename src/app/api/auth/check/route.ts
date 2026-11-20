import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function GET() {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const valid = await verifySessionToken(token);
  return NextResponse.json({ authenticated: valid });
}
