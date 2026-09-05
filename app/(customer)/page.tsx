import { createServiceClient } from '@/lib/supabase/server';
import { HomePageClient } from '@/components/customer/HomePageClient';
import type { Category, Product, Merchant } from '@/types';
import { MERCHANT_PUBLIC_COLS } from '@/lib/constants';

export const revalidate = 60;

export const metadata = {
  title: "Ardhapur's Online Store",
  description:
    'Order groceries, dairy, vegetables and daily essentials online in Ardhapur. Same day delivery. Bas order karo. Zupr karo.',
};

export default async function HomePage() {
  const supabase = await createServiceClient();

  // Fetch everything flat — no SQL joins to avoid schema cache issues
  const [catResult, featuredResult, ownResult, merchantsResult, foodResult, bakeryResult, vegetablesResult, pharmacyResult, dealsResult] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, slug, emoji')
      .eq('is_active', true)
      .neq('slug', 'restaurants')
      .order('sort_order', { ascending: true }),
    supabase
      .from('vm_products')
      .select('*')
      .eq('is_active', true)
      .eq('is_featured', true)
      .is('merchant_id', null)
      .limit(10),
    supabase
      .from('vm_products')
      .select('*')
      .eq('is_active', true)
      .is('merchant_id', null)
      .order('sort_order')
      .limit(8),
    supabase
      .from('merchants')
      .select(MERCHANT_PUBLIC_COLS)
      .eq('status', 'approved')
      .limit(8),
    supabase
      .from('merchants')
      .select(MERCHANT_PUBLIC_COLS)
      .eq('status', 'approved')
      .eq('is_food', true)
      .not('merchant_type', 'in', '("bakery","vegetables","medical")')
      .order('priority', { ascending: false })
      .limit(10),
    supabase
      .from('merchants')
      .select('*')
      .eq('status', 'approved')
      .eq('merchant_type', 'bakery')
      .limit(8),
    supabase
      .from('merchants')
      .select('*')
      .eq('status', 'approved')
      .eq('merchant_type', 'vegetables')
      .limit(8),
    supabase
      .from('merchants')
      .select('*')
      .eq('status', 'approved')
      .eq('merchant_type', 'medical')
      .limit(8),
    supabase
      .from('vm_products')
      .select('*')
      .eq('is_active', true)
      .limit(1000),
  ]);

  if (catResult.error) console.error('[home] categories:', catResult.error.message);
  if (featuredResult.error) console.error('[home] featured:', featuredResult.error.message);
  if (ownResult.error) console.error('[home] ownProducts:', ownResult.error.message);
  if (merchantsResult.error) console.error('[home] merchants:', merchantsResult.error.message);
  if (foodResult.error) console.error('[home] food:', foodResult.error.message);
  if (bakeryResult.error) console.error('[home] bakeries:', bakeryResult.error.message);
  if (vegetablesResult.error) console.error('[home] vegetables:', vegetablesResult.error.message);
  if (pharmacyResult.error) console.error('[home] pharmacy:', pharmacyResult.error.message);
  if (dealsResult.error) console.error('[home] deals:', dealsResult.error.message);

  const categories = (catResult.data ?? []) as Category[];
  const featured: Product[] = featuredResult.data ?? [];
  const ownProducts: Product[] = ownResult.data ?? [];
  const merchants: Merchant[] = merchantsResult.data ?? [];
  const foodMerchants: Merchant[] = foodResult.data ?? [];
  const bakeryMerchants: Merchant[] = bakeryResult.data ?? [];
  const vegetablesMerchants: Merchant[] = vegetablesResult.data ?? [];
  const pharmacyMerchants: Merchant[] = pharmacyResult.data ?? [];

  const TEST_MERCHANT_ID = '601a4b6b-af47-4031-a120-96927aafc92e';
  // City Dhabha temporarily excluded pending their confirmation — re-add to carousel once approved, see 2026-09-06
  const DEALS_EXCLUDED_MERCHANTS = new Set([
    TEST_MERCHANT_ID,
    '2c118995-6e60-4dcf-845c-c197df03f33f', // City Dhabha temporarily excluded pending their confirmation — re-add once approved, see 2026-09-06
  ]);
  // Merchant group order for Best Deals: City Dhabha first, Seva Medical second — set by request 2026-08-31
  const DEALS_MERCHANT_PRIORITY: Record<string, number> = {
    '2c118995-6e60-4dcf-845c-c197df03f33f': 0, // City Dhabha
    '8986e868-f24d-4725-84ca-d5f08d313b3f': 1, // Seva Medical
  };
  // Out-of-stock items sort after all in-stock items regardless of merchant group — set by request 2026-08-31
  const dealProducts: Product[] = ((dealsResult.data ?? []) as Product[])
    .filter(p => p.mrp > p.selling_price && !DEALS_EXCLUDED_MERCHANTS.has(p.merchant_id ?? ''))
    .sort((a, b) => {
      const pa = DEALS_MERCHANT_PRIORITY[a.merchant_id ?? ''] ?? 99;
      const pb = DEALS_MERCHANT_PRIORITY[b.merchant_id ?? ''] ?? 99;
      if (pa !== pb) return pa - pb;
      const aOos = a.stock_status === 'out_of_stock' || a.stock_quantity === 0 ? 1 : 0;
      const bOos = b.stock_status === 'out_of_stock' || b.stock_quantity === 0 ? 1 : 0;
      if (aOos !== bOos) return aOos - bOos;
      return ((b.mrp - b.selling_price) / b.mrp) - ((a.mrp - a.selling_price) / a.mrp);
    })
    .filter(p => (p.mrp - p.selling_price) / p.mrp >= 0.15)
    .slice(0, 20);

  return (
    <HomePageClient
      categories={categories}
      ownProducts={ownProducts}
      featuredProducts={featured}
      merchants={merchants}
      foodMerchants={foodMerchants}
      pharmacyMerchants={pharmacyMerchants}
      bakeryMerchants={bakeryMerchants}
      vegetablesMerchants={vegetablesMerchants}
      dealProducts={dealProducts}
    />
  );
}
