import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth-helpers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const date = request.nextUrl.searchParams.get('date');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date — expected YYYY-MM-DD' }, { status: 400 });
  }

  // Convert IST date boundary to UTC:
  // e.g. 2026-07-02 IST → 2026-07-01T18:30:00Z … 2026-07-02T18:29:59Z
  const [y, m, d] = date.split('-').map(Number);
  const startUTC = new Date(Date.UTC(y, m - 1, d - 1, 18, 30, 0));
  const endUTC   = new Date(Date.UTC(y, m - 1, d,     18, 29, 59));

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, order_number, created_at, customer_name, customer_phone, merchant_id, subtotal, delivery_charge, discount_amount, commission_amount, total_amount')
    .eq('payment_status', 'paid')
    .gte('created_at', startUTC.toISOString())
    .lte('created_at', endUTC.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const orderList = orders ?? [];

  // Item counts per order
  let itemCounts: Record<string, number> = {};
  if (orderList.length > 0) {
    const { data: items } = await supabase
      .from('order_items')
      .select('order_id, quantity')
      .in('order_id', orderList.map(o => o.id));

    for (const item of items ?? []) {
      itemCounts[item.order_id] = (itemCounts[item.order_id] ?? 0) + (item.quantity ?? 1);
    }
  }

  // Merchant names
  const merchantIds = [...new Set(orderList.map(o => o.merchant_id).filter(Boolean))] as string[];
  let merchantMap: Record<string, string> = {};
  if (merchantIds.length > 0) {
    const { data: merchants } = await supabase
      .from('merchants')
      .select('id, store_name')
      .in('id', merchantIds);
    merchantMap = Object.fromEntries((merchants ?? []).map(m => [m.id, m.store_name ?? '']));
  }

  const result = orderList.map(o => ({
    id: o.id,
    order_number: o.order_number ?? null,
    created_at: o.created_at,
    customer_name: o.customer_name,
    customer_phone: o.customer_phone,
    merchant_name: o.merchant_id ? (merchantMap[o.merchant_id] ?? null) : null,
    item_count: itemCounts[o.id] ?? 0,
    subtotal: o.subtotal ?? 0,
    delivery_charge: o.delivery_charge ?? 0,
    discount_amount: o.discount_amount ?? 0,
    commission_amount: o.commission_amount ?? 0,
    total_amount: o.total_amount ?? 0,
    _isParcel: false,
  }));

  // Also fetch delivered parcel orders for this day
  const { data: parcelData } = await supabase
    .from('parcel_orders')
    .select('id, merchant_id, customer_name, customer_phone, items, subtotal, delivery_charge, commission_amount, created_at')
    .eq('status', 'delivered')
    .gte('created_at', startUTC.toISOString())
    .lte('created_at', endUTC.toISOString())
    .order('created_at', { ascending: true });

  // Extend merchantMap with any parcel merchant IDs not already fetched
  const parcelMerchantIds = [...new Set((parcelData ?? []).map((o: any) => o.merchant_id).filter(Boolean))] as string[];
  const missingIds = parcelMerchantIds.filter(id => !merchantMap[id]);
  if (missingIds.length > 0) {
    const { data: extraMerchants } = await supabase
      .from('merchants').select('id, store_name').in('id', missingIds);
    for (const m of extraMerchants ?? []) merchantMap[m.id] = m.store_name ?? '';
  }

  const parcelResult = (parcelData ?? []).map((o: any) => {
    const sub = o.subtotal ?? 0;
    const dc = o.delivery_charge ?? 0;
    const itemCount = (o.items ?? []).reduce((s: number, i: any) => s + (i.quantity ?? 1), 0);
    return {
      id: o.id,
      order_number: null,
      created_at: o.created_at,
      customer_name: o.customer_name,
      customer_phone: o.customer_phone,
      merchant_name: o.merchant_id ? (merchantMap[o.merchant_id] ?? null) : null,
      item_count: itemCount,
      subtotal: sub,
      delivery_charge: dc,
      discount_amount: 0,
      commission_amount: o.commission_amount ?? 0,
      total_amount: sub + dc,
      _isParcel: true,
    };
  });

  const combined = [...result, ...parcelResult]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return NextResponse.json({ orders: combined });
}
