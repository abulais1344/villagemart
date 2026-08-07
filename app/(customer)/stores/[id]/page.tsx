import { createServiceClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { StorePageClient } from '@/components/customer/StorePageClient';
import type { Product } from '@/types';

// Excludes portal_username, portal_password, push_subscription, commission_rate
const MERCHANT_PUBLIC_COLS = 'id, user_id, store_name, description, category_id, phone, email, address, city, pincode, latitude, longitude, logo_url, banner_url, cover_image_url, status, is_open, opening_time, closing_time, admin_override, avg_delivery_time, min_order_amount, cuisine_type, area, is_food, coming_soon, merchant_type, parcel_service_enabled, parcel_delivery_charge, parcel_order_cutoff_time, created_at, updated_at';

export const revalidate = 60;

export default async function StoreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServiceClient();

  const { data: merchant } = await supabase
    .from('merchants')
    .select(MERCHANT_PUBLIC_COLS)
    .eq('id', id)
    .single();

  if (!merchant) notFound();

  const { data: products } = await supabase
    .from('vm_products')
    .select('*, category:categories(*)')
    .eq('merchant_id', id)
    .eq('is_active', true)
    .order('is_bestseller', { ascending: false });

  return <StorePageClient merchant={merchant} products={(products ?? []) as Product[]} />;
}
