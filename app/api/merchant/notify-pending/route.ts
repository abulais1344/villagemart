import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

// Called by merchant portal (every 60s) and Vercel cron (every 1 min).
// Finds orders pending > 1 min → repeat push.
// Finds orders pending > 3 min → WhatsApp alert to admin.
export async function GET(req: NextRequest) {
  // Auth: Vercel cron sends CRON_SECRET; portal sends merchant_session cookie.
  // If CRON_SECRET env is set we enforce it for non-cookie requests.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const hasCookie = req.cookies.get('merchant_session')?.value;
    const authHeader = req.headers.get('authorization');
    if (!hasCookie && authHeader !== `Bearer ${cronSecret}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const now              = new Date();
  const oneMinuteAgo    = new Date(now.getTime() - 60_000).toISOString();
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60_000).toISOString();

  const { data: pendingOrders, error } = await supabase
    .from('orders')
    .select('id, total_amount, customer_name, created_at, notified_pending_at, merchants(store_name, push_subscription, phone)')
    .eq('status', 'pending')
    .lt('created_at', oneMinuteAgo);

  if (error) {
    console.error('notify-pending DB error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!pendingOrders?.length) {
    return Response.json({ checked: true, pending: 0 });
  }

  for (const order of pendingOrders) {
    const merchant   = (order as any).merchants;
    const ageMs      = now.getTime() - new Date(order.created_at).getTime();
    const ageMinutes = Math.floor(ageMs / 60_000);
    const orderId    = order.id.slice(-6).toUpperCase();

    // Repeat push notification to merchant
    if (merchant?.push_subscription && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      webpush
        .sendNotification(
          merchant.push_subscription,
          JSON.stringify({
            title: `⚠️ Order Waiting ${ageMinutes}min!`,
            body:  `Order #${orderId} • ₹${order.total_amount} • Please accept!`,
          })
        )
        .catch(err => console.error('Repeat push failed:', err.message));
    }

    // Admin WhatsApp alert after 3 minutes — deduplicated: only if never sent or last sent >30 min ago
    const notifiedAt = (order as any).notified_pending_at;
    const wasDue = ageMs > 180_000;
    const cooldownPassed = !notifiedAt || notifiedAt < thirtyMinutesAgo;

    if (
      wasDue &&
      cooldownPassed &&
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.ADMIN_WHATSAPP_NUMBER
    ) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const twilio = require('twilio')(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        await twilio.messages.create({
          from: process.env.TWILIO_WHATSAPP_FROM,
          to:   `whatsapp:+${process.env.ADMIN_WHATSAPP_NUMBER}`,
          body:
            `⚠️ URGENT: Order #${orderId} from ${merchant?.store_name ?? 'unknown store'} ` +
            `has been pending for ${ageMinutes} minutes!\n` +
            `Customer: ${order.customer_name ?? 'unknown'}\n` +
            `Amount: ₹${order.total_amount}\n` +
            `Please contact merchant immediately!`,
        });
        // Mark notified so we don't spam again for 30 minutes
        await supabase
          .from('orders')
          .update({ notified_pending_at: now.toISOString() })
          .eq('id', order.id);
      } catch (err: any) {
        console.error('Admin WhatsApp failed:', err.message);
      }
    }
  }

  return Response.json({ checked: true, pending: pendingOrders.length });
}
