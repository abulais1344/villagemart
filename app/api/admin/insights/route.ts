import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth-helpers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const since = new Date();
  since.setDate(since.getDate() - 180);
  const sinceISO = since.toISOString();

  // ── 1. Top dishes ────────────────────────────────────────────────────────
  const { data: deliveredOrders } = await supabase
    .from('orders')
    .select('id')
    .eq('status', 'delivered')
    .gte('created_at', sinceISO)
    .limit(5000);

  const deliveredIds = (deliveredOrders ?? []).map((o: any) => o.id);

  let topDishes: { name: string; times_ordered: number; total_qty: number }[] = [];

  if (deliveredIds.length > 0) {
    // Fetch in batches of 400 to stay inside URL length limits
    const BATCH = 400;
    const itemRows: any[] = [];
    for (let i = 0; i < deliveredIds.length; i += BATCH) {
      const { data } = await supabase
        .from('order_items')
        .select('product_snapshot, quantity')
        .in('order_id', deliveredIds.slice(i, i + BATCH))
        .limit(10000);
      itemRows.push(...(data ?? []));
    }

    const dishMap: Record<string, { times_ordered: number; total_qty: number }> = {};
    for (const item of itemRows) {
      const name: string = item.product_snapshot?.name ?? 'Unknown';
      if (!dishMap[name]) dishMap[name] = { times_ordered: 0, total_qty: 0 };
      dishMap[name].times_ordered++;
      dishMap[name].total_qty += item.quantity ?? 1;
    }
    topDishes = Object.entries(dishMap)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.times_ordered - a.times_ordered)
      .slice(0, 100);
  }

  // ── 2. Frequent customers ────────────────────────────────────────────────
  const { data: allDelivered } = await supabase
    .from('orders')
    .select('customer_phone, customer_name, total_amount')
    .eq('status', 'delivered')
    .gte('created_at', sinceISO)
    .limit(5000);

  const customerMap: Record<string, { name: string; order_count: number; lifetime_value: number }> = {};
  for (const o of allDelivered ?? []) {
    const phone: string = o.customer_phone ?? 'unknown';
    if (!customerMap[phone]) customerMap[phone] = { name: o.customer_name ?? '', order_count: 0, lifetime_value: 0 };
    customerMap[phone].order_count++;
    customerMap[phone].lifetime_value += o.total_amount ?? 0;
    // Prefer latest non-empty name
    if (o.customer_name && !customerMap[phone].name) customerMap[phone].name = o.customer_name;
  }
  const frequentCustomers = Object.entries(customerMap)
    .map(([phone, v]) => ({ phone, ...v }))
    .sort((a, b) => b.order_count - a.order_count)
    .slice(0, 100);

  // ── 3. Cart adds (grouped by product) ───────────────────────────────────
  // customer_id is now logged going forward; historical events mostly have null.
  // We count total add_to_cart events per product as a demand signal.
  const { data: cartEvents } = await supabase
    .from('vm_events')
    .select('metadata')
    .eq('event_type', 'add_to_cart')
    .gte('created_at', sinceISO)
    .limit(10000);

  const cartMap: Record<string, number> = {};
  for (const e of cartEvents ?? []) {
    const name: string = e.metadata?.product_name ?? 'Unknown';
    cartMap[name] = (cartMap[name] ?? 0) + 1;
  }
  const cartAdds = Object.entries(cartMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 100);

  return NextResponse.json({ topDishes, frequentCustomers, cartAdds });
}
