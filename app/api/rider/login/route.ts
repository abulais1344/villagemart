import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
  }

  const { data: rider } = await supabase
    .from('vm_riders')
    .select('id, name, is_active')
    .eq('portal_username', username)
    .eq('portal_password', password)
    .single();

  if (!rider || !rider.is_active) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('rider_session', rider.id, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
