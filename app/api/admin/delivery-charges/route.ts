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

  const { data, error } = await supabase.from('delivery_charges').select('*').order('min_km');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ slabs: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const payload = await request.json();
  const { data, error } = await supabase
    .from('delivery_charges')
    .insert({
      min_km: payload.min_km,
      max_km: payload.max_km,
      charge: payload.charge,
      free_delivery_above: payload.free_delivery_above ?? null,
      starts_at: payload.starts_at ?? null,
      ends_at: payload.ends_at ?? null,
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ slab: data });
}
