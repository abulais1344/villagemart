import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const supabase = await createClient();
  const { data } = await supabase
    .from('merchants')
    .select('opening_time, closing_time, status, store_name, logo_url, parcel_service_enabled, parcel_delivery_charge, parcel_order_cutoff_time')
    .eq('id', id)
    .single();

  return NextResponse.json(data ?? {});
}
