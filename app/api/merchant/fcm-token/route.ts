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

  const { data, error } = await supabase
    .from('merchants')
    .update({ fcm_token: token })
    .eq('id', merchantId)
    .select('id');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
