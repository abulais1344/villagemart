import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth-helpers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const [users, merchants, riders, orders, ordersFin, parcelsFin] = await Promise.all([
    supabase.from('vm_users').select('id', { count: 'exact', head: true }),
    supabase.from('merchants').select('id', { count: 'exact', head: true }),
    supabase.from('vm_riders').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    // Financial aggregates — fetch columns server-side, sum in JS (PostgREST aggregates disabled)
    supabase
      .from('orders')
      .select('total_amount, delivery_charge, commission_amount')
      .not('status', 'in', '(cancelled,refunded)')
      .limit(20000),
    supabase
      .from('parcel_orders')
      .select('subtotal, delivery_charge, commission_amount')
      .eq('status', 'delivered')
      .limit(20000),
  ]);

  const orderRows  = ordersFin.data  ?? [];
  const parcelRows = parcelsFin.data ?? [];

  const total_revenue =
    orderRows.reduce((s, r) => s + (r.total_amount  ?? 0), 0) +
    parcelRows.reduce((s, r) => s + (r.subtotal ?? 0) + (r.delivery_charge ?? 0), 0);

  const commission_earned =
    orderRows.reduce((s, r) => s + (r.commission_amount ?? 0), 0) +
    parcelRows.reduce((s, r) => s + (r.commission_amount ?? 0), 0);

  const delivery_charges_collected =
    orderRows.reduce((s, r) => s + (r.delivery_charge ?? 0), 0) +
    parcelRows.reduce((s, r) => s + (r.delivery_charge ?? 0), 0);

  return NextResponse.json({
    users:     users.count     ?? 0,
    merchants: merchants.count ?? 0,
    riders:    riders.count    ?? 0,
    orders:    orders.count    ?? 0,
    total_revenue,
    commission_earned,
    delivery_charges_collected,
  });
}
