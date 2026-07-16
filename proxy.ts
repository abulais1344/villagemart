import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PROTECTED_ROUTES: string[] = [];
const ROLE_ROUTES = [
  { prefix: '/merchant/', role: 'merchant' },
];

// 90 days — slides forward on every request (see rider and merchant sections below)
const SLIDING_MAX_AGE = 60 * 60 * 24 * 90;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin bypass — check cookie first
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin-login')) {
    const ADMIN_PASSWORD = process.env.ADMIN_DEV_PASSWORD || 'villagemart@2024';
    const adminCookie = request.cookies.get('admin_dev');
    if (adminCookie?.value && adminCookie.value === ADMIN_PASSWORD) {
      return NextResponse.next();
    }
    // No valid admin cookie — redirect to admin login
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/admin-login';
    return NextResponse.redirect(loginUrl);
  }

  // Rider login — public; /api/rider/* already excluded by matcher config
  if (pathname === '/rider-login') {
    return NextResponse.next();
  }

  // Rider portal — cookie-based auth, never Firebase/Supabase session
  if (pathname.startsWith('/rider/')) {
    const riderSession = request.cookies.get('rider_session');
    if (!riderSession?.value) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/rider-login';
      return NextResponse.redirect(loginUrl);
    }
    // Slide the expiry forward on every authenticated request
    const res = NextResponse.next();
    res.cookies.set('rider_session', riderSession.value, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: SLIDING_MAX_AGE,
    });
    return res;
  }

  // Merchant portal — cookie-based auth; slide the session expiry on each visit
  if (pathname.startsWith('/merchant/')) {
    const merchantSession = request.cookies.get('merchant_session');
    if (merchantSession?.value) {
      const res = NextResponse.next();
      res.cookies.set('merchant_session', merchantSession.value, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: SLIDING_MAX_AGE,
      });
      return res;
    }
    return NextResponse.next();
  }

  // These pages handle their own auth via localStorage — skip Supabase middleware
  if (
    pathname.startsWith('/merchant') ||
    pathname === '/merchant-login' ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/order-confirmation') ||
    pathname.startsWith('/orders') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/addresses')
  ) {
    return NextResponse.next();
  }

  const { supabaseResponse, user } = await updateSession(request);

  const isProtected = PROTECTED_ROUTES.some(r => pathname.startsWith(r));
  const roleRoute = ROLE_ROUTES.find(r => pathname.startsWith(r.prefix));

  if (isProtected || roleRoute) {
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/auth/login';
      return NextResponse.redirect(loginUrl);
    }
  }

  if (roleRoute && user) {
    const { data } = await (await import('@/lib/supabase/server')).createClient()
      .then(c => c.from('vm_users').select('role').eq('id', user.id).single());
    if (data?.role !== roleRoute.role) {
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = '/';
      return NextResponse.redirect(homeUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/|api/).*)',
  ],
};
