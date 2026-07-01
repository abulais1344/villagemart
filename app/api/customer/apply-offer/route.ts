import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { customer_id, cart_subtotal } = body as { customer_id?: string; cart_subtotal?: number };

  if (!customer_id || cart_subtotal == null) {
    return NextResponse.json({ offer: null });
  }

  const now = new Date().toISOString();

  // Fetch all active platform offers where cart qualifies
  const { data: offers, error } = await supabase
    .from('offers')
    .select('*')
    .eq('is_active', true)
    .eq('type', 'platform')
    .lte('starts_at', now)
    .gte('ends_at', now)
    .lte('min_order_amount', cart_subtotal);

  if (error) {
    console.error('[apply-offer] Supabase error:', error);
    return NextResponse.json({ offer: null });
  }

  if (!offers || offers.length === 0) {
    return NextResponse.json({ offer: null });
  }

  // Check if this customer has any paid orders (for first_order_only offers)
  const { count: paidOrderCount } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('customer_phone', customer_id)
    .eq('payment_status', 'paid');

  const isFirstOrder = (paidOrderCount ?? 0) === 0;

  // Filter out first_order_only offers if this isn't their first order
  const eligible = offers.filter((o: Record<string, unknown>) => {
    if (o.first_order_only && !isFirstOrder) return false;
    return true;
  });

  if (eligible.length === 0) {
    return NextResponse.json({ offer: null });
  }

  // Pick the offer with the highest effective discount
  const withDiscount = eligible.map((o: Record<string, unknown>) => {
    let discount = 0;
    if (o.discount_type === 'flat') {
      discount = Number(o.discount_value);
    } else {
      const pct = (cart_subtotal * Number(o.discount_value)) / 100;
      discount = o.max_discount ? Math.min(pct, Number(o.max_discount)) : pct;
    }
    return { offer: o, discount };
  });

  withDiscount.sort((a, b) => b.discount - a.discount);
  const best = withDiscount[0];

  return NextResponse.json({
    offer: best.offer,
    discount_amount: Math.round(best.discount),
  });
}
