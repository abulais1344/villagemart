import { NextRequest, NextResponse } from 'next/server';

const ADMIN_EMAIL    = process.env.ADMIN_DEV_USERNAME || 'admin@zupr.in';
const ADMIN_PASSWORD = process.env.ADMIN_DEV_PASSWORD || 'villagemart@2024';

export async function POST(request: NextRequest) {
  const body = await request.json();
  // Accept field as either "email" or "username" (form sends "username")
  const email    = (body.email ?? body.username ?? '') as string;
  const password = (body.password ?? '')               as string;

  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true, redirect: '/admin/dashboard' });
  response.cookies.set('admin_dev', ADMIN_PASSWORD, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 hours
  });

  return response;
}
