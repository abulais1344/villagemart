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

  // merchantId is always derived from the verified session cookie — never from the request
  const { merchantId } = auth;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [allRes, monthRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id, subtotal, commission_amount')
      .eq('merchant_id', merchantId)
      .neq('status', 'cancelled'),
    supabase
      .from('orders')
      .select('subtotal, commission_amount')
      .eq('merchant_id', merchantId)
      .neq('status', 'cancelled')
      .gte('created_at', monthStart),
  ]);

  const allOrders = allRes.data ?? [];
  const monthOrders = monthRes.data ?? [];

  const totalRevenue = allOrders.reduce(
    (s, o) => s + (o.subtotal ?? 0) - (o.commission_amount ?? 0),
    0,
  );
  const monthRevenue = monthOrders.reduce(
    (s, o) => s + (o.subtotal ?? 0) - (o.commission_amount ?? 0),
    0,
  );

  let topProducts: { name: string; quantity: number; revenue: number }[] = [];
  if (allOrders.length > 0) {
    const orderIds = allOrders.map(o => o.id);
    const { data: items } = await supabase
      .from('order_items')
      .select('product_snapshot, quantity, total_price')
      .in('order_id', orderIds);

    if (items) {
      const map = new Map<string, { quantity: number; revenue: number }>();
      for (const item of items) {
        const name: string = item.product_snapshot?.name ?? 'Unknown';
        const existing = map.get(name) ?? { quantity: 0, revenue: 0 };
        map.set(name, {
          quantity: existing.quantity + (item.quantity ?? 0),
          revenue: existing.revenue + (item.total_price ?? 0),
        });
      }
      topProducts = [...map.entries()]
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    }
  }

  return NextResponse.json({
    totalOrders: allOrders.length,
    totalRevenue,
    monthOrders: monthOrders.length,
    monthRevenue,
    topProducts,
  });
}
