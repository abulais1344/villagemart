'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Header } from '@/components/customer/Header';
import { ProductGrid } from '@/components/customer/ProductGrid';
import { StoreCard } from '@/components/customer/StoreCard';
import type { Product, Merchant } from '@/types';

const ALIASES: Record<string, string> = {
  'lays': "lay's",
  'lays chips': "lay's",
  'britannia': 'bread',
  'amul': 'milk',
  'parleg': 'parle',
  'parle g': 'parle-g',
  'maggi': 'noodles',
  'doodh': 'milk',
  'anda': 'eggs',
  'ande': 'eggs',
  'pav': 'bread',
  'sabji': 'vegetables',
};

function SearchResults() {
  const params = useSearchParams();
  const query = params.get('q') ?? '';
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Merchant[]>([]);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    setSuggestions([]);

    // Fix 4: resolve aliases (e.g. "lays" → "lay's")
    const resolvedQuery = ALIASES[query.toLowerCase().trim()] ?? query;

    // Fix 2: strip apostrophes, hyphens, dots for a normalized variant
    const normalizedQuery = resolvedQuery.replace(/['\-.]/g, '').trim();

    // Fix 1: search both name and description; Fix 2: include normalized form
    const terms = [resolvedQuery, ...(normalizedQuery !== resolvedQuery ? [normalizedQuery] : [])];
    const orFilter = terms
      .flatMap(t => [`name.ilike.%${t}%`, `description.ilike.%${t}%`])
      .join(',');

    const fetchResults = async () => {
      const [pResult, sResult] = await Promise.all([
        supabase
          .from('vm_products')
          .select('*, category:categories(*)')
          .or(orFilter)
          .eq('is_active', true)
          .limit(30),
        supabase
          .from('merchants')
          .select('*, category:categories(*)')
          .ilike('store_name', `%${resolvedQuery}%`)
          .eq('status', 'approved')
          .limit(10),
      ]);

      let fetched = pResult.data ?? [];
      if (inStockOnly) fetched = fetched.filter(p => p.stock_status !== 'out_of_stock');
      setProducts(fetched);
      setStores(sResult.data ?? []);

      // Fix 3: fetch fallback suggestions when no products matched
      if (fetched.length === 0) {
        const { data } = await supabase
          .from('vm_products')
          .select('*, category:categories(*)')
          .eq('is_active', true)
          .limit(4);
        setSuggestions(data ?? []);
      }

      setLoading(false);
    };

    fetchResults();
  }, [query, inStockOnly]);

  const noResults = !loading && query && products.length === 0;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setInStockOnly(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${inStockOnly ? 'bg-primary-600 text-white border-primary-600' : 'border-[#E5E7EB] text-[#6B7280]'}`}
        >
          In Stock Only
        </button>
      </div>

      {query ? (
        <>
          {stores.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-[#1A1A1A] mb-2">Stores</h3>
              <div className="flex gap-3 overflow-x-auto no-scrollbar">
                {stores.map(s => <div key={s.id} className="shrink-0"><StoreCard merchant={s} /></div>)}
              </div>
            </section>
          )}

          {noResults ? (
            // Fix 3: no-results state with suggestions
            <div className="space-y-4">
              <div className="text-center py-6">
                <p className="text-4xl mb-2">🔍</p>
                <p className="text-[#1A1A1A] font-medium">No results for &ldquo;{query}&rdquo;</p>
                <p className="text-sm text-[#6B7280] mt-1">Try a different spelling or keyword</p>
              </div>
              {suggestions.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-[#1A1A1A] mb-2">You might like these</h3>
                  <ProductGrid products={suggestions} loading={false} />
                </section>
              )}
            </div>
          ) : (
            <section>
              <h3 className="text-sm font-semibold text-[#1A1A1A] mb-2">
                Products {!loading && `(${products.length})`}
              </h3>
              <ProductGrid products={products} loading={loading} />
            </section>
          )}
        </>
      ) : (
        <div className="text-center py-16">
          <p className="text-5xl mb-3">🔍</p>
          <p className="text-[#6B7280]">Search for products or stores</p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <>
      <Header />
      <main className="px-4 py-4">
        <Suspense fallback={<ProductGrid products={[]} loading skeletonCount={6} />}>
          <SearchResults />
        </Suspense>
      </main>
    </>
  );
}
