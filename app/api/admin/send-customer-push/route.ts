import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth-helpers';
import webpush from 'web-push';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DEFAULT_TITLE = 'Zupr';
const DEFAULT_BODY = 'Order before 10 PM for quick delivery!';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const [countRes, historyRes, trackingRes] = await Promise.all([
    supabase
      .from('vm_users')
      .select('id', { count: 'exact', head: true })
      .not('push_subscription', 'is', null),
    supabase
      .from('vm_events')
      .select('id, created_at, metadata')
      .eq('event_type', 'admin_push_broadcast')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('vm_events')
      .select('event_type, metadata')
      .in('event_type', ['push_received', 'push_clicked'])
      .order('created_at', { ascending: false })
      .limit(2000),
  ]);

  const tracking: Record<string, { received: number; clicked: number }> = {};
  for (const evt of trackingRes.data ?? []) {
    const bid = evt.metadata?.broadcast_id as string | undefined;
    if (!bid) continue;
    if (!tracking[bid]) tracking[bid] = { received: 0, clicked: 0 };
    if (evt.event_type === 'push_received') tracking[bid].received++;
    if (evt.event_type === 'push_clicked') tracking[bid].clicked++;
  }

  return NextResponse.json({
    subscriberCount: countRes.count ?? 0,
    history: historyRes.data ?? [],
    tracking,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const title: string = body.title?.trim() || DEFAULT_TITLE;
  const msgBody: string = body.body?.trim() || DEFAULT_BODY;
  const auth = await requireAdmin(req);
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

  const broadcastId = crypto.randomUUID();

  let succeeded = 0;
  let failed = 0;
  const failures: { userId: string; status: number | string }[] = [];

  await Promise.allSettled(
    (users ?? []).map(async (user) => {
      const sub = user.push_subscription as webpush.PushSubscription;
      const payload = JSON.stringify({
        title,
        body: msgBody,
        url: '/',
        broadcast_id: broadcastId,
        customer_id: user.id,
      });
      try {
        await webpush.sendNotification(sub, payload);
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

  // Log to vm_events so the admin UI can show broadcast history
  const { error: logError } = await supabase.from('vm_events').insert({
    event_type: 'admin_push_broadcast',
    metadata: { total, succeeded, failed, broadcast_id: broadcastId, title, body: msgBody },
  });
  if (logError) console.error('[send-customer-push] event log failed:', logError.message);

  return NextResponse.json(summary);
}
