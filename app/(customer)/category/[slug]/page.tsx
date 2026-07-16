import { createClient } from '@/lib/supabase/server';

export const revalidate = 60;
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ProductCard } from '@/components/customer/ProductCard';
import { BottomNav } from '@/components/customer/BottomNav';
import type { Category, Product } from '@/types';

const CUISINE_RULES: [RegExp, string][] = [
  [/chicken|non.?veg|arabian|tandoori|kebab|mutton/i, '🍗 Non Veg'],
  [/\bveg\b|north.?indian|\bindian\b|dal|thali|paneer/i, '🥬 Veg'],
  [/chinese|noodles|fried.?rice|manchurian/i, '🥡 Chinese'],
  [/pizza|burger|sandwich|fast.?food/i, '🍕 Fast Food'],
  [/biryani/i, '🍚 Biryani'],
  [/dosa|idli|south.?indian/i, '🫓 South Indian'],
  [/sweet|dessert|bakery/i, '🍮 Sweets'],
];

function getCuisineTags(cuisineType: string | null): string[] {
  if (!cuisineType) return ['🍽️ Meals'];
  const tags: string[] = [];
  for (const [pattern, tag] of CUISINE_RULES) {
    if (pattern.test(cuisineType) && !tags.includes(tag)) tags.push(tag);
    if (tags.length === 3) break;
  }
  return tags.length > 0 ? tags : ['🍽️ Meals'];
}

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

  // Step 2 — if this category has merchants linked via category_id, show restaurants
  let merchants: any[] = [];
  if (category) {
    const { data: merchantData } = await supabase
      .from('merchants')
      .select('id, store_name, cuisine_type, avg_delivery_time, cover_image_url, logo_url, area')
      .eq('category_id', category.id)
      .eq('status', 'approved');
    merchants = merchantData ?? [];
  }

  if (merchants.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="sticky top-0 z-40 bg-white border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3 px-4 py-3">
            <Link href="/" className="p-2 rounded-xl hover:bg-gray-100">
              <ArrowLeft className="w-5 h-5 text-[#1A1A1A]" />
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-[#1A1A1A] truncate">{category!.name}</h1>
              <p className="text-xs text-[#6B7280]">{merchants.length} restaurant{merchants.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          {category!.image_url && (
            <div className="relative h-28 overflow-hidden">
              <Image src={category!.image_url} alt={category!.name} fill className="object-cover" sizes="100vw" />
              <div className="absolute inset-0 bg-primary-900/30" />
            </div>
          )}
        </div>
        <main className="px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            {merchants.map((merchant: any, index: number) => (
              <Link key={merchant.id} href={`/stores/${merchant.id}`} className="block">
                {merchant.cover_image_url ? (
                  <div className="relative w-full h-36 rounded-lg overflow-hidden bg-gray-100">
                    <Image
                      src={merchant.cover_image_url}
                      alt={merchant.store_name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 25vw"
                      priority={index === 0}
                    />
                  </div>
                ) : (
                  <div className="w-full h-36 rounded-lg bg-purple-600 flex items-center justify-center">
                    <span className="text-4xl font-bold text-white/40">
                      {merchant.store_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <p className="font-semibold text-sm text-gray-900 mt-1 truncate">{merchant.store_name}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {getCuisineTags(merchant.cuisine_type).map((tag: string) => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{tag}</span>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {merchant.avg_delivery_time
                    ? `${Math.max(merchant.avg_delivery_time - 5, 5)}-${merchant.avg_delivery_time} min`
                    : '30-40 min'}
                </p>
              </Link>
            ))}
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  // Step 3 — no merchants linked: fetch products (grocery/product-type categories)
  let productQuery = supabase
    .from('vm_products')
    .select('*')
    .eq('is_active', true)
    .is('merchant_id', null)
    .order('sort_order')
    .limit(100);

  if (category) productQuery = productQuery.eq('category_id', category.id);

  const { data: rawProducts, error: prodError } = await productQuery;
  if (prodError) console.error('[category] products:', prodError.message);

  // Step 4 — for "all", fetch every active category so we can attach names manually
  let catMap = new Map<string, Category>();
  if (slug === 'all') {
    const { data: allCats } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true);
    catMap = new Map((allCats ?? []).map((c: Category) => [c.id, c]));
  }

  const products: Product[] = (rawProducts ?? []).map(p => ({
    ...p,
    category: category ?? catMap.get(p.category_id) ?? null,
  })) as Product[];

  const pageTitle = category?.name ?? 'All Products';

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
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
