import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: NextRequest) {
  const merchantId = req.nextUrl.searchParams.get('merchant_id');
  if (!merchantId) return NextResponse.json({ combos: [] });

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('promo_combos')
    .select(`
      id,
      label,
      required_product_ids,
      free_product:vm_products!free_product_id(
        id, name, selling_price, mrp, images, unit, merchant_id, category_id,
        description, is_active, is_featured, is_bestseller, is_veg, is_promo_item,
        sort_order, sku, barcode, discount_price, offer_percentage, tax_percentage,
        stock_quantity, low_stock_threshold, stock_status, created_at, updated_at
      )
    `)
    .eq('merchant_id', merchantId)
    .eq('is_active', true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gt.${now}`);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ combos: data ?? [] });
}
