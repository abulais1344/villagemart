import { NextRequest, NextResponse } from 'next/server';

// Re-stamp the cookie on every authenticated request so the 90-day window
// slides forward from "last activity" rather than "last login".
const SLIDING_MAX_AGE = 60 * 60 * 24 * 90;

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const riderSession = request.cookies.get('rider_session')?.value;
  if (riderSession) {
    response.cookies.set('rider_session', riderSession, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: SLIDING_MAX_AGE,
    });
  }

  const merchantSession = request.cookies.get('merchant_session')?.value;
  if (merchantSession) {
    response.cookies.set('merchant_session', merchantSession, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: SLIDING_MAX_AGE,
    });
  }

  return response;
}

export const config = {
  matcher: ['/rider/:path*', '/merchant/:path*'],
};
