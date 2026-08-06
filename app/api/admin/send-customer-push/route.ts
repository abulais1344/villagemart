import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth-helpers';
import webpush from 'web-push';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PAYLOAD = JSON.stringify({
  title: 'Zupr',
  body: 'Order before 10 PM for quick delivery!',
  url: '/',
});

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  if (
    !process.env.VAPID_EMAIL ||
    !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    !process.env.VAPID_PRIVATE_KEY
  ) {
    return NextResponse.json({ error: 'VAPID env vars not configured' }, { status: 500 });
  }

  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const { data: users, error } = await supabase
    .from('vm_users')
    .select('id, push_subscription')
    .not('push_subscription', 'is', null);

  if (error) {
    console.error('[send-customer-push] query failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const total = users?.length ?? 0;
  console.log(`[send-customer-push] sending to ${total} subscriber(s)`);

  let succeeded = 0;
  let failed = 0;
  const failures: { userId: string; status: number | string }[] = [];

  await Promise.allSettled(
    (users ?? []).map(async (user) => {
      const sub = user.push_subscription as webpush.PushSubscription;
      try {
        await webpush.sendNotification(sub, PAYLOAD);
        console.log(`[send-customer-push] ✓ sent to user ${user.id}`);
        succeeded++;
      } catch (err: any) {
        const status: number | string = err?.statusCode ?? 'unknown';
        console.error(`[send-customer-push] ✗ user ${user.id} — status ${status}`);
        failed++;
        failures.push({ userId: user.id, status });

        // 410 Gone — subscription is dead, clean it up so it doesn't keep failing
        if (err?.statusCode === 410) {
          await supabase
            .from('vm_users')
            .update({ push_subscription: null })
            .eq('id', user.id);
          console.log(`[send-customer-push] cleaned stale subscription for user ${user.id}`);
        }
      }
    })
  );

  const summary = { total, succeeded, failed, failures };
  console.log('[send-customer-push] summary:', summary);
  return NextResponse.json(summary);
}
