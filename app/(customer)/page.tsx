import { createClient } from '@/lib/supabase/server';
import { HomePageClient } from '@/components/customer/HomePageClient';
import type { Category, Product, Merchant } from '@/types';

export const revalidate = 60;

export const metadata = {
  title: "VillageMart — Ardhapur's Online Store",
  description:
    'Order groceries, dairy, vegetables and daily essentials online in Ardhapur. Same day delivery. VillageMart.',
};

export default async function HomePage() {
  const supabase = await createClient();

  // Fetch everything flat — no SQL joins to avoid schema cache issues
  const [catResult, featuredResult, ownResult, merchantsResult, foodResult] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, slug')
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
      .select('*')
      .eq('status', 'approved')
      .limit(8),
    supabase
      .from('merchants')
      .select('*')
      .eq('status', 'approved')
      .eq('is_food', true)
      .limit(10),
  ]);

  if (catResult.error) console.error('[home] categories:', catResult.error.message);
  if (featuredResult.error) console.error('[home] featured:', featuredResult.error.message);
  if (ownResult.error) console.error('[home] ownProducts:', ownResult.error.message);
  if (merchantsResult.error) console.error('[home] merchants:', merchantsResult.error.message);
  if (foodResult.error) console.error('[home] food:', foodResult.error.message);

  const categories = (catResult.data ?? []) as Category[];
  const featured: Product[] = featuredResult.data ?? [];
  const ownProducts: Product[] = ownResult.data ?? [];
  const merchants: Merchant[] = merchantsResult.data ?? [];
  const foodMerchants: Merchant[] = foodResult.data ?? [];

  return (
    <HomePageClient
      categories={categories}
      ownProducts={ownProducts}
      featuredProducts={featured}
      merchants={merchants}
      foodMerchants={foodMerchants}
    />
  );
}
