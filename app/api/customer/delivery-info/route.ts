import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getActiveDeliverySlabs } from '@/lib/utils/getActiveDeliverySlabs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  // Resolve merchant_type when the caller knows the merchant — enables category-specific charges
  let merchantType: string | null = null;
  const merchantId = req.nextUrl.searchParams.get('merchantId');
  if (merchantId) {
    const { data: merchant } = await supabase
      .from('merchants')
      .select('merchant_type')
      .eq('id', merchantId)
      .maybeSingle();
    merchantType = merchant?.merchant_type ?? null;
  }

  const slabs = await getActiveDeliverySlabs(supabase, merchantType);

  // Flat-charge slab (category override) — return charge directly with no threshold
  const flatSlab = slabs.find(r => r.free_delivery_above === null);
  if (flatSlab) {
    return NextResponse.json({ free_delivery_threshold: null, delivery_charge_amount: flatSlab.charge, is_flat: true });
  }

  if (!slabs.length) {
    return NextResponse.json({ free_delivery_threshold: null, delivery_charge_amount: 20 });
  }

  const threshold = Math.min(...slabs.map(r => r.free_delivery_above as number));
  const matchingRow = slabs.find(r => r.free_delivery_above === threshold);
  return NextResponse.json({ free_delivery_threshold: threshold, delivery_charge_amount: matchingRow?.charge ?? 20 });
}
