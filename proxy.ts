import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PROTECTED_ROUTES: string[] = [];
const ROLE_ROUTES = [
  { prefix: '/merchant/', role: 'merchant' },
];

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
