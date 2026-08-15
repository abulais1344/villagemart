import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('iday_soda_is_active, iday_soda_starts_at, iday_soda_ends_at')
    .eq('id', 1)
    .single();

  if (error || !data) {
    return NextResponse.json({ isActive: false, startsAt: null, endsAt: null });
  }

  return NextResponse.json({
    isActive: data.iday_soda_is_active !== false,
    startsAt: data.iday_soda_starts_at ?? null,
    endsAt: data.iday_soda_ends_at ?? null,
  });
}
