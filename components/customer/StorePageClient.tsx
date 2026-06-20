'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Minus, Plus } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { formatCurrency } from '@/lib/utils/format';
import type { Product } from '@/types';

// ── Veg / Non-veg detection ──────────────────────────────────────────────────
const NON_VEG_KEYWORDS = [
  'chicken', 'mutton', 'fish', 'egg', 'prawn', 'meat', 'beef', 'pork', 'non-veg', 'non veg',
];

function isNonVeg(product: Product): boolean {
  const text = `${product.name} ${product.description ?? ''}`.toLowerCase();
  return NON_VEG_KEYWORDS.some(kw => text.includes(kw));
}

// ── Cuisine tags (mirrored from HomePageClient) ───────────────────────────────
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

// ── Bestseller detection ──────────────────────────────────────────────────────
function isBestseller(product: Product): boolean {
  return product.is_bestseller === true;
}

type Filter = 'all' | 'veg' | 'nonveg';

interface StorePageClientProps {
  merchant: any;
  products: Product[];
}

export function StorePageClient({ merchant, products }: StorePageClientProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const { items, addItem, updateQuantity, removeItem } = useCartStore();

  useEffect(() => { setMounted(true); }, []);

  // Combined filter: veg/nonveg + search, bestsellers first
  const filtered = products
    .filter(p => {
      if (filter === 'veg' && isNonVeg(p)) return false;
      if (filter === 'nonveg' && !isNonVeg(p)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => (b.is_bestseller ? 1 : 0) - (a.is_bestseller ? 1 : 0));

  const merchantItems = mounted
    ? items.filter(i => i.product.merchant_id === merchant.id)
    : [];
  const cartCount = merchantItems.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = merchantItems.reduce((s, i) => s + i.product.selling_price * i.quantity, 0);

  const getQty = (id: string) => items.find(i => i.product.id === id)?.quantity ?? 0;

  const deliveryTime = merchant.avg_delivery_time
    ? `${Math.max(merchant.avg_delivery_time - 5, 5)}-${merchant.avg_delivery_time} min`
    : '30-40 min';

  const cuisineTags = getCuisineTags(merchant.cuisine_type ?? null);

  // Track bestseller badge count (cap at 3)
  let bestsellerCount = 0;

  return (
    <div className="min-h-screen bg-white pb-32">

      {/* ── 1. Hero ── */}
      <div className="relative h-52 bg-gray-200">
        {merchant.cover_image_url ? (
          <Image
            src={merchant.cover_image_url}
            alt={merchant.store_name}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-600 to-purple-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Back */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 z-10 w-9 h-9 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-sm"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        {/* Open / Closed badge */}
        <div className="absolute top-4 right-4 z-10">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${merchant.is_open ? 'bg-green-500 text-white' : 'bg-gray-600 text-white'}`}>
            {merchant.is_open ? '● Open' : '● Closed'}
          </span>
        </div>

        {/* Name + cuisine tag pills overlay */}
        <div className="absolute bottom-4 left-4 right-16 z-10">
          <h1 className="text-xl font-bold text-white leading-tight">{merchant.store_name}</h1>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {cuisineTags.map(tag => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── 2. Info bar ── */}
      <div className="bg-white px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5 text-sm text-gray-500 flex-wrap">
          <span>⏱ {deliveryTime}</span>
          <span className="text-gray-200">|</span>
          <span>🛵 Free delivery</span>
          <span className="text-gray-200">|</span>
          <span>⭐ 4.2</span>
          {merchant.min_order_amount > 0 && (
            <>
              <span className="text-gray-200">|</span>
              <span>Min ₹{merchant.min_order_amount}</span>
            </>
          )}
        </div>
      </div>

      {/* ── 3. Veg / Non-veg filter ── */}
      <div className="bg-white px-4 py-3 flex gap-2 border-b border-gray-100">
        {(['all', 'veg', 'nonveg'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === f ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {f === 'all' ? 'All' : f === 'veg' ? '🟢 Veg Only' : '🔴 Non Veg'}
          </button>
        ))}
      </div>

      {/* ── Search bar ── */}
      <div className="bg-white px-4 py-3 border-b border-gray-100">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="🔍 Search dishes..."
          className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-purple-400"
        />
      </div>

      {/* ── 4. Menu ── */}
      <div className="bg-white mt-2">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Menu ({filtered.length} items)</h2>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-8">
            <span className="text-4xl mb-3">
              {filter === 'veg' ? '🥬' : filter === 'nonveg' ? '🍗' : '🔍'}
            </span>
            <p className="text-gray-600 font-medium">No items found</p>
            <p className="text-gray-400 text-sm mt-1">
              {searchQuery
                ? `No dishes matching "${searchQuery}"`
                : filter === 'veg'
                ? 'No veg items available here'
                : 'No non-veg items available here'}
            </p>
          </div>
        ) : (
          filtered.map(product => {
            const qty = mounted ? getQty(product.id) : 0;
            const nonVeg = isNonVeg(product);
            const hasDiscount = product.mrp > product.selling_price;
            const showBestseller = bestsellerCount < 3 && isBestseller(product);
            if (showBestseller) bestsellerCount++;

            return (
              <div key={product.id} className="flex items-start gap-3 px-4 py-3 border-b border-gray-100">

                {/* Left */}
                <div className="flex-1 min-w-0">
                  {/* Veg / Non-veg indicator */}
                  <div className={`w-4 h-4 border-2 rounded-sm flex items-center justify-center mb-1.5 ${nonVeg ? 'border-red-500' : 'border-green-600'}`}>
                    <div className={`w-2 h-2 rounded-full ${nonVeg ? 'bg-red-500' : 'bg-green-600'}`} />
                  </div>

                  {/* Bestseller badge */}
                  {showBestseller && (
                    <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full w-fit mb-0.5 inline-block">
                      🔥 Bestseller
                    </span>
                  )}

                  <p className="font-semibold text-sm text-gray-900 line-clamp-1">{product.name}</p>

                  {product.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{product.description}</p>
                  )}

                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="font-bold text-sm text-gray-900">{formatCurrency(product.selling_price)}</span>
                    {hasDiscount && (
                      <span className="text-xs text-gray-400 line-through">{formatCurrency(product.mrp)}</span>
                    )}
                  </div>

                  {/* ADD / Quantity control */}
                  <div className="mt-2">
                    {mounted && qty > 0 ? (
                      <div className="inline-flex items-center rounded-lg overflow-hidden">
                        <button
                          onClick={() => (qty <= 1 ? removeItem(product.id) : updateQuantity(product.id, qty - 1))}
                          className="bg-purple-600 text-white w-8 h-8 flex items-center justify-center"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="bg-purple-600 text-white text-sm font-bold w-8 h-8 flex items-center justify-center border-x border-purple-500">
                          {qty}
                        </span>
                        <button
                          onClick={() => updateQuantity(product.id, qty + 1)}
                          className="bg-purple-600 text-white w-8 h-8 flex items-center justify-center"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addItem(product)}
                        className="border border-purple-600 text-purple-600 text-sm font-bold px-6 py-1 rounded-lg hover:bg-purple-50 transition-colors"
                      >
                        ADD
                      </button>
                    )}
                  </div>
                </div>

                {/* Right: image */}
                <div className="shrink-0 w-28 h-24 rounded-xl overflow-hidden bg-gray-100">
                  {product.images?.[0] ? (
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      width={112}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-purple-50 flex items-center justify-center">
                      <span className="text-3xl">🍽️</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Sticky Cart Bar ── */}
      {mounted && cartCount > 0 && (
        <div className="fixed bottom-16 left-4 right-4 z-50">
          <button
            onClick={() => router.push('/cart')}
            className="w-full bg-purple-600 text-white rounded-xl py-3 px-4 flex items-center justify-between shadow-lg"
          >
            <span className="text-sm font-semibold">
              {cartCount} item{cartCount !== 1 ? 's' : ''} · {formatCurrency(cartTotal)}
            </span>
            <span className="text-sm font-semibold">View Cart →</span>
          </button>
        </div>
      )}
    </div>
  );
}
