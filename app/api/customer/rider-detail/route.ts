import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuth } from '@/lib/firebase/admin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/customer/rider-detail
// Body: { orderId: string, idToken: string }
// Returns rider name, phone, vehicle_type for the rider assigned to the order.
// Ownership-checked: the order must belong to the requesting customer.
// No status constraint — shown whenever a rider is assigned, not only during delivery.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { orderId, idToken } = body as { orderId?: string; idToken?: string };

  if (!orderId || !idToken) {
    return NextResponse.json({ error: 'Missing orderId or idToken' }, { status: 400 });
  }

  let uid: string;
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('customer_id, rider_id')
    .eq('id', orderId)
    .single();

  if (orderErr || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  if (order.customer_id !== uid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!order.rider_id) {
    return NextResponse.json({ error: 'No rider assigned' }, { status: 404 });
  }

  const { data: rider, error: riderErr } = await supabase
    .from('vm_riders')
    .select('name, phone, vehicle_type')
    .eq('id', order.rider_id)
    .single();

  if (riderErr || !rider) {
    return NextResponse.json({ error: 'Rider not found' }, { status: 404 });
  }

  return NextResponse.json({
    name: rider.name,
    phone: rider.phone,
    vehicleType: rider.vehicle_type,
  });
}
