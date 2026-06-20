'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, MessageCircle, ShoppingCart, MapPin } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { ProductCard } from './ProductCard';
import { formatCurrency } from '@/lib/utils/format';
import type { Category, Product, Merchant } from '@/types';

interface HomePageClientProps {
  categories: Category[];
  ownProducts: Product[];
  featuredProducts: Product[];
  merchants: Merchant[];
  foodMerchants: Merchant[];
}

function getCategoryIcon(slug: string): string {
  const icons: Record<string, string> = {
    'dairy': '🥛',
    'bread-bakery': '🍞',
    'eggs': '🥚',
    'fruits-vegetables': '🥬',
    'groceries': '🛒',
    'snacks': '🍪',
    'household': '🏠',
    'personal-care': '🧴',
    'baby-care': '👶',
    'medicine': '💊',
  };
  return icons[slug] ?? '📦';
}

function getCategoryColor(slug: string): string {
  const colors: Record<string, string> = {
    'dairy': '#FEF9C3',
    'bread-bakery': '#FEE2E2',
    'eggs': '#DCFCE7',
    'fruits-vegetables': '#DCFCE7',
    'groceries': '#EDE9FE',
    'snacks': '#FEF3C7',
    'household': '#F3F4F6',
    'personal-care': '#FCE7F3',
    'baby-care': '#DBEAFE',
    'medicine': '#D1FAE5',
  };
  return colors[slug] ?? '#F3F4F6';
}

function getCategoryMarathi(slug: string): string {
  const marathi: Record<string, string> = {
    'dairy': 'दूध',
    'bread-bakery': 'ब्रेड',
    'eggs': 'अंडी',
    'fruits-vegetables': 'भाज्या',
    'groceries': 'किराणा',
    'snacks': 'नाश्ता',
    'household': 'घरगुती',
    'personal-care': 'सौंदर्य',
    'baby-care': 'बाळ',
    'medicine': 'औषध',
  };
  return marathi[slug] ?? '';
}

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

function deliveryRange(avg: number): string {
  return `${Math.max(avg - 5, 5)}-${avg} min`;
}

const SEARCH_PLACEHOLDERS = [
  'दूध, ब्रेड, अंडी शोधा...',
  'Search groceries, dairy, snacks...',
  'Search milk, bread, eggs...',
];

