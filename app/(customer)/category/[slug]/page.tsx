import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ProductCard } from '@/components/customer/ProductCard';
import { BottomNav } from '@/components/customer/BottomNav';
import type { Category, Product } from '@/types';

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  // Step 1 — resolve category (skip lookup for "all")
  let category: Category | null = null;
  if (slug !== 'all') {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error || !data) notFound();
    category = data as Category;
  }

  // Step 2 — fetch products by category_id (no SQL join)
  let productQuery = supabase
    .from('vm_products')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
    .limit(100);

  if (category) productQuery = productQuery.eq('category_id', category.id);

  // Exclude merchant/restaurant products from all category pages except restaurants
  if (slug !== 'restaurants') {
    productQuery = productQuery.is('merchant_id', null);
  }

  const { data: rawProducts, error: prodError } = await productQuery;
  if (prodError) console.error('[category] products:', prodError.message);

  // Step 3 — for "all", fetch every active category so we can attach names manually
  let catMap = new Map<string, Category>();
  if (slug === 'all') {
    const { data: allCats } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true);
    catMap = new Map((allCats ?? []).map((c: Category) => [c.id, c]));
  }

  // Attach category to each product without a SQL join
  const products: Product[] = (rawProducts ?? []).map(p => ({
    ...p,
    category: category ?? catMap.get(p.category_id) ?? null,
  })) as Product[];

  const pageTitle = category?.name ?? 'All Products';

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-white border-b border-[#E5E7EB]">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/" className="p-2 rounded-xl hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-[#1A1A1A]" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-[#1A1A1A] truncate">{pageTitle}</h1>
            <p className="text-xs text-[#6B7280]">{products.length} product{products.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {category?.image_url && (
          <div className="relative h-28 overflow-hidden">
            <Image src={category.image_url} alt={category.name} fill className="object-cover" sizes="100vw" />
            <div className="absolute inset-0 bg-primary-900/30" />
          </div>
        )}
      </div>

      <main className="px-4 py-4">
        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📦</p>
            <p className="text-sm font-medium text-[#1A1A1A]">No products in this category yet</p>
            <p className="text-xs text-[#6B7280] mt-1">Check back soon!</p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
