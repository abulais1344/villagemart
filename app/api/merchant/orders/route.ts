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

const STATUS_NOTIFICATIONS: Record<string, { title: string; body: string }> = {
  preparing:        { title: 'Order Accepted! 🎉',  body: 'Your order has been accepted and is being prepared.' },
  ready:            { title: 'Order Ready 📦',       body: 'Your order is packed and ready for delivery.' },
  out_for_delivery: { title: 'Out for Delivery 🛵',  body: 'Your order is on the way!' },
  cancelled:        { title: 'Order Cancelled ❌',   body: 'Your order has been cancelled. Refund will be processed in 5-7 days.' },
};

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
    .eq('merchant_id', merchantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Insert in-app notification using service role (avoids RLS)
  const notif = STATUS_NOTIFICATIONS[status];
  if (notif) {
    const { data: order } = await supabase
      .from('orders')
      .select('customer_phone')
      .eq('id', orderId)
      .single();

    if (order?.customer_phone) {
      const shortId = orderId.slice(-6).toUpperCase();
      await supabase.from('notifications').insert({
        user_phone: order.customer_phone,
        type: 'order_update',
        title: notif.title,
        body: `Your order #${shortId} — ${notif.body}`,
        order_id: orderId,
        is_read: false,
      });
    }
  }

  return NextResponse.json({ success: true });
}
