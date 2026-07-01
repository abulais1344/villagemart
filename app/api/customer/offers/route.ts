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
    .select('id, title, description, discount_type, discount_value, min_order_amount, max_discount, first_order_only')
    .eq('is_active', true)
    .eq('type', 'platform')
    .lte('starts_at', now)
    .gte('ends_at', now)
    .order('discount_value', { ascending: false });

  if (error) {
    console.error('[customer/offers] Supabase error:', error);
    return NextResponse.json({ offers: [] });
  }

  return NextResponse.json({ offers: data ?? [] });
}
