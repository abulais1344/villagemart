import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireMerchant } from '@/lib/auth-helpers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: NextRequest) {
  const auth = await requireMerchant();
  if (!auth.ok) return auth.response;
  const { merchantId } = auth;

  const { token } = await request.json();
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  console.log('[fcm-token] updating merchantId:', merchantId);

  const { data, error } = await supabase
    .from('merchants')
    .update({ fcm_token: token })
    .eq('id', merchantId)
    .select('id, store_name, fcm_token');

  console.log('[fcm-token] update result — data:', JSON.stringify(data), 'error:', JSON.stringify(error));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, debug: { merchantId, rowsUpdated: data?.length ?? 0, rows: data } });
}
