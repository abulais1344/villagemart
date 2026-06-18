'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  MessageCircle,
  Zap,
  Leaf,
  Package,
  Home,
  Pill,
  Cookie,
  Sandwich,
  Egg,
  ShoppingBasket,
  Milk,
  ShoppingCart,
  MapPin,
} from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { ProductCard } from './ProductCard';
import { formatCurrency } from '@/lib/utils/format';
import type { Category, Product, Merchant } from '@/types';

interface HomePageClientProps {
  categories: Category[];
  ownProducts: Product[];
  featuredProducts: Product[];
  merchants: Merchant[];
}

const SEARCH_PLACEHOLDERS = [
  'दूध, ब्रेड, अंडी शोधा...',
  'Search groceries, dairy, snacks...',
  'किराणा, दैनंदिन वस्तू...',
];

const CATEGORY_CONFIG = [
  { slug: 'dairy', icon: Milk, bgColor: '#FEF3C7', iconColor: '#F59E0B', label: 'Dairy', marathi: 'दूध' },
  { slug: 'bread', icon: Sandwich, bgColor: '#FEE2E2', iconColor: '#EF4444', label: 'Bread', marathi: 'ब्रेड' },
  { slug: 'eggs', icon: Egg, bgColor: '#ECFDF5', iconColor: '#10B981', label: 'Eggs', marathi: 'अंडी' },
  { slug: 'vegetables', icon: Leaf, bgColor: '#EFF6FF', iconColor: '#3B82F6', label: 'Veggies', marathi: 'भाज्या' },
  { slug: 'grocery', icon: ShoppingBasket, bgColor: '#F5F0FF', iconColor: '#7C3AED', label: 'Grocery', marathi: 'किराणा' },
  { slug: 'snacks', icon: Cookie, bgColor: '#FFF7ED', iconColor: '#F97316', label: 'Snacks', marathi: 'नाश्ता' },
  { slug: 'medicine', icon: Pill, bgColor: '#F0FDF4', iconColor: '#22C55E', label: 'Medicine', marathi: 'औषध' },
  { slug: 'home', icon: Home, bgColor: '#F3F4F6', iconColor: '#6B7280', label: 'Household', marathi: 'घरगुती' },
];

