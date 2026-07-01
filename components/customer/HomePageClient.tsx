'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Search, Bell, ShoppingCart, User } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { createClient } from '@/lib/supabase/client';
import { ProductCard } from './ProductCard';
import { formatCurrency } from '@/lib/utils/format';
import type { Category, Product, Merchant } from '@/types';
import type { Customer, AddressData } from '@/lib/customer';
import { AddressManager } from './AddressManager';
import { PulseHint } from './PulseHint';
import { useFirstVisit } from '@/hooks/useFirstVisit';

interface HomePageClientProps {
  categories: Category[];
  ownProducts: Product[];
  featuredProducts: Product[];
  merchants: Merchant[];
  foodMerchants: Merchant[];
}

// Pastel colour palette — cycles by index so any new category gets a colour
const CATEGORY_COLORS = [
  '#FEF9C3','#FEE2E2','#DCFCE7','#EDE9FE',
  '#FEF3C7','#F3F4F6','#FCE7F3','#DBEAFE',
  '#D1FAE5','#FFF7ED','#E0F2FE','#F0FDF4',
];

function getCuisineTags(cuisineType: string | null): string[] {
  if (!cuisineType) return ['🍽️ Meals'];
  const tags = cuisineType.split(',').map(t => t.trim()).filter(Boolean);
  return tags.length > 0 ? tags.slice(0, 3) : ['🍽️ Meals'];
}

function isRestaurantOpen(openingTime: string | null, closingTime: string | null): boolean {
  if (!openingTime || !closingTime) return true;
  const now = new Date();
  const [openH, openM] = openingTime.split(':').map(Number);
  const [closeH, closeM] = closingTime.split(':').map(Number);
  const nowMins  = now.getHours() * 60 + now.getMinutes();
  const openMins = openH * 60 + openM;
  const closeMins = closeH * 60 + closeM;
  if (closeMins > openMins) return nowMins >= openMins && nowMins < closeMins;
  return nowMins >= openMins || nowMins < closeMins; // overnight
}

function deliveryRange(avg: number): string {
  return `${Math.max(avg - 5, 5)}-${avg} min`;
}

