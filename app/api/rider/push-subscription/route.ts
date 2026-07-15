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
  if (!subscription) {
    return NextResponse.json({ error: 'Missing subscription' }, { status: 400 });
  }

  const { error } = await supabase
    .from('vm_riders')
    .update({ push_subscription: subscription })
    .eq('id', riderId);

  if (error) {
    console.error('Failed to save rider push subscription:', error);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