export function HomePageClient({
  categories,
  ownProducts,
  featuredProducts,
  merchants,
}: HomePageClientProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [searchPlaceholderIndex, setSearchPlaceholderIndex] = useState(0);
  const { items, getSubtotal } = useCartStore();
  const cartTotal = getSubtotal();
  const itemCount = items.length;
  const isOnCartPage = false; // Would be true if on /cart page

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setSearchPlaceholderIndex(prev => (prev + 1) % SEARCH_PLACEHOLDERS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Attach categories to products without SQL join
  const catMap = new Map(categories.map(c => [c.id, c]));
  const withCategory = (products: Product[]) =>
    products.map(p => ({ ...p, category: catMap.get(p.category_id) ?? null }));

  const ownWithCat = withCategory(ownProducts);
  const featuredWithCat = withCategory(featuredProducts);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-[#E5E7EB] px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Location */}
          <div className="flex items-center gap-2 flex-1">
            <MapPin className="w-4 h-4 text-primary-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-[#6B7280]">Delivering to</p>
              <p className="text-xs font-bold text-[#1A1A1A] truncate">Ardhapur, Maharashtra ↓</p>
            </div>
          </div>

          {/* Right: Notifications & Cart */}
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

      {/* Main Content */}
      <main className="px-4 py-4 pb-24 space-y-4">
        {/* Hero Section */}
        <div className="border-l-4 border-primary-600 bg-white p-4 rounded-r-lg">
          <p className="text-[10px] text-[#6B7280] mb-1">आपला गावातील किराणा दुकान</p>
          <h1 className="text-2xl font-bold text-[#1A1A1A] mb-1">Order online, get at home</h1>
          <p className="text-xs text-primary-600 font-medium">⚡ Delivered within Ardhapur · Same day</p>

          {/* Trust badges */}
          <div className="flex gap-3 mt-3">
            <div className="text-xs">🏠 Local products</div>
            <div className="text-xs">📦 Fresh daily stock</div>
          </div>
        </div>

        {/* Search Bar */}
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

        {/* Delivery Promise Bar */}
        <div className="bg-[#F5F0FF] rounded-xl px-4 py-2.5">
          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-primary-600">⚡ Same day delivery</span>
              <span className="text-[#6B7280] ml-2">Order before 6 PM</span>
            </div>
            <span className="text-primary-600 font-semibold">Free above ₹299</span>
          </div>
        </div>

        {/* Categories Grid */}
        {categories.length > 0 && (
          <section>
            <h2 className="text-base font-bold text-[#1A1A1A] mb-3">Categories</h2>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORY_CONFIG.slice(0, 8).map(cat => {
                const Icon = cat.icon;
                return (
                  <Link key={cat.slug} href={`/category/${cat.slug}`}>
                    <div className="flex flex-col items-center gap-2 p-2">
                      <div
                        className="w-16 h-16 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: cat.bgColor }}
                      >
                        <Icon className="w-6 h-6" style={{ color: cat.iconColor }} />
                      </div>
                      <div className="text-center w-full">
                        <p className="text-[11px] font-medium text-[#1A1A1A] leading-tight">{cat.label}</p>
                        <p className="text-[10px] text-[#6B7280] leading-tight">{cat.marathi}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Our Store */}
        <section>
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-base font-bold text-[#1A1A1A]">Our Store</h2>
              <p className="text-xs text-[#6B7280]">VillageMart inventory · Fresh stock daily</p>
            </div>
            <a href="/category/all" className="text-xs text-primary-600 font-medium mt-1">
              See all →
            </a>
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

        {/* Trust Section */}
        <section>
          <h2 className="text-base font-bold text-[#1A1A1A] mb-3">Why VillageMart?</h2>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            <div className="shrink-0 w-36 bg-white border-l-4 border-primary-600 rounded-r-lg px-3 py-3">
              <div className="text-2xl mb-2">🏠</div>
              <p className="text-xs font-semibold text-[#1A1A1A]">Local & Fresh</p>
              <p className="text-[10px] text-[#6B7280] mt-1">रोज ताजे आणतो</p>
            </div>

            <div className="shrink-0 w-36 bg-white border-l-4 border-primary-600 rounded-r-lg px-3 py-3">
              <div className="text-2xl mb-2">📱</div>
              <p className="text-xs font-semibold text-[#1A1A1A]">WhatsApp Support</p>
              <p className="text-[10px] text-[#6B7280] mt-1">मदत लागली तर करा</p>
            </div>

            <div className="shrink-0 w-36 bg-white border-l-4 border-primary-600 rounded-r-lg px-3 py-3">
              <div className="text-2xl mb-2">🚚</div>
              <p className="text-xs font-semibold text-[#1A1A1A]">Same Day</p>
              <p className="text-[10px] text-[#6B7280] mt-1">आज मागवा, आज मिळवा</p>
            </div>
          </div>
        </section>

        {/* Local Stores */}
        {merchants.length > 0 && (
          <section>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-base font-bold text-[#1A1A1A]">Local Stores</h2>
                <p className="text-xs text-[#6B7280]">Order from your favourite shops</p>
              </div>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {merchants.map(merchant => (
                <Link key={merchant.id} href={`/stores/${merchant.id}`}>
                  <div className="shrink-0 w-40 bg-white border border-[#E5E7EB] rounded-xl p-3">
                    <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-600 mb-2">
                      {merchant.store_name
                        ?.split(' ')
                        .map(w => w[0])
                        .join('')
                        .toUpperCase()}
                    </div>
                    <p className="text-xs font-semibold text-[#1A1A1A] line-clamp-1">{merchant.store_name}</p>
                    <p className="text-[10px] text-[#6B7280] mt-1">
                      {merchant.is_open ? (
                        <span className="text-green-600">● Open</span>
                      ) : (
                        <span className="text-[#6B7280]">● Closed</span>
                      )}
                    </p>
                    <p className="text-[10px] text-[#6B7280] mt-1">~30 mins</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Popular Products */}
        {featuredWithCat.length > 0 && (
          <section>
            <h2 className="text-base font-bold text-[#1A1A1A] mb-3">Popular Products</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {featuredWithCat.slice(0, 4).map(p => (
                <ProductCard key={p.id} product={p as Product} />
              ))}
            </div>
          </section>
        )}

        {/* WhatsApp Help Strip */}
        <div className="bg-[#25D366] rounded-xl px-4 py-3 flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-5 h-5 text-white" />
            <span className="text-white text-sm font-medium">Need help? Chat with us</span>
          </div>
          <a href="https://wa.me/919999999999" target="_blank" rel="noopener noreferrer" className="text-white text-xs font-semibold">
            Open →
          </a>
        </div>
      </main>

      {/* Floating Cart Pill */}
      {mounted && itemCount > 0 && !isOnCartPage && (
        <div
          className="fixed bottom-20 left-4 right-4 z-50 bg-primary-600 text-white rounded-2xl px-4 py-3 flex items-center justify-between shadow-lg md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-auto md:min-w-80"
          style={{
            animation: 'slideUp 0.3s ease-out',
          }}
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
          from {
            transform: translateY(80px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
