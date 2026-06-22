'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ProductGrid } from '@/components/customer/ProductGrid';
import { StoreCard } from '@/components/customer/StoreCard';
import { formatCurrency } from '@/lib/utils/format';
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

interface RestaurantProduct {
  id: string;
  name: string;
  selling_price: number;
  images: string[] | null;
  merchant_id: string;
  merchant_name: string;
}

interface Props {
  initialQuery: string;
}

export function SearchPageClient({ initialQuery }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Merchant[]>([]);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [restaurantItems, setRestaurantItems] = useState<RestaurantProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [restaurantLoading, setRestaurantLoading] = useState(false);
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
        supabase.from('merchants').select('*, category:categories(*)').eq('status', 'approved').limit(4),
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
    setRestaurantLoading(true);
    setSuggestions([]);

    const resolvedQuery = ALIASES[q.toLowerCase().trim()] ?? q;
    const normalizedQuery = resolvedQuery.replace(/['\-.]/g, '').trim();
    const terms = [resolvedQuery, ...(normalizedQuery !== resolvedQuery ? [normalizedQuery] : [])];
    const orFilter = terms
      .flatMap(t => [`name.ilike.%${t}%`, `description.ilike.%${t}%`])
      .join(',');

    const [pResult, sResult, rResult] = await Promise.all([
      supabase
        .from('vm_products')
        .select('*, category:categories(*)')
        .or(orFilter)
        .eq('is_active', true)
        .is('merchant_id', null)
        .limit(30),
      supabase
        .from('merchants')
        .select('*, category:categories(*)')
        .ilike('store_name', `%${resolvedQuery}%`)
        .eq('status', 'approved')
        .limit(10),
      supabase
        .from('vm_products')
        .select('id, name, selling_price, images, merchant_id')
        .or(orFilter)
        .eq('is_active', true)
        .not('merchant_id', 'is', null)
        .limit(4),
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

    // Step 2: fetch merchant names for restaurant products
    const restProducts = rResult.data ?? [];
    if (restProducts.length > 0) {
      const merchantIds = [...new Set(restProducts.map(p => p.merchant_id).filter(Boolean))] as string[];
      const { data: merchantData } = await supabase
        .from('merchants')
        .select('id, name')
        .in('id', merchantIds);
      const merchantMap = Object.fromEntries(merchantData?.map(m => [m.id, m.name]) ?? []);
      setRestaurantItems(
        restProducts
          .filter(p => p.merchant_id != null)
          .map(p => ({
            id: p.id,
            name: p.name,
            selling_price: p.selling_price,
            images: p.images,
            merchant_id: p.merchant_id,
            merchant_name: merchantMap[p.merchant_id] ?? 'Restaurant',
          }))
      );
    } else {
      setRestaurantItems([]);
    }
    setRestaurantLoading(false);
  }, [inStockOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce: 300ms after typing stops → update URL + fetch
  useEffect(() => {
    if (query.length < 2) {
      setProducts([]);
      setStores([]);
      setSuggestions([]);
      setRestaurantItems([]);
      setLoading(false);
      setRestaurantLoading(false);
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
          placeholder="Search milk, eggs, bread..."
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

          {/* Restaurant cross-sell section */}
          {restaurantLoading ? (
            <div>
              <div className="mt-6 mb-3">
                <p className="text-sm font-semibold text-gray-700">🍽️ Also available at restaurants</p>
                <p className="text-xs text-gray-400">Order food with your groceries</p>
              </div>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-36 shrink-0 rounded-xl border border-gray-100 p-2 animate-pulse">
                    <div className="w-full h-24 rounded-lg bg-gray-200" />
                    <div className="h-3 bg-gray-200 rounded mt-2 w-4/5" />
                    <div className="h-2.5 bg-gray-100 rounded mt-1 w-3/5" />
                    <div className="h-3 bg-gray-200 rounded mt-1 w-2/5" />
                  </div>
                ))}
              </div>
            </div>
          ) : restaurantItems.length > 0 ? (
            <div>
              <div className="mt-6 mb-3">
                <p className="text-sm font-semibold text-gray-700">🍽️ Also available at restaurants</p>
                <p className="text-xs text-gray-400">Order food with your groceries</p>
              </div>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                {restaurantItems.map(item => (
                  <Link
                    key={item.id}
                    href={`/stores/${item.merchant_id}`}
                    className="w-36 shrink-0 rounded-xl border border-gray-100 p-2"
                  >
                    <div className="w-full h-24 rounded-lg overflow-hidden bg-gray-100">
                      {item.images?.[0] ? (
                        <Image
                          src={item.images[0]}
                          alt={item.name}
                          width={144}
                          height={96}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center">
                          <span className="text-2xl">🍽️</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-medium text-gray-800 mt-1 line-clamp-1">{item.name}</p>
                    <p className="text-[10px] text-gray-400 truncate">
                      {item.merchant_name}
                    </p>
                    <p className="text-xs font-bold text-gray-900 mt-0.5">
                      {formatCurrency(item.selling_price)}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
