import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/favicon.ico'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets and internal next paths bypass auth
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    PUBLIC_PATHS.includes(pathname)
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = await verifySessionToken(token);

  // If unauthenticated and visiting pages, redirect to login
  if (!isAuthenticated) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
