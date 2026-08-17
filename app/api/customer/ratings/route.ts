import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuth } from '@/lib/firebase/admin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PHONE_RE = /^[6-9]\d{9}$/;

// GET /api/customer/ratings?phone=...
// Returns ratings for all orders belonging to this phone number.
export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get('phone');
  if (!phone || !PHONE_RE.test(phone)) {
    return NextResponse.json({ ratings: [] });
  }

  const { data: orders } = await supabase
    .from('orders')
    .select('id')
    .eq('customer_phone', phone);

  const orderIds = (orders ?? []).map((o: { id: string }) => o.id);
  if (orderIds.length === 0) return NextResponse.json({ ratings: [] });

  const { data: ratings, error } = await supabase
    .from('order_ratings')
    .select('order_id, rating, comment')
    .in('order_id', orderIds);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ratings: ratings ?? [] });
}

// POST /api/customer/ratings
// Body: { orderId, rating (1-5), comment? (string | null), idToken }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { orderId, rating, comment, idToken } = body as {
    orderId?: string;
    rating?: number;
    comment?: string | null;
    idToken?: string;
  };

  if (!orderId || !idToken || typeof rating !== 'number' || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Verify Firebase identity
  let uid: string;
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  // Verify order ownership and delivery status
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('customer_id, status, merchant_id')
    .eq('id', orderId)
    .single();

  if (orderErr || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  if (order.customer_id !== uid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (order.status !== 'delivered') {
    return NextResponse.json({ error: 'Order not yet delivered' }, { status: 400 });
  }

  const { error } = await supabase.from('order_ratings').insert({
    order_id: orderId,
    customer_id: uid,
    merchant_id: order.merchant_id ?? null,
    rating: Math.round(rating),
    comment: comment?.trim() || null,
  });

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Already rated' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
