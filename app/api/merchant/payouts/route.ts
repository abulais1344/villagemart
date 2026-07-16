import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireMerchant } from '@/lib/auth-helpers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const auth = await requireMerchant();
  if (!auth.ok) return auth.response;
  const { merchantId } = auth;

  // 35 days covers today + this week + this month views
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 35);

  const { data, error } = await supabase
    .from('orders')
    .select('subtotal, commission_amount, created_at')
    .eq('merchant_id', merchantId)
    .neq('status', 'cancelled')
    .gte('created_at', cutoff.toISOString())
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orders: data ?? [] });
}
