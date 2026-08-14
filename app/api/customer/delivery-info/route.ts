import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getActiveDeliverySlabs } from '@/lib/utils/getActiveDeliverySlabs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const slabs = await getActiveDeliverySlabs(supabase);

  if (!slabs.length) {
    return NextResponse.json({ free_delivery_threshold: null, delivery_charge_amount: 20 });
  }

  const threshold = Math.min(...slabs.map(r => r.free_delivery_above as number));
  const matchingRow = slabs.find(r => r.free_delivery_above === threshold);
  const deliveryChargeAmount = matchingRow?.charge ?? 20;
  return NextResponse.json({ free_delivery_threshold: threshold, delivery_charge_amount: deliveryChargeAmount });
}
