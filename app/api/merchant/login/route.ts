import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
  }

  const supabase = await createServiceClient();
  const { data: merchant } = await supabase
    .from('merchants')
    .select('id, store_name, status, portal_password')
    .eq('portal_username', username)
    .eq('status', 'approved')
    .single();

  if (!merchant || !(await bcrypt.compare(password, merchant.portal_password))) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('merchant_session', merchant.id, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 90, // 90 days; sliding refresh via middleware
  });

  return response;
}
