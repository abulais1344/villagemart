import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireRider } from '@/lib/auth-helpers';
import { sendWhatsAppNotification } from '@/lib/whatsapp';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/rider/orders — all orders assigned to this rider, newest first
export async function GET() {
  const auth = await requireRider();
  if (!auth.ok) return auth.response;
  const { riderId } = auth;

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('rider_id', riderId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const orderList = orders ?? [];

  let orderItems: any[] = [];
  if (orderList.length > 0) {
    const { data: items } = await supabase
      .from('order_items')
      .select('order_id, product_snapshot, quantity')
      .in('order_id', orderList.map((o: any) => o.id));
    orderItems = items ?? [];
  }

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
    store_name: o.merchant_id ? (merchantMap[o.merchant_id] ?? null) : null,
  }));

  return NextResponse.json({ orders: result });
}

// PATCH /api/rider/orders  body: { orderId, action: 'pickup' | 'deliver' }
export async function PATCH(request: NextRequest) {
  const auth = await requireRider();
  if (!auth.ok) return auth.response;
  const { riderId } = auth;

  const { orderId, action } = await request.json();
  if (!orderId || !action) {
    return NextResponse.json({ error: 'Missing orderId or action' }, { status: 400 });
  }

  const { data: order } = await supabase
    .from('orders')
    .select('id, rider_id, customer_phone, customer_name, total_amount, merchant_id')
    .eq('id', orderId)
    .single();

  if (!order || order.rider_id !== riderId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let update: Record<string, any>;
  let newStatus: string;

  if (action === 'pickup') {
    newStatus = 'out_for_delivery';
    update = { status: newStatus, picked_up_at: new Date().toISOString() };
  } else if (action === 'deliver') {
    newStatus = 'delivered';
    update = { status: newStatus, delivered_at: new Date().toISOString() };
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const { error } = await supabase.from('orders').update(update).eq('id', orderId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fire-and-forget customer notification
  ;(async () => {
    try {
      if (!order.customer_phone) return;

      let storeName: string | undefined;
      if (order.merchant_id) {
        const { data: merchant } = await supabase
          .from('merchants').select('store_name').eq('id', order.merchant_id).single();
        storeName = merchant?.store_name ?? undefined;
      }

      const shortId = orderId.slice(-6).toUpperCase();

      await sendWhatsAppNotification(
        order.customer_phone,
        newStatus,
        order.customer_name || 'Customer',
        shortId,
        storeName,
        order.total_amount,
      );

      const NOTIF: Record<string, { title: string; body: string }> = {
        out_for_delivery: { title: 'Out for Delivery 🛵', body: 'Your order is on the way!' },
        delivered:        { title: 'Order Delivered ✅',   body: 'Your order has been delivered. Enjoy!' },
      };
      const msg = NOTIF[newStatus];
      if (msg) {
        await supabase.from('notifications').insert({
          user_phone: order.customer_phone,
          type: 'order_update',
          title: msg.title,
          body: msg.body,
          order_id: orderId,
          is_read: false,
        });
      }
    } catch (err) {
      console.error('[rider] customer notification failed:', err);
    }
  })();

  return NextResponse.json({ success: true });
}
