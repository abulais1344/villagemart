import { createServiceClient } from '@/lib/supabase/server';
import { HomePageClient } from '@/components/customer/HomePageClient';
import type { Category, Product, Merchant } from '@/types';

export const revalidate = 60;

export const metadata = {
  title: "Ardhapur's Online Store",
  description:
    'Order groceries, dairy, vegetables and daily essentials online in Ardhapur. Same day delivery. Bas order karo. Zupr karo.',
};

// Excludes portal_username, portal_password, push_subscription, commission_rate
const MERCHANT_PUBLIC_COLS = 'id, user_id, store_name, description, category_id, phone, email, address, city, pincode, latitude, longitude, logo_url, banner_url, cover_image_url, status, is_open, opening_time, closing_time, admin_override, avg_delivery_time, min_order_amount, cuisine_type, area, is_food, coming_soon, merchant_type, parcel_service_enabled, parcel_delivery_charge, parcel_order_cutoff_time, created_at, updated_at';

export default async function HomePage() {
  const supabase = await createServiceClient();

  // Fetch everything flat — no SQL joins to avoid schema cache issues
  const [catResult, featuredResult, ownResult, merchantsResult, foodResult, bakeryResult, vegetablesResult] = await Promise.all([
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
      .not('merchant_type', 'in', '("bakery","vegetables")')
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
  ]);

  if (catResult.error) console.error('[home] categories:', catResult.error.message);
  if (featuredResult.error) console.error('[home] featured:', featuredResult.error.message);
  if (ownResult.error) console.error('[home] ownProducts:', ownResult.error.message);
  if (merchantsResult.error) console.error('[home] merchants:', merchantsResult.error.message);
  if (foodResult.error) console.error('[home] food:', foodResult.error.message);
  if (bakeryResult.error) console.error('[home] bakeries:', bakeryResult.error.message);
  if (vegetablesResult.error) console.error('[home] vegetables:', vegetablesResult.error.message);

  const categories = (catResult.data ?? []) as Category[];
  const featured: Product[] = featuredResult.data ?? [];
  const ownProducts: Product[] = ownResult.data ?? [];
  const merchants: Merchant[] = merchantsResult.data ?? [];
  const foodMerchants: Merchant[] = foodResult.data ?? [];
  const bakeryMerchants: Merchant[] = bakeryResult.data ?? [];
  const vegetablesMerchants: Merchant[] = vegetablesResult.data ?? [];

  return (
    <HomePageClient
      categories={categories}
      ownProducts={ownProducts}
      featuredProducts={featured}
      merchants={merchants}
      foodMerchants={foodMerchants}
      bakeryMerchants={bakeryMerchants}
      vegetablesMerchants={vegetablesMerchants}
    />
  );
}
