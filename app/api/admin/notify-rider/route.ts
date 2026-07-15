import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth-helpers';
import webpush from 'web-push';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { orderId, riderId } = await request.json();
  if (!orderId || !riderId) {
    return NextResponse.json({ error: 'Missing orderId or riderId' }, { status: 400 });
  }

  ;(async () => {
    try {
      const [{ data: rider }, { data: order }] = await Promise.all([
        supabase.from('vm_riders').select('push_subscription').eq('id', riderId).single(),
        supabase
          .from('orders')
          .select('id, customer_name, delivery_address, total_amount, merchant_id')
          .eq('id', orderId)
          .single(),
      ]);

      if (!rider?.push_subscription || !order) return;

      let storeName = 'Restaurant';
      if (order.merchant_id) {
        const { data: merchant } = await supabase
          .from('merchants').select('store_name').eq('id', order.merchant_id).single();
        if (merchant?.store_name) storeName = merchant.store_name;
      }

      const addr = order.delivery_address as any;
      const addressStr = [addr?.address, addr?.area].filter(Boolean).join(', ') || 'See order';
      const shortId = order.id.slice(-6).toUpperCase();

      if (
        process.env.VAPID_EMAIL &&
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
        process.env.VAPID_PRIVATE_KEY
      ) {
        webpush.setVapidDetails(
          process.env.VAPID_EMAIL,
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
          process.env.VAPID_PRIVATE_KEY
        );
      }

      await webpush.sendNotification(
        rider.push_subscription as webpush.PushSubscription,
        JSON.stringify({
          title: '🛵 New Delivery!',
          body: `#${shortId} · ${storeName} → ${addressStr} · ₹${order.total_amount}`,
          data: { url: '/rider/orders' },
        }),
      );
    } catch (err) {
      console.error('[notify-rider] push failed:', err);
    }
  })();

  return NextResponse.json({ ok: true });
}
