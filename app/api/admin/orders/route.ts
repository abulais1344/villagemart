import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { sendWhatsAppNotification, statusMessages } from '@/lib/whatsapp';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  if (cookieStore.get('admin_dev')?.value !== 'true') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const status = request.nextUrl.searchParams.get('status');
  const limit = parseInt(request.nextUrl.searchParams.get('limit') ?? '500');

  let query = supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data: orders, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const orderList = orders ?? [];

  // Fetch order_items separately — no FK in schema cache
  let orderItems: any[] = [];
  if (orderList.length > 0) {
    const { data: items } = await supabase
      .from('order_items')
      .select('*')
      .in('order_id', orderList.map((o: any) => o.id));
    orderItems = items ?? [];
  }

  // Fetch merchant store names
  const merchantIds = [...new Set(orderList.map((o: any) => o.merchant_id).filter(Boolean))] as string[];
  let merchantMap: Record<string, string> = {};
  if (merchantIds.length > 0) {
    const { data: merchants } = await supabase
      .from('merchants')
      .select('id, store_name')
      .in('id', merchantIds);
    merchantMap = Object.fromEntries((merchants ?? []).map((m: any) => [m.id, m.store_name]));
  }

  const result = orderList.map((o: any) => ({
    ...o,
    order_items: orderItems.filter((i: any) => i.order_id === o.id),
    merchant: o.merchant_id ? { store_name: merchantMap[o.merchant_id] ?? null } : null,
  }));

  return NextResponse.json({ orders: result });
}

export async function PATCH(request: NextRequest) {
  const cookieStore = await cookies();
  if (cookieStore.get('admin_dev')?.value !== 'true') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { orderId, status } = await request.json();
  if (!orderId || !status) {
    return NextResponse.json({ error: 'Missing orderId or status' }, { status: 400 });
  }

  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const IN_APP_NOTIFICATIONS: Record<string, { title: string; body: string }> = {
    accepted:         { title: 'Order Accepted! 🎉',  body: 'Your order has been accepted and is being prepared.' },
    out_for_delivery: { title: 'Out for Delivery 🛵', body: 'Your order is on the way!' },
    delivered:        { title: 'Order Delivered ✅',   body: 'Your order has been delivered. Enjoy!' },
    cancelled:        { title: 'Order Cancelled ❌',   body: 'Your order has been cancelled. Refund in 5-7 days.' },
    ready:            { title: 'Order Ready 📦',       body: 'Your order is ready for delivery.' },
  };

  // Fire-and-forget: WhatsApp + in-app notification (share one customer_phone fetch)
  (async () => {
    try {
      const { data: order } = await supabase
        .from('orders')
        .select('customer_phone')
        .eq('id', orderId)
        .single();

      if (order?.customer_phone) {
        if (statusMessages[status]) {
          await sendWhatsAppNotification(order.customer_phone, statusMessages[status]);
        }
        const msg = IN_APP_NOTIFICATIONS[status];
        if (msg) {
          await supabase.from('notifications').insert({
            user_phone: order.customer_phone,
            type: 'order_update',
            title: msg.title,
            body: msg.body,
            is_read: false,
          });
        }
      }
    } catch (err) {
      console.error('[notification] failed:', err);
    }
  })();

  return NextResponse.json({ success: true });
}
