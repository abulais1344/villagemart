import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('offers')
    .select('id, title, description, discount_type, discount_value, min_order_amount, max_discount')
    .eq('is_active', true)
    .eq('type', 'platform')
    .lte('starts_at', now)   // offer has already started
    .gte('ends_at', now)     // offer hasn't expired
    .order('discount_value', { ascending: false });

  if (error) {
    console.error('[customer/offers] Supabase error:', error.message, '| now:', now);
    return NextResponse.json({ offers: [], error: error.message });
  }

  console.log('[customer/offers] now:', now, '| found:', data?.length ?? 0);
  return NextResponse.json({ offers: data ?? [] });
}
