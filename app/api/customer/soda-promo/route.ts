import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const merchantId = request.nextUrl.searchParams.get('merchant_id');

  const [settingsRes, productRes] = await Promise.all([
    supabase
      .from('admin_settings')
      .select('iday_soda_threshold_1, iday_soda_qty_1, iday_soda_threshold_2, iday_soda_qty_2, iday_soda_starts_at, iday_soda_ends_at, iday_soda_is_active')
      .eq('id', 1)
      .single(),
    merchantId
      ? supabase
          .from('vm_products')
          .select('id, name, selling_price, mrp, images, unit, merchant_id, category_id, description, is_active, is_featured, is_bestseller, is_veg, is_promo_item, sort_order, sku, barcode, discount_price, offer_percentage, tax_percentage, stock_quantity, low_stock_threshold, stock_status, created_at, updated_at')
          .eq('is_promo_item', true)
          .eq('is_active', true)
          .eq('merchant_id', merchantId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const s = settingsRes.data;
  const promoProduct = productRes.data ?? null;

  const now = new Date().toISOString();
  const isActive = s?.iday_soda_is_active !== false;
  const active = !!s && isActive &&
    (!s.iday_soda_starts_at || s.iday_soda_starts_at <= now) &&
    (!s.iday_soda_ends_at   || s.iday_soda_ends_at   >= now);

  return NextResponse.json({
    active,
    isActive,
    tiers: [
      { threshold: s?.iday_soda_threshold_1 ?? 120, qty: s?.iday_soda_qty_1 ?? 1 },
      { threshold: s?.iday_soda_threshold_2 ?? 240, qty: s?.iday_soda_qty_2 ?? 2 },
    ],
    promoProduct,
    startsAt: s?.iday_soda_starts_at ?? null,
    endsAt:   s?.iday_soda_ends_at   ?? null,
  });
}