export function HomePageClient({
  categories,
  ownProducts,
  featuredProducts,
  merchants,
  foodMerchants,
}: HomePageClientProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [searchPlaceholderIndex, setSearchPlaceholderIndex] = useState(0);
  const { items, getSubtotal } = useCartStore();
  const cartTotal = getSubtotal();
  const itemCount = items.length;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setSearchPlaceholderIndex(prev => (prev + 1) % SEARCH_PLACEHOLDERS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const catMap = new Map(categories.map(c => [c.id, c]));
  const withCategory = (products: Product[]) =>
    products.map(p => ({ ...p, category: catMap.get(p.category_id) ?? null }));

  const ownWithCat = withCategory(ownProducts);
  const featuredWithCat = withCategory(featuredProducts);

  return (
    <div className="min-h-screen bg-white">
      {/* 1. Location Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-[#E5E7EB] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <MapPin className="w-4 h-4 text-primary-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-[#6B7280]">Delivering to</p>
              <p className="text-xs font-bold text-[#1A1A1A] truncate">Ardhapur, Maharashtra ↓</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-xl hover:bg-gray-100">
              <MessageCircle className="w-5 h-5 text-[#6B7280]" />
            </button>
            <button className="p-2 rounded-xl hover:bg-gray-100 relative">
              <ShoppingCart className="w-5 h-5 text-[#6B7280]" />
              {mounted && itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <main className="px-4 py-3 pb-24 space-y-3">

        {/* 2. Search Bar */}
        <div className="flex items-center gap-2 bg-[#F5F5F7] border border-[#E5E7EB] rounded-xl px-3 h-12">
          <Search className="w-4 h-4 text-primary-600 shrink-0" />
          <input
            type="text"
            placeholder={SEARCH_PLACEHOLDERS[searchPlaceholderIndex]}
            className="flex-1 bg-transparent outline-none text-sm placeholder-[#9CA3AF]"
            onClick={() => router.push('/search')}
            readOnly
          />
        </div>

        {/* 3. Delivery Strip */}
        <div className="bg-[#F5F0FF] rounded-xl px-4 py-2.5">
          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-primary-600">⚡ Same day delivery</span>
              <span className="text-[#6B7280] ml-2">Order before 6 PM</span>
            </div>
            <span className="text-primary-600 font-semibold">Free above ₹299</span>
          </div>
        </div>

        {/* 4. Food Near You */}
        {foodMerchants.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-base font-bold text-gray-900">🍛 Food Near You</h2>
                <p className="text-xs text-gray-500">Dhabas, home cooks & restaurants</p>
              </div>
              <a href="/stores" className="text-xs font-medium text-purple-600">See all →</a>
            </div>
            <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-1" style={{ scrollbarWidth: 'none' }}>
              {foodMerchants.map((merchant) => (
                <a key={merchant.id} href={`/stores/${merchant.id}`}
                  className="flex-shrink-0 bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden"
                  style={{ minWidth: 160 }}>
                  {(merchant as any).cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={(merchant as any).cover_image_url}
                      alt={merchant.store_name}
                      className="w-full h-28 object-cover bg-gray-100"
                    />
                  ) : (
                    <div className="w-full h-28 bg-[#7C3AED] flex items-center justify-center">
                      <span className="text-3xl font-bold text-white/40">{merchant.store_name.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="p-2.5">
                    <p className="text-sm font-semibold text-gray-900 truncate">{merchant.store_name}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {getCuisineTags((merchant as any).cuisine_type).map((tag) => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {(merchant as any).rating
                        ? `⭐ ${(merchant as any).rating} • ${deliveryRange(merchant.avg_delivery_time)}`
                        : deliveryRange(merchant.avg_delivery_time)}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* 4. Everyday Essentials */}
        <section>
          <p className="text-base font-semibold text-gray-900 mb-2">Everyday Essentials</p>
          <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1" style={{ scrollbarWidth: 'none' }}>
            {[
              { label: 'Milk', emoji: '🥛', slug: 'dairy' },
              { label: 'Bread', emoji: '🍞', slug: 'bread-bakery' },
              { label: 'Eggs', emoji: '🥚', slug: 'dairy' },
              { label: 'Onions', emoji: '🧅', slug: 'fruits-vegetables' },
              { label: 'Tomatoes', emoji: '🍅', slug: 'fruits-vegetables' },
              { label: 'Potatoes', emoji: '🥔', slug: 'fruits-vegetables' },
              { label: 'Rice', emoji: '🌾', slug: 'groceries' },
              { label: 'Oil', emoji: '🫙', slug: 'groceries' },
              { label: 'Medicine', emoji: '💊', slug: 'medicines' },
              { label: 'Snacks', emoji: '🍪', slug: 'snacks' },
            ].map(item => (
              <a key={item.label} href={`/category/${item.slug}`}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-purple-300 rounded-full text-sm font-medium text-purple-700">
                <span>{item.emoji}</span>
                <span className="whitespace-nowrap">{item.label}</span>
              </a>
            ))}
          </div>
        </section>

        {/* 5. VillageMart Express */}
        <section>
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="text-base font-bold text-[#1A1A1A]">VillageMart Express</h2>
              <p className="text-xs text-[#6B7280]">Fast delivery from our warehouse</p>
            </div>
            <a href="/category/all" className="text-xs text-primary-600 font-medium mt-1">See all →</a>
          </div>
          {ownWithCat.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5">
              {ownWithCat.slice(0, 6).map(p => (
                <ProductCard key={p.id} product={p as Product} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#6B7280] py-8 text-center">Products coming soon</p>
          )}
        </section>

        {/* 6. Categories */}
        {categories.length > 0 && (
          <section>
            <h2 className="text-base font-bold text-[#1A1A1A] mb-2">Categories</h2>
            <div className="grid grid-cols-4 gap-2">
              {categories.map(cat => (
                <Link key={cat.id} href={`/category/${cat.slug}`}>
                  <div className="flex flex-col items-center gap-1.5 p-1.5">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                      style={{ backgroundColor: getCategoryColor(cat.slug) }}
                    >
                      <span>{getCategoryIcon(cat.slug)}</span>
                    </div>
                    <div className="text-center w-full">
                      <p className="text-[11px] font-medium text-[#1A1A1A] leading-tight">{cat.name}</p>
                      <p className="text-[10px] text-[#6B7280] leading-tight">{getCategoryMarathi(cat.slug)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 7. Popular Products */}
        {featuredWithCat.length > 0 && (
          <section>
            <h2 className="text-base font-bold text-[#1A1A1A] mb-2">Popular Products</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {featuredWithCat.slice(0, 4).map(p => (
                <ProductCard key={p.id} product={p as Product} />
              ))}
            </div>
          </section>
        )}

      </main>

      {/* Floating Cart Pill */}
      {mounted && itemCount > 0 && (
        <div
          className="fixed bottom-20 left-4 right-4 z-50 bg-primary-600 text-white rounded-2xl px-4 py-3 flex items-center justify-between shadow-lg md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-auto md:min-w-80"
          style={{ animation: 'slideUp 0.3s ease-out' }}
        >
          <div className="flex items-center gap-2 flex-1">
            <ShoppingCart className="w-4 h-4 shrink-0" />
            <span className="text-sm font-semibold truncate">View cart · {itemCount} items</span>
          </div>
          <button
            onClick={() => router.push('/cart')}
            className="text-sm font-semibold whitespace-nowrap ml-2"
          >
            {formatCurrency(cartTotal)} →
          </button>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(80px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
