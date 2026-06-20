import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();

  const validUsername = process.env.ADMIN_DEV_USERNAME;
  const validPassword = process.env.ADMIN_DEV_PASSWORD;

  if (!validUsername || !validPassword) {
    return NextResponse.json({ error: 'Dev credentials not configured' }, { status: 500 });
  }

  if (username !== validUsername || password !== validPassword) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('admin_dev', 'true', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    // No maxAge — session cookie that expires when browser closes
  });

  return response;
}
