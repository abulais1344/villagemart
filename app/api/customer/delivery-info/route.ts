import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from('delivery_charges')
    .select('free_delivery_above, charge')
    .eq('is_active', true)
    .not('free_delivery_above', 'is', null);

  if (error || !data?.length) {
    return NextResponse.json({ free_delivery_threshold: null, delivery_charge_amount: 20 });
  }

  const threshold = Math.min(...data.map(r => r.free_delivery_above as number));
  const matchingRow = data.find(r => r.free_delivery_above === threshold);
  const deliveryChargeAmount = matchingRow?.charge ?? 20;
  return NextResponse.json({ free_delivery_threshold: threshold, delivery_charge_amount: deliveryChargeAmount });
}
