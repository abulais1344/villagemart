import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireMerchant } from '@/lib/auth-helpers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const auth = await requireMerchant();
  if (!auth.ok) return auth.response;
  const { merchantId } = auth;

  const { subscription } = await request.json();
  if (!subscription) {
    return NextResponse.json({ error: 'Missing subscription' }, { status: 400 });
  }

  const { error } = await supabase
    .from('merchants')
    .update({ push_subscription: subscription })
    .eq('id', merchantId);

  if (error) {
    console.error('Failed to save push subscription:', error);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
