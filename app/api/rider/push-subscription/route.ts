import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireRider } from '@/lib/auth-helpers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const auth = await requireRider();
  if (!auth.ok) return auth.response;
  const { riderId } = auth;

  const { subscription } = await request.json();
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: 'Missing subscription' }, { status: 400 });
  }

  const { data: rider, error: fetchError } = await supabase
    .from('vm_riders')
    .select('push_subscription')
    .eq('id', riderId)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: 'Failed to fetch rider' }, { status: 500 });
  }

  // Normalise stored value: null or legacy single-object → treat as array
  const existing: any[] = Array.isArray(rider?.push_subscription)
    ? rider.push_subscription
    : rider?.push_subscription
    ? [rider.push_subscription]
    : [];

  // De-duplicate by endpoint — same device re-enabling replaces rather than appends
  const updated = [
    ...existing.filter((s: any) => s.endpoint !== subscription.endpoint),
    subscription,
  ];

  const { error } = await supabase
    .from('vm_riders')
    .update({ push_subscription: updated })
    .eq('id', riderId);

  if (error) {
    console.error('Failed to save rider push subscription:', error);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
