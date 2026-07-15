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

      // Normalise: null or legacy single-object → array
      const subscriptions: any[] = Array.isArray(rider.push_subscription)
        ? rider.push_subscription
        : [rider.push_subscription];

      if (subscriptions.length === 0) return;

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

      const payload = JSON.stringify({
        title: '🛵 New Delivery!',
        body: `#${shortId} · ${storeName} → ${addressStr} · ₹${order.total_amount}`,
        data: { url: '/rider/orders' },
      });

      // Send to every registered device; a dead subscription never blocks the others
      await Promise.allSettled(
        subscriptions.map(sub =>
          webpush
            .sendNotification(sub as webpush.PushSubscription, payload)
            .catch(err => {
              console.error(`[notify-rider] push to ${sub.endpoint} failed:`, err?.statusCode ?? err);
            })
        )
      );
    } catch (err) {
      console.error('[notify-rider] unexpected error:', err);
    }
  })();

  return NextResponse.json({ ok: true });
}
