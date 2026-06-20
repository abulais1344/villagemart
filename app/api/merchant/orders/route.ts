import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getMerchantId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('merchant_session')?.value ?? null;
}

// GET /api/merchant/orders?status=pending
export async function GET(request: NextRequest) {
  const merchantId = await getMerchantId();
  if (!merchantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

  console.log('[merchant-orders] merchant:', merchantId, 'count:', orders?.length, 'error:', error?.message);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const orderList = orders ?? [];

  // Fetch order_items separately (no FK in schema cache)
  let orderItems: any[] = [];
  if (orderList.length > 0) {
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .in('order_id', orderList.map((o: any) => o.id));
    console.log('[merchant-orders] items:', items?.length, 'error:', itemsError?.message);
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
  const merchantId = await getMerchantId();
  if (!merchantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { orderId, status } = await request.json();
  if (!orderId || !status) {
    return NextResponse.json({ error: 'Missing orderId or status' }, { status: 400 });
  }

  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .eq('merchant_id', merchantId); // ensure merchant can only update their own orders

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
