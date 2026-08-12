import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const INDIAN_PHONE_RE = /^[6-9]\d{9}$/;

export async function GET(request: NextRequest) {
  const phone = request.nextUrl.searchParams.get('phone');
  if (!phone || !INDIAN_PHONE_RE.test(phone)) {
    return NextResponse.json({ error: 'Invalid phone' }, { status: 400 });
  }

  // Lightweight count-only path used by badge pollers (Header, HomePageClient)
  if (request.nextUrl.searchParams.get('count') === '1') {
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_phone', phone)
      .eq('is_read', false);
    return NextResponse.json({ unreadCount: count ?? 0 });
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, body, is_read, created_at')
    .eq('user_phone', phone)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const notifications = data ?? [];
  return NextResponse.json({
    notifications,
    unreadCount: notifications.filter(n => !n.is_read).length,
  });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { phone } = body;
  if (!phone || !INDIAN_PHONE_RE.test(phone)) {
    return NextResponse.json({ error: 'Invalid phone' }, { status: 400 });
  }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_phone', phone)
    .eq('is_read', false);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
