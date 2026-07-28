import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyOrderActionToken } from '@/lib/orders/orderActionToken';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { token } = body;
  if (!token) return Response.json({ error: 'Missing token' }, { status: 400 });

  const result = verifyOrderActionToken(token);
  if (!result) {
    return Response.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const { orderId, action } = result;
  // 'ready' matches the merchant portal's tab vocabulary and triggers rider notification.
  // 'cancelled' matches the web Reject button — both surfaces now produce identical results.
  const newStatus = action === 'accept' ? 'ready' : 'cancelled';

  const { data, error } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId)
    .eq('status', 'pending') // idempotent: no-op if already acted on
    .select('id, status')
    .single();

  if (error) {
    // PGRST116 = no rows matched — order was already accepted/rejected
    if (error.code === 'PGRST116') {
      return Response.json({ success: true, status: 'already_actioned' });
    }
    console.error('[order-action] DB error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true, status: data?.status ?? newStatus });
}
