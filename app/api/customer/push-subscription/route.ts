import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuth } from '@/lib/firebase/admin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { subscription, idToken } = body;

  if (!idToken) {
    return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
  }
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: 'Missing or invalid subscription' }, { status: 400 });
  }

  let uid: string;
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch (err) {
    console.error('[customer/push-subscription] token verification failed:', err);
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const { error } = await supabase
    .from('vm_users')
    .update({ push_subscription: subscription })
    .eq('id', uid);

  if (error) {
    console.error('[customer/push-subscription] Supabase error:', error.message);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
