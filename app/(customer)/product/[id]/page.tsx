import { notFound } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { ProductDetailClient } from '@/components/customer/ProductDetailClient';
import type { Product } from '@/types';

export const dynamic = 'force-dynamic';

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  console.log('=== PRODUCT PAGE ===');
  console.log('raw params:', params);
  console.log('product id:', id);

  // Fetch product server-side
  const { data: rawProduct, error: prodError } = await supabase
    .from('vm_products')
    .select('*, merchant:merchants(store_name, logo_url, avg_delivery_time)')
    .eq('id', id)
    .eq('is_active', true)
    .single();

  console.log('product:', rawProduct?.name);
  console.log('error:', prodError?.message);

  if (prodError || !rawProduct) {
    console.log('Product not found or error:', prodError?.message);
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

  const product: Product = { ...rawProduct, category } as Product;

  return <ProductDetailClient product={product} />;
}
