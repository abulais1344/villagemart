import { createServiceClient } from '@/lib/supabase/server';
import { HomePageClient } from '@/components/customer/HomePageClient';
import type { Category, Product, Merchant } from '@/types';
import type { PromoBanner } from '@/components/customer/PromoBannerCarousel';
import { MERCHANT_PUBLIC_COLS } from '@/lib/constants';

export const revalidate = 60;

export const metadata = {
  title: "Ardhapur's Online Store",
  description:
    'Order groceries, dairy, vegetables and daily essentials online in Ardhapur. Same day delivery. Bas order karo. Zupr karo.',
};

export default async function HomePage() {
  const supabase = await createServiceClient();

  const now = new Date().toISOString();

  // Fetch everything flat — no SQL joins to avoid schema cache issues
  const [catResult, featuredResult, ownResult, merchantsResult, foodResult, bakeryResult, vegetablesResult, pharmacyResult, bannersResult] = await Promise.all([
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
      .from('promo_banners')
      .select('id, image_url, link_url, sort_order')
      .eq('is_active', true)
      .or(`start_at.is.null,start_at.lte.${now}`)
      .or(`end_at.is.null,end_at.gt.${now}`)
      .order('sort_order', { ascending: true })
      .limit(10),
  ]);

  if (catResult.error) console.error('[home] categories:', catResult.error.message);
  if (featuredResult.error) console.error('[home] featured:', featuredResult.error.message);
  if (ownResult.error) console.error('[home] ownProducts:', ownResult.error.message);
  if (merchantsResult.error) console.error('[home] merchants:', merchantsResult.error.message);
  if (foodResult.error) console.error('[home] food:', foodResult.error.message);
  if (bakeryResult.error) console.error('[home] bakeries:', bakeryResult.error.message);
  if (vegetablesResult.error) console.error('[home] vegetables:', vegetablesResult.error.message);
  if (pharmacyResult.error) console.error('[home] pharmacy:', pharmacyResult.error.message);
  if (bannersResult.error) console.error('[home] promo_banners:', bannersResult.error.message);

  const categories = (catResult.data ?? []) as Category[];
  const featured: Product[] = featuredResult.data ?? [];
  const ownProducts: Product[] = ownResult.data ?? [];
  const merchants: Merchant[] = merchantsResult.data ?? [];
  const foodMerchants: Merchant[] = foodResult.data ?? [];
  const bakeryMerchants: Merchant[] = bakeryResult.data ?? [];
  const vegetablesMerchants: Merchant[] = vegetablesResult.data ?? [];
  const pharmacyMerchants: Merchant[] = pharmacyResult.data ?? [];
  const promoBanners: PromoBanner[] = (bannersResult.data ?? []) as PromoBanner[];

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
      promoBanners={promoBanners}
    />
  );
}
