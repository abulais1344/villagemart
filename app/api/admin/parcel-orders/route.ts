import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth-helpers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data: orders, error } = await supabase
    .from('parcel_orders')
    .select('id, merchant_id, destination_area, customer_name, customer_phone, delivery_address, items, subtotal, delivery_charge, commission_amount, status, order_date, notes, created_at')
    .order('order_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach merchant names
  const merchantIds = [...new Set((orders ?? []).map((o: any) => o.merchant_id).filter(Boolean))] as string[];
  let merchantMap: Record<string, string> = {};
  if (merchantIds.length > 0) {
    const { data: merchants } = await supabase
      .from('merchants')
      .select('id, store_name')
      .in('id', merchantIds);
    merchantMap = Object.fromEntries((merchants ?? []).map((m: any) => [m.id, m.store_name]));
  }

  const result = (orders ?? []).map((o: any) => ({
    ...o,
    store_name: merchantMap[o.merchant_id] ?? '—',
  }));

  return NextResponse.json({ orders: result });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { orderId, status } = await request.json();
  if (!orderId || !status) {
    return NextResponse.json({ error: 'Missing orderId or status' }, { status: 400 });
  }

  const VALID = ['pending', 'scheduled', 'dispatched', 'delivered', 'cancelled'];
  if (!VALID.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const { error } = await supabase
    .from('parcel_orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
