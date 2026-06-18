import { notFound } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { ProductDetailClient } from '@/components/customer/ProductDetailClient';
import type { Product } from '@/types';

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

  return <ProductDetailClient product={product} />;
}
