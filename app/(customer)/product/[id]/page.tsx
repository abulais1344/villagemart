import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProductDetailClient } from '@/components/customer/ProductDetailClient';
import type { Product } from '@/types';

export const revalidate = 60;

export const dynamic = 'force-dynamic';

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

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
      .select('*')
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
      product={product}
      category={category}
      similarProducts={similarProducts ?? []}
      topInCategory={topInCategory ?? []}
      alsoLiked={alsoLiked ?? []}
    />
  );
}
