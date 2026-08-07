import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuth } from '@/lib/firebase/admin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/customer/rider-location
// Body: { orderId: string, idToken: string }
// Returns the rider's current GPS coordinates for an out_for_delivery order
// owned by the requesting customer. Uses service-role to bypass RLS — auth
// is enforced by verifying the Firebase idToken and checking order ownership.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { orderId, idToken } = body as { orderId?: string; idToken?: string };

  if (!orderId || !idToken) {
    return NextResponse.json({ error: 'Missing orderId or idToken' }, { status: 400 });
  }

  // Verify Firebase identity
  let uid: string;
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  // Fetch the order — verify ownership and delivery state
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('customer_id, status, rider_id')
    .eq('id', orderId)
    .single();

  if (orderErr || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  if (order.customer_id !== uid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (order.status !== 'out_for_delivery' || !order.rider_id) {
    return NextResponse.json({ error: 'Order not in delivery' }, { status: 404 });
  }

  // Fetch rider location — service-role bypasses RLS entirely
  const { data: loc, error: locErr } = await supabase
    .from('vm_riders')
    .select('current_lat, current_lng, location_updated_at')
    .eq('id', order.rider_id)
    .single();

  if (locErr || !loc) {
    return NextResponse.json({ error: 'Rider not found' }, { status: 404 });
  }
  if (loc.current_lat == null || loc.current_lng == null) {
    return NextResponse.json({ error: 'Location not yet available' }, { status: 404 });
  }

  return NextResponse.json({
    lat: loc.current_lat,
    lng: loc.current_lng,
    updatedAt: loc.location_updated_at,
  });
}
