import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth-helpers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/admin/riders            — list all riders with delivery counts
// GET /api/admin/riders?riderId=X  — order history for one rider
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const riderId = request.nextUrl.searchParams.get('riderId');

  if (riderId) {
    const { data: orders } = await supabase
      .from('orders')
      .select('id, created_at, picked_up_at, delivered_at, status, customer_name, delivery_address, total_amount, merchant_id')
      .eq('rider_id', riderId)
      .order('created_at', { ascending: false })
      .limit(100);

    const orderList = orders ?? [];
    const merchantIds = [...new Set(orderList.map((o: any) => o.merchant_id).filter(Boolean))] as string[];
    let merchantMap: Record<string, string> = {};
    if (merchantIds.length > 0) {
      const { data: merchants } = await supabase
        .from('merchants').select('id, store_name').in('id', merchantIds);
      merchantMap = Object.fromEntries((merchants ?? []).map((m: any) => [m.id, m.store_name]));
    }

    return NextResponse.json({
      orders: orderList.map((o: any) => ({
        ...o,
        store_name: o.merchant_id ? (merchantMap[o.merchant_id] ?? null) : null,
      })),
    });
  }

  const { data: riders, error } = await supabase
    .from('vm_riders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const riderList = riders ?? [];
  const riderIds = riderList.map((r: any) => r.id);
  let deliveryCounts: Record<string, number> = {};
  if (riderIds.length > 0) {
    const { data: delivered } = await supabase
      .from('orders')
      .select('rider_id')
      .in('rider_id', riderIds)
      .not('delivered_at', 'is', null);
    (delivered ?? []).forEach((o: any) => {
      deliveryCounts[o.rider_id] = (deliveryCounts[o.rider_id] || 0) + 1;
    });
  }

  return NextResponse.json({
    riders: riderList.map((r: any) => ({ ...r, total_deliveries: deliveryCounts[r.id] || 0 })),
  });
}

// POST /api/admin/riders — create rider
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { name, phone, portal_username, portal_password, vehicle_type, notes } = await request.json();
  if (!name || !phone || !portal_username || !portal_password) {
    return NextResponse.json({ error: 'Name, phone, username and password are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('vm_riders')
    .insert({ name, phone, portal_username, portal_password, vehicle_type: vehicle_type || null, notes: notes || null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rider: data });
}

// PATCH /api/admin/riders?id=X — update rider
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const body = await request.json();
  const update: Record<string, any> = {
    name: body.name,
    phone: body.phone,
    portal_username: body.portal_username,
    vehicle_type: body.vehicle_type || null,
    notes: body.notes || null,
    is_active: body.is_active,
  };
  if (body.portal_password) update.portal_password = body.portal_password;

  const { data, error } = await supabase.from('vm_riders').update(update).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rider: data });
}

// DELETE /api/admin/riders?id=X — delete rider
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { error } = await supabase.from('vm_riders').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
