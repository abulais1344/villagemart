import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireMerchant } from '@/lib/auth-helpers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/merchant/orders?status=pending
export async function GET(request: NextRequest) {
  const auth = await requireMerchant();
  if (!auth.ok) return auth.response;
  const { merchantId } = auth;

  const status = request.nextUrl.searchParams.get('status');

  let query = supabase
    .from('orders')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data: orders, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const orderList = orders ?? [];

  let orderItems: any[] = [];
  if (orderList.length > 0) {
    const { data: items } = await supabase
      .from('order_items')
      .select('*')
      .in('order_id', orderList.map((o: any) => o.id));
    orderItems = items ?? [];
  }

  const ordersWithItems = orderList.map((o: any) => ({
    ...o,
    order_items: orderItems.filter((item: any) => item.order_id === o.id),
  }));

  return NextResponse.json({ orders: ordersWithItems });
}

// PATCH /api/merchant/orders  body: { orderId, status }
export async function PATCH(request: NextRequest) {
  const auth = await requireMerchant();
  if (!auth.ok) return auth.response;
  const { merchantId } = auth;

  const { orderId, status } = await request.json();
  if (!orderId || !status) {
    return NextResponse.json({ error: 'Missing orderId or status' }, { status: 400 });
  }

  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .eq('merchant_id', merchantId); // merchant can only update their own orders

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
