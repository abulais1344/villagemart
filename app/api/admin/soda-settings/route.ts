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

  const { data, error } = await supabase
    .from('admin_settings')
    .select('iday_soda_threshold_1, iday_soda_qty_1, iday_soda_threshold_2, iday_soda_qty_2')
    .eq('id', 1)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const payload = await request.json();
  const { error } = await supabase
    .from('admin_settings')
    .update({
      iday_soda_threshold_1: Number(payload.iday_soda_threshold_1),
      iday_soda_qty_1:       Number(payload.iday_soda_qty_1),
      iday_soda_threshold_2: Number(payload.iday_soda_threshold_2),
      iday_soda_qty_2:       Number(payload.iday_soda_qty_2),
    })
    .eq('id', 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