const SEARCH_PLACEHOLDERS = [
  'रेस्टॉरंट, जेवण शोधा...',
  'Search restaurants, dishes...',
  'Search biryani, thali, snacks...',
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
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [showAddressSheet, setShowAddressSheet] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { items, getSubtotal } = useCartStore();
  const cartTotal = getSubtotal();
  const itemCount = items.length;
  const [showAddHint, markAddSeen] = useFirstVisit('add_product');
  const [showCartHint, markCartSeen] = useFirstVisit('cart_icon');
  const [activeOffers, setActiveOffers] = useState<Array<{
    id: string;
    title: string;
    discount_type: string;
    discount_value: number;
    min_order_amount: number;
    max_discount: number | null;
    first_order_only: boolean;
  }>>([]);

  useEffect(() => {
    setMounted(true);
    let phone: string | null = null;
    try {
      const raw = localStorage.getItem('vm_customer');
      if (raw) {
        const c = JSON.parse(raw);
        setCustomer(c);
        phone = c.phone ?? null;
        if (phone) fetchUnread(phone);
      }
    } catch {}

    fetch('/api/customer/offers')
      .then(r => r.json())
      .then(data => { if (data.offers?.length) setActiveOffers(data.offers); })
      .catch(() => {});

    const interval = setInterval(() => { if (phone) fetchUnread(phone); }, 30000);
    function handleRead() { setUnreadCount(0); }
    window.addEventListener('notificationsRead', handleRead);
    return () => {
      clearInterval(interval);
      window.removeEventListener('notificationsRead', handleRead);
    };
  }, []);

  async function fetchUnread(phone: string) {
    try {
      const supabase = createClient();
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_phone', phone)
        .eq('is_read', false);
      setUnreadCount(count ?? 0);
    } catch {}
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setSearchPlaceholderIndex(prev => (prev + 1) % SEARCH_PLACEHOLDERS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  function handleAddressChange(_addr: AddressData) {
    try {
      const raw = localStorage.getItem('vm_customer');
      if (raw) setCustomer(JSON.parse(raw));
    } catch {}
  }

  const activeAddr = customer?.addresses?.[customer.active_address_index ?? 0] ?? null;

  const catMap = new Map(categories.map(c => [c.id, c]));
  const withCategory = (products: Product[]) =>
    products.map(p => ({ ...p, category: catMap.get(p.category_id) ?? null }));

  const ownWithCat = withCategory(ownProducts);
  const featuredWithCat = withCategory(featuredProducts);

  return (
    <div className="min-h-screen bg-white">
      {/* 1. Location Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-[#E5E7EB] px-4 py-3">
        <div className="flex items-center gap-2">
          {/* Logo */}
          <Link href="/" className="shrink-0">
            <div className="flex items-center gap-0">
              <span className="text-purple-600 font-black text-xl tracking-tight leading-none">Z</span>
              <span className="text-gray-900 font-bold text-xl tracking-tight leading-none">upr</span>
            </div>
          </Link>

          {/* Left: address */}
          <button onClick={() => setShowAddressSheet(true)} className="min-w-0 flex-1 text-left">
            <p className="text-[10px] text-gray-400">Delivering to</p>
            <p className={`text-sm font-semibold truncate max-w-[180px] ${mounted && activeAddr ? 'text-gray-900' : 'text-purple-600'}`}>
              {mounted
                ? activeAddr
                  ? `${activeAddr.label === 'Home' ? '🏠' : activeAddr.label === 'Work' ? '💼' : '📍'} ${activeAddr.label} · ${activeAddr.area || 'Ardhapur'}`
                  : customer?.area || customer?.address || 'Set location'
                : 'Ardhapur'} ↓
            </p>
          </button>

          {/* Right: bell, cart, profile avatar */}
          <div className="flex items-center gap-1 shrink-0">
            <Link href="/notifications" className="p-2 rounded-xl hover:bg-gray-100 relative">
              <Bell className="w-5 h-5 text-[#6B7280]" />
              {mounted && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-0.5 flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
            <PulseHint show={mounted && itemCount > 0 && showCartHint} label="View cart 🛒" position="bottom">
              <Link href="/cart" onClick={markCartSeen} className="p-2 rounded-xl hover:bg-gray-100 relative">
                <ShoppingCart className="w-5 h-5 text-[#6B7280]" />
                {mounted && itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-primary-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </Link>
            </PulseHint>
            <Link href="/profile" className="p-1 rounded-xl hover:bg-gray-100">
              {mounted && customer?.name ? (
                <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-500" />
                </div>
              )}
            </Link>
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

        {/* 3. Offers Strip */}
        {activeOffers.length > 0 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
            {activeOffers.map(offer => {
              const value = offer.discount_type === 'flat'
                ? `₹${offer.discount_value} OFF`
                : `${offer.discount_value}% OFF`;
              const sub = [
                offer.min_order_amount > 0 && `Min ₹${offer.min_order_amount}`,
                offer.first_order_only && 'First order only',
              ].filter(Boolean).join(' · ');
              return (
                <div
                  key={offer.id}
                  className="shrink-0 flex items-center gap-2.5 bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white rounded-2xl px-4 py-2.5"
                  style={{ minWidth: 200 }}
                >
                  <span className="text-xl leading-none">🎁</span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold leading-tight truncate">{value} · {offer.title}</p>
                    {sub && <p className="text-[11px] text-purple-200 mt-0.5 truncate">{sub}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 4. Delivery Strip */}
        <div className="bg-[#F5F0FF] rounded-xl px-4 py-2.5">
          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-primary-600">⚡ 30 min delivery</span>
              <span className="text-[#6B7280] ml-2">Order before 10 PM</span>
            </div>
            <span className="text-primary-600 font-semibold">Free above ₹199</span>
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
              <Link href="/stores" className="text-xs font-medium text-purple-600">See all →</Link>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {foodMerchants.length} restaurant{foodMerchants.length !== 1 ? 's' : ''} open
            </p>
            <div className="flex flex-col gap-3 mt-2">
              {foodMerchants.map((merchant, index) => {
                const open = isRestaurantOpen(
                  (merchant as any).opening_time,
                  (merchant as any).closing_time
                );
                return (
                  <Link key={merchant.id} href={`/stores/${merchant.id}`}
                    className="w-full bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                    {/* Cover image */}
                    {(merchant as any).cover_image_url ? (
                      <div className="relative w-full h-44 bg-gray-100">
                        <Image
                          src={(merchant as any).cover_image_url}
                          alt={merchant.store_name}
                          fill
                          className="object-cover"
                          sizes="100vw"
                          priority={index === 0}
                        />
                        {!open && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white font-semibold text-sm bg-black/60 px-3 py-1 rounded-full">
                              Closed
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="relative w-full h-44 bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] flex items-center justify-center">
                        <span className="text-6xl font-bold text-white/30">{merchant.store_name.charAt(0).toUpperCase()}</span>
                        {!open && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white font-semibold text-sm bg-black/60 px-3 py-1 rounded-full">
                              Closed
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Card body */}
                    <div className="p-3">
                      {/* Row 1: name + rating badge */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="font-semibold text-base text-gray-900 truncate">{merchant.store_name}</p>
                        {(merchant as any).rating && (
                          <span className="shrink-0 bg-green-600 text-white text-xs px-2 py-0.5 rounded-lg font-medium">
                            ⭐ {(merchant as any).rating}
                          </span>
                        )}
                      </div>
                      {/* Row 2: cuisine tags */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {getCuisineTags((merchant as any).cuisine_type).map((tag) => (
                          <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                            {tag}
                          </span>
                        ))}
                      </div>
                      {/* Row 3: open/closed pill + delivery time + free delivery */}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-2">
                          {open ? (
                            <span className="text-[10px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">● Open</span>
                          ) : (
                            <span className="text-[10px] font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full">● Closed</span>
                          )}
                          <span>🕐 {deliveryRange(merchant.avg_delivery_time)}</span>
                        </div>
                        <span>Free delivery above ₹199</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Everyday Essentials — dynamic from DB */}
        {categories.length > 0 && (
          <section>
            <p className="text-base font-semibold text-gray-900 mb-2">Everyday Essentials</p>
            <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1" style={{ scrollbarWidth: 'none' }}>
              {categories.map(cat => (
                <Link key={cat.id} href={`/category/${cat.slug}`}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-purple-300 rounded-full text-sm font-medium text-purple-700">
                  <span>{cat.emoji ?? '📦'}</span>
                  <span className="whitespace-nowrap">{cat.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 5. Zupr Express */}
        <section>
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="text-base font-bold text-[#1A1A1A]">Zupr Express</h2>
              <p className="text-xs text-[#6B7280]">Fast delivery from our warehouse</p>
            </div>
            <Link href="/category/all" className="text-xs text-primary-600 font-medium mt-1">See all →</Link>
          </div>
          {ownWithCat.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5">
              {ownWithCat.slice(0, 6).map((p, index) => (
                <ProductCard
                  key={p.id}
                  product={p as Product}
                  hint={showAddHint && index === 0}
                  onHintDismiss={markAddSeen}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#6B7280] py-8 text-center">Products coming soon</p>
          )}
        </section>

        {/* 6. Categories — dynamic from DB */}
        {categories.length > 0 && (
          <section>
            <h2 className="text-base font-bold text-[#1A1A1A] mb-2">Categories</h2>
            <div className="grid grid-cols-4 gap-2">
              {categories.map((cat, index) => (
                <Link key={cat.id} href={`/category/${cat.slug}`}>
                  <div className="flex flex-col items-center gap-1.5 p-1.5">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                      style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                    >
                      <span>{cat.emoji ?? '📦'}</span>
                    </div>
                    <p className="text-[11px] font-medium text-[#1A1A1A] leading-tight text-center w-full">{cat.name}</p>
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

      <AddressManager
        isOpen={showAddressSheet}
        onClose={() => setShowAddressSheet(false)}
        onAddressChange={handleAddressChange}
      />

    </div>
  );
}
