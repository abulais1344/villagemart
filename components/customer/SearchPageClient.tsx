'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
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

interface Props {
  initialQuery: string;
}

export function SearchPageClient({ initialQuery }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Merchant[]>([]);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [nearbyRestaurants, setNearbyRestaurants] = useState<Merchant[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [emptyStateLoading, setEmptyStateLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Fetch empty-state data once on mount
  useEffect(() => {
    const init = async () => {
      try {
        const raw = localStorage.getItem('vm_recent_searches');
        if (raw) setRecentSearches(JSON.parse(raw));
      } catch {}
      const [pRes, mRes] = await Promise.all([
        supabase.from('vm_products').select('*, category:categories(*)').eq('is_active', true).is('merchant_id', null).limit(12),
        supabase.from('merchants').select('*').eq('status', 'approved').limit(4),
      ]);
      const shuffled = (pRes.data ?? []).sort(() => Math.random() - 0.5).slice(0, 4) as Product[];
      setPopularProducts(shuffled);
      setNearbyRestaurants((mRes.data ?? []) as Merchant[]);
      setEmptyStateLoading(false);
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const doFetch = useCallback(async (q: string) => {
    setLoading(true);
    setSuggestions([]);

    const resolvedQuery = ALIASES[q.toLowerCase().trim()] ?? q;
    const normalizedQuery = resolvedQuery.replace(/['\-.]/g, '').trim();
    const terms = [resolvedQuery, ...(normalizedQuery !== resolvedQuery ? [normalizedQuery] : [])];
    const orFilter = terms
      .flatMap(t => [`name.ilike.%${t}%`, `description.ilike.%${t}%`])
      .join(',');

    const [pResult, sResult] = await Promise.all([
      supabase
        .from('vm_products')
        .select('*, category:categories(*)')
        .or(orFilter)
        .eq('is_active', true)
        .limit(30),
      supabase
        .from('merchants')
        .select('*')
        .ilike('store_name', `%${resolvedQuery}%`)
        .eq('status', 'approved')
        .limit(10),
    ]);

    let fetched = pResult.data ?? [];
    if (inStockOnly) fetched = fetched.filter(p => p.stock_status !== 'out_of_stock');
    setProducts(fetched);
    setStores(sResult.data ?? []);

    if (fetched.length === 0) {
      const { data } = await supabase
        .from('vm_products')
        .select('*, category:categories(*)')
        .eq('is_active', true)
        .is('merchant_id', null)
        .limit(4);
      setSuggestions(data ?? []);
    }

    setLoading(false);
  }, [inStockOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce: 300ms after typing stops → update URL + fetch
  useEffect(() => {
    if (query.length < 2) {
      setProducts([]);
      setStores([]);
      setSuggestions([]);
      setLoading(false);
      router.replace('/search', { scroll: false });
      return;
    }

    const timer = setTimeout(() => {
      router.replace(`/search?q=${encodeURIComponent(query)}`, { scroll: false });
      doFetch(query);
      setRecentSearches(prev => {
        const updated = [query, ...prev.filter(s => s !== query)].slice(0, 3);
        try { localStorage.setItem('vm_recent_searches', JSON.stringify(updated)); } catch {}
        return updated;
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [query, doFetch]); // doFetch changes when inStockOnly changes → re-fetch

  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  const noResults = !loading && query.length >= 2 && products.length === 0;

  return (
    <div className="space-y-4">
      {/* Controlled search input */}
      <div className="flex items-center gap-2 bg-[#F5F5F7] border border-[#E5E7EB] rounded-xl px-3 h-12">
        <Search className="w-4 h-4 text-primary-600 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search restaurants, dishes..."
          autoFocus
          className="flex-1 bg-transparent outline-none text-sm placeholder-[#9CA3AF]"
        />
        {loading && (
          <div className="w-4 h-4 rounded-full border-2 border-primary-600 border-t-transparent animate-spin shrink-0" />
        )}
        {query.length > 0 && !loading && (
          <button onClick={handleClear} className="text-gray-400 hover:text-gray-600 shrink-0 p-0.5">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setInStockOnly(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            inStockOnly
              ? 'bg-primary-600 text-white border-primary-600'
              : 'border-[#E5E7EB] text-[#6B7280]'
          }`}
        >
          In Stock Only
        </button>
      </div>

      {/* States */}
      {query.length === 0 ? (
        <div className="space-y-6">
          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-[#1A1A1A] mb-2">Recent Searches</h3>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map(term => (
                  <button
                    key={term}
                    onClick={() => setQuery(term)}
                    className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-3 py-1.5 rounded-full transition-colors"
                  >
                    <span className="text-xs">🕐</span> {term}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Popular Right Now */}
          <section>
            <h3 className="text-sm font-semibold text-[#1A1A1A] mb-2">🔥 Popular Right Now</h3>
            <ProductGrid products={popularProducts} loading={emptyStateLoading} skeletonCount={4} />
          </section>

          {/* Restaurants Near You */}
          {(emptyStateLoading || nearbyRestaurants.length > 0) && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-[#1A1A1A]">🍽️ Restaurants Near You</h3>
                <Link href="/stores" className="text-xs text-primary-600 font-medium">See all →</Link>
              </div>
              {emptyStateLoading ? (
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-40 shrink-0 h-32 rounded-xl bg-gray-100 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                  {nearbyRestaurants.map(m => (
                    <div key={m.id} className="shrink-0">
                      <StoreCard merchant={m} />
                    </div>
                  ))}
                </div>
              )}
              <Link
                href="/stores"
                className="flex items-center gap-1 text-purple-600 text-xs font-medium mt-2 px-1"
              >
                See all restaurants →
              </Link>
            </section>
          )}
        </div>
      ) : query.length === 1 ? (
        <div className="text-center py-12">
          <p className="text-[#9CA3AF] text-sm">Keep typing...</p>
        </div>
      ) : (
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
            <div className="space-y-4">
              <p className="text-sm text-gray-500 py-3">
                No results for &ldquo;{query}&rdquo; · Try a different keyword
              </p>
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
                Results {!loading && `(${products.length})`}
              </h3>
              <ProductGrid products={products} loading={loading} />
            </section>
          )}

        </>
      )}
    </div>
  );
}
