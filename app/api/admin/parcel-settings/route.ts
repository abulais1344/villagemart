import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth-helpers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// GET: list merchants with parcel_service_enabled = true
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data, error } = await supabase
    .from('merchants')
    .select('id, store_name, parcel_service_enabled, parcel_delivery_charge, parcel_order_cutoff_time')
    .eq('parcel_service_enabled', true)
    .order('store_name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ merchants: data ?? [] });
}

// PATCH: update parcel_delivery_charge and/or parcel_order_cutoff_time for a merchant
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { merchantId, parcel_delivery_charge, parcel_order_cutoff_time } = await request.json();
  if (!merchantId) {
    return NextResponse.json({ error: 'Missing merchantId' }, { status: 400 });
  }

  const patch: Record<string, any> = {};
  if (parcel_delivery_charge !== undefined) patch.parcel_delivery_charge = Number(parcel_delivery_charge);
  if (parcel_order_cutoff_time !== undefined) patch.parcel_order_cutoff_time = parcel_order_cutoff_time;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const { error } = await supabase
    .from('merchants')
    .update(patch)
    .eq('id', merchantId)
    .eq('parcel_service_enabled', true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
