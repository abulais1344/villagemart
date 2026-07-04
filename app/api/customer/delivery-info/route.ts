import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from('delivery_charges')
    .select('free_delivery_above')
    .eq('is_active', true)
    .not('free_delivery_above', 'is', null);

  if (error || !data?.length) {
    return NextResponse.json({ free_delivery_threshold: null });
  }

  const threshold = Math.min(...data.map(r => r.free_delivery_above as number));
  return NextResponse.json({ free_delivery_threshold: threshold });
}
