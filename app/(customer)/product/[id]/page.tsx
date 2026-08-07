import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { ProductDetailClient } from '@/components/customer/ProductDetailClient';
import type { Product } from '@/types';

// Excludes portal_username, portal_password, push_subscription, commission_rate
const MERCHANT_PUBLIC_COLS = 'id, user_id, store_name, description, category_id, phone, email, address, city, pincode, latitude, longitude, logo_url, banner_url, cover_image_url, status, is_open, opening_time, closing_time, admin_override, avg_delivery_time, min_order_amount, cuisine_type, area, is_food, coming_soon, merchant_type, parcel_service_enabled, parcel_delivery_charge, parcel_order_cutoff_time, created_at, updated_at';

export const revalidate = 60;

export const dynamic = 'force-dynamic';

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServiceClient();

  // Fetch product server-side
  const { data: rawProduct, error: prodError } = await supabase
    .from('vm_products')
    .select('*')
    .eq('id', id)
    .single();

  if (prodError || !rawProduct) {
    notFound();
  }

  // Fetch category separately
  let category = null;
  if (rawProduct.category_id) {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('id', rawProduct.category_id)
      .single();
    category = data;
  }

  // Fetch merchant separately
  let merchant = null;
  if (rawProduct.merchant_id) {
    const { data } = await supabase
      .from('merchants')
      .select(MERCHANT_PUBLIC_COLS)
      .eq('id', rawProduct.merchant_id)
      .single();
    merchant = data;
  }

  const product: Product = { ...rawProduct, category, merchant } as Product;

  // Similar products (same category + same merchant, excluding current)
  const { data: similarProducts } = await supabase
    .from('vm_products')
    .select('*')
    .eq('category_id', product.category_id)
    .eq('merchant_id', product.merchant_id)
    .eq('is_active', true)
    .neq('id', product.id)
    .limit(8);

  // Top/featured products in same category + same merchant
  const { data: topInCategory } = await supabase
    .from('vm_products')
    .select('*')
    .eq('category_id', product.category_id)
    .eq('merchant_id', product.merchant_id)
    .eq('is_active', true)
    .eq('is_featured', true)
    .neq('id', product.id)
    .limit(6);

  // People also bought — featured products from other categories (cross-sell)
  const { data: alsoLiked } = await supabase
    .from('vm_products')
    .select('*')
    .eq('is_active', true)
    .eq('is_featured', true)
    .neq('category_id', product.category_id)
    .limit(8);

  return (
    <ProductDetailClient
      key={product.id}
      product={product}
      category={category}
      similarProducts={similarProducts ?? []}
      topInCategory={topInCategory ?? []}
      alsoLiked={alsoLiked ?? []}
    />
  );
}
