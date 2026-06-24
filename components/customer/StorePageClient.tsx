'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Minus, Plus, ChevronDown, X } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils/format';
import type { Product } from '@/types';

function isNonVeg(product: Product): boolean {
  return product.is_veg === false;
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

function isBestseller(product: Product): boolean {
  return product.is_bestseller === true;
}

function slugCat(cat: string) {
  return cat.replace(/\s+/g, '-');
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
  const [conflictProduct, setConflictProduct] = useState<Product | null>(null);
  const [otherStoreName, setOtherStoreName] = useState('another restaurant');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [showMenuSheet, setShowMenuSheet] = useState(false);
  const [selectedImage, setSelectedImage] = useState<Product | null>(null);
  const [imgVisible, setImgVisible] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const categoryNavRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchDeltaY = useRef(0);
  const { items, addItem, updateQuantity, removeItem, clearCart } = useCartStore();
  const supabase = createClient();

  useEffect(() => { setMounted(true); }, []);

  function closeViewer() {
    setImgVisible(false);
    setTimeout(() => setSelectedImage(null), 220);
  }

  useEffect(() => {
    if (!selectedImage) return;
    setImgLoaded(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setImgVisible(true)));
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeViewer(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [selectedImage]);

  // ── IntersectionObserver scroll spy ──────────────────────────────────────
  useEffect(() => {
    if (searchQuery.trim()) return;

    const filteredForObs = products.filter(p => {
      if (filter === 'veg' && isNonVeg(p)) return false;
      if (filter === 'nonveg' && !isNonVeg(p)) return false;
      return true;
    });

    const seen = new Set<string>();
    const cats: string[] = [];
    for (const p of filteredForObs) {
      const cat = p.description?.trim();
      if (cat && !seen.has(cat)) { seen.add(cat); cats.push(cat); }
    }

    if (cats.length > 0) setActiveCategory(prev => prev || cats[0]);

    const observers: IntersectionObserver[] = [];
    cats.forEach(cat => {
      const el = document.getElementById(`section-${slugCat(cat)}`);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveCategory(cat); },
        { threshold: 0.1, rootMargin: '-60px 0px -40% 0px' },
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach(o => o.disconnect());
  }, [products, filter, searchQuery]);

  // ── Auto-scroll active pill into view in nav bar ──────────────────────────
  useEffect(() => {
    if (!activeCategory) return;
    const pill = document.getElementById(`pill-${slugCat(activeCategory)}`);
    pill?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activeCategory]);

  // ── Pill / sheet tap → smooth scroll to section ──────────────────────────
  function scrollToSection(cat: string) {
    // expand if collapsed
    setCollapsedSections(prev => {
      if (!prev.has(cat)) return prev;
      const next = new Set(prev);
      next.delete(cat);
      return next;
    });
    setActiveCategory(cat);
    const el = document.getElementById(`section-${slugCat(cat)}`);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 160;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }

  function toggleSection(cat: string) {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  }

  async function handleAddItem(product: Product) {
    const otherItem = items.find(i => i.product.merchant_id !== merchant.id);
    if (otherItem) {
      const otherId = otherItem.product.merchant_id;
      let name = 'another restaurant';
      if (otherId) {
        const { data } = await supabase.from('merchants').select('store_name').eq('id', otherId).single();
        name = data?.store_name ?? 'another restaurant';
      }
      setOtherStoreName(name);
      setConflictProduct(product);
      return;
    }
    addItem(product);
  }

  // Combined filter + search, bestsellers first
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

  // Order-preserving unique categories + grouped map
  const categories: string[] = [];
  const seenCats = new Set<string>();
  for (const p of filtered) {
    const cat = p.description?.trim();
    if (cat && !seenCats.has(cat)) { seenCats.add(cat); categories.push(cat); }
  }

  const grouped = new Map<string, Product[]>();
  for (const p of filtered) {
    const cat = p.description?.trim() ?? 'Other';
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(p);
  }

  const merchantItems = mounted ? items.filter(i => i.product.merchant_id === merchant.id) : [];
  const cartCount = merchantItems.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = merchantItems.reduce((s, i) => s + i.product.selling_price * i.quantity, 0);

  const getQty = (id: string) => items.find(i => i.product.id === id)?.quantity ?? 0;

  const deliveryTime = merchant.avg_delivery_time
    ? `${Math.max(merchant.avg_delivery_time - 5, 5)}-${merchant.avg_delivery_time} min`
    : '30-40 min';

  const cuisineTags = getCuisineTags(merchant.cuisine_type ?? null);
  const isGrouped = !searchQuery.trim() && categories.length > 0;
  const popularItems = products.filter(p => isBestseller(p)).slice(0, 8);

  let bestsellerCount = 0;
  let productRenderIndex = 0;

  // hideDescription when in grouped mode (description field IS the category name)
  const renderProduct = (product: Product) => {
    const renderIdx = productRenderIndex++;
    const qty = mounted ? getQty(product.id) : 0;
    const nonVeg = isNonVeg(product);
    const hasDiscount = product.mrp > product.selling_price;
    const showBestseller = bestsellerCount < 3 && isBestseller(product);
    if (showBestseller) bestsellerCount++;

    return (
      <div key={product.id} className="flex items-start gap-3 px-4 py-3 border-b border-gray-100">

        {/* Left */}
        <div className="flex-1 min-w-0">
          {/* Row 1: veg dot + bestseller badge */}
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-4 h-4 border-2 rounded-sm flex items-center justify-center shrink-0 ${nonVeg ? 'border-red-500' : 'border-green-600'}`}>
              <div className={`w-2 h-2 rounded-full ${nonVeg ? 'bg-red-500' : 'bg-green-600'}`} />
            </div>
            {showBestseller && (
              <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                🔥 Bestseller
              </span>
            )}
          </div>

          <p className="font-medium text-sm text-gray-900 line-clamp-1">{product.name}</p>

          {/* Only show description when searching (not redundant in flat results) */}
          {!isGrouped && product.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{product.description}</p>
          )}

          <div className="flex items-center gap-2 mt-1">
            <span className="font-semibold text-sm text-gray-900">{formatCurrency(product.selling_price)}</span>
            {hasDiscount && (
              <span className="text-xs text-gray-400 line-through">{formatCurrency(product.mrp)}</span>
            )}
          </div>

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
                onClick={() => handleAddItem(product)}
                className="border border-purple-600 text-purple-600 text-sm font-bold px-6 py-1 rounded-lg hover:bg-purple-50 transition-colors"
              >
                ADD
              </button>
            )}
          </div>
        </div>

        {/* Right: image — tappable to open fullscreen viewer */}
        <div
          className={`shrink-0 w-28 h-24 rounded-xl overflow-hidden bg-gray-100 ${product.images?.[0] ? 'cursor-pointer active:opacity-80' : ''}`}
          onClick={() => product.images?.[0] && setSelectedImage(product)}
        >
          {product.images?.[0] ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              width={112}
              height={96}
              className="w-full h-full object-cover"
              priority={renderIdx < 6}
            />
          ) : (
            <div className="w-full h-full bg-purple-50 flex items-center justify-center">
              <span className="text-3xl">🍽️</span>
            </div>
          )}
        </div>
      </div>
    );
  };

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

        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 z-10 w-9 h-9 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-sm"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        <div className="absolute top-4 right-4 z-10">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${merchant.is_open ? 'bg-green-500 text-white' : 'bg-gray-600 text-white'}`}>
            {merchant.is_open ? '● Open' : '● Closed'}
          </span>
        </div>

        <div className="absolute bottom-4 left-4 right-16 z-10">
          <h1 className="text-xl font-bold text-white leading-tight">{merchant.store_name}</h1>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {cuisineTags.map(tag => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm">
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

      {/* ── Search bar ── */}
      <div className="bg-white px-4 pt-3 pb-2 border-b border-gray-100">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="🔍 Search dishes..."
          className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-purple-400"
        />
      </div>

      {/* ── Veg / Non-veg filter ── */}
      <div className="bg-white px-4 py-2 flex gap-2 border-b border-gray-100">
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

      {/* ── Popular Items ── */}
      {popularItems.length > 0 && !searchQuery.trim() && (
        <div className="bg-white pt-4 pb-3 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 px-4 mb-3">🔥 Popular Items</h2>
          <div className="flex gap-3 overflow-x-auto px-4" style={{ scrollbarWidth: 'none' } as React.CSSProperties}>
            {popularItems.map(product => (
              <button
                key={product.id}
                onClick={() => product.images?.[0] ? setSelectedImage(product) : scrollToSection(product.description?.trim() ?? '')}
                className="flex-shrink-0 flex flex-col gap-1 text-left cursor-pointer"
              >
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100">
                  {product.images?.[0] ? (
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-purple-50 flex items-center justify-center">
                      <span className="text-xl">🍽️</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-800 font-medium w-20 line-clamp-2 leading-tight">{product.name}</p>
                <p className="text-xs font-bold text-gray-900">{formatCurrency(product.selling_price)}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Category nav bar (hidden while searching) ── */}
      {!searchQuery.trim() && categories.length > 1 && (
        <div
          ref={categoryNavRef}
          className="sticky top-0 z-30 bg-white flex gap-2 overflow-x-auto px-4 py-3"
          style={{ scrollbarWidth: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' } as React.CSSProperties}
        >
          {categories.map(cat => {
            const catProducts = grouped.get(cat) ?? [];
            const count = catProducts.length;
            const allVeg = count > 0 && catProducts.every(p => !isNonVeg(p));
            const allNonVeg = count > 0 && catProducts.every(p => isNonVeg(p));
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                id={`pill-${slugCat(cat)}`}
                onClick={() => scrollToSection(cat)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                {(allVeg || allNonVeg) && (
                  <span className={`w-2 h-2 rounded-full shrink-0 ${allVeg ? 'bg-green-500' : 'bg-red-500'}`} />
                )}
                {cat}{' '}
                <span className={`font-normal ${isActive ? 'text-purple-200' : 'text-gray-400'}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      )}

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
        ) : searchQuery.trim() ? (
          filtered.map(product => renderProduct(product))
        ) : (
          Array.from(grouped.entries()).map(([cat, catProducts]) => {
            const collapsed = collapsedSections.has(cat);
            return (
              <div key={cat} id={`section-${slugCat(cat)}`}>
                {/* Section header — sticky below category nav */}
                <button
                  onClick={() => toggleSection(cat)}
                  className="w-full sticky top-[52px] z-20 flex items-center justify-between bg-gray-50 border-l-4 border-purple-600 px-4 py-3 border-b border-gray-200 text-left"
                >
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{cat}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {catProducts.length} item{catProducts.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-purple-500 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Products (hidden when collapsed) */}
                {!collapsed && catProducts.map(product => renderProduct(product))}
              </div>
            );
          })
        )}
      </div>

      {/* ── "≡ Menu" FAB ── */}
      {isGrouped && (
        <button
          onClick={() => setShowMenuSheet(true)}
          className={`fixed right-4 z-40 flex items-center gap-2 bg-gray-900 border border-white/20 shadow-xl rounded-full px-5 py-3 text-sm font-semibold text-white transition-all ${
            cartCount > 0 ? 'bottom-36' : 'bottom-24'
          }`}
        >
          <span className="text-base leading-none">🍽️</span>
          Menu
        </button>
      )}


      {/* ── Mixed-cart conflict modal ── */}
      {conflictProduct && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-8">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-3">
            <p className="font-bold text-gray-900 text-base">Start new order?</p>
            <p className="text-sm text-gray-600 leading-snug">
              Your cart has items from{' '}
              <span className="font-semibold">{otherStoreName}</span>.
              Clear cart to add items from{' '}
              <span className="font-semibold">{merchant.store_name}</span>?
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setConflictProduct(null)}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-700"
              >
                Keep Cart
              </button>
              <button
                onClick={() => {
                  clearCart();
                  addItem(conflictProduct);
                  setConflictProduct(null);
                }}
                className="flex-1 bg-purple-600 text-white rounded-xl py-2.5 text-sm font-semibold"
              >
                Clear &amp; Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Fullscreen image viewer ── */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{
            backgroundColor: `rgba(0,0,0,${imgVisible ? '0.88' : '0'})`,
            backdropFilter: `blur(${imgVisible ? '6px' : '0px'})`,
            transition: 'background-color 150ms ease-out, backdrop-filter 150ms ease-out',
          }}
          onClick={closeViewer}
          onTouchStart={e => { touchStartY.current = e.touches[0].clientY; touchDeltaY.current = 0; }}
          onTouchMove={e => { touchDeltaY.current = e.touches[0].clientY - touchStartY.current; }}
          onTouchEnd={() => { if (touchDeltaY.current > 80) closeViewer(); }}
        >
          {/* Close button */}
          <button
            onClick={closeViewer}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(8px)',
              opacity: imgVisible ? 1 : 0,
              transition: 'opacity 200ms ease-out',
            }}
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Image area — fills space above bottom sheet */}
          <div
            className="flex-1 min-h-0 flex items-center justify-center px-5 pt-14 bg-black"
            onClick={e => e.stopPropagation()}
            style={{
              opacity: imgVisible ? 1 : 0,
              transform: imgVisible ? 'scale(1)' : 'scale(0.92)',
              transition: 'opacity 200ms ease-out, transform 200ms ease-out',
            }}
          >
            <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl bg-black" style={{ height: '50vh' }}>
              {/* Blur placeholder — renders instantly from cached thumbnail */}
              <Image
                src={selectedImage.images![0]}
                alt=""
                fill
                className="object-cover scale-110 blur-xl"
                style={{ opacity: imgLoaded ? 0 : 1, transition: 'opacity 300ms ease-out' }}
                sizes="90vw"
              />
              {/* Full-res image fades in on load */}
              <Image
                src={selectedImage.images![0]}
                alt={selectedImage.name}
                fill
                className="object-cover"
                style={{ opacity: imgLoaded ? 1 : 0, transition: 'opacity 300ms ease-out' }}
                sizes="90vw"
                priority
                onLoad={() => setImgLoaded(true)}
              />
            </div>
          </div>

          {/* Bottom info card — slides up */}
          <div
            className="bg-white rounded-t-3xl px-5 pt-4 pb-10 shrink-0"
            onClick={e => e.stopPropagation()}
            style={{
              transform: imgVisible ? 'translateY(0)' : 'translateY(100%)',
              transition: 'transform 200ms ease-out',
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center mb-3">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            {/* Veg dot + name */}
            <div className="flex items-start gap-2 mb-1">
              <div className={`mt-1 w-4 h-4 border-2 rounded-sm flex items-center justify-center shrink-0 ${isNonVeg(selectedImage) ? 'border-red-500' : 'border-green-600'}`}>
                <div className={`w-2 h-2 rounded-full ${isNonVeg(selectedImage) ? 'bg-red-500' : 'bg-green-600'}`} />
              </div>
              <p className="text-xl font-bold text-gray-900 leading-snug">{selectedImage.name}</p>
            </div>

            {/* Price */}
            <p className="text-lg font-semibold text-purple-600 ml-6 mb-2">{formatCurrency(selectedImage.selling_price)}</p>

            {/* Description (only in search/flat mode — in grouped mode it's the category name) */}
            {!isGrouped && selectedImage.description && (
              <p className="text-sm text-gray-500 ml-6 mb-3 leading-relaxed">{selectedImage.description}</p>
            )}

            {/* Cart control */}
            {mounted && (() => {
              const qty = getQty(selectedImage.id);
              return qty > 0 ? (
                <div className="flex items-center gap-4 mt-3">
                  <div className="inline-flex items-center rounded-xl overflow-hidden">
                    <button
                      onClick={() => qty <= 1 ? removeItem(selectedImage.id) : updateQuantity(selectedImage.id, qty - 1)}
                      className="bg-purple-600 text-white w-11 h-11 flex items-center justify-center"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="bg-purple-600 text-white text-sm font-bold w-11 h-11 flex items-center justify-center border-x border-purple-500">
                      {qty}
                    </span>
                    <button
                      onClick={() => updateQuantity(selectedImage.id, qty + 1)}
                      className="bg-purple-600 text-white w-11 h-11 flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-sm text-gray-500">{qty} in cart</span>
                </div>
              ) : (
                <button
                  onClick={() => handleAddItem(selectedImage)}
                  className="w-full py-4 rounded-xl text-white font-bold text-sm mt-2 shadow-lg shadow-purple-200 bg-gradient-to-r from-purple-600 to-purple-700"
                >
                  Add to Cart
                </button>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Menu bottom sheet ── */}
      {showMenuSheet && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/40"
          onClick={() => setShowMenuSheet(false)}
        >
          <div
            className="bg-white rounded-t-2xl w-full max-h-[65vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="text-base font-bold text-gray-900">Menu</h3>
              <button onClick={() => setShowMenuSheet(false)} className="p-1.5 rounded-full hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            {categories.map(cat => {
              const catProducts = grouped.get(cat) ?? [];
              const count = catProducts.length;
              const allVeg = count > 0 && catProducts.every(p => !isNonVeg(p));
              const allNonVeg = count > 0 && catProducts.every(p => isNonVeg(p));
              const dot = allVeg ? '🟢' : allNonVeg ? '🔴' : null;
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    scrollToSection(cat);
                    setShowMenuSheet(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3.5 border-b border-gray-100 hover:bg-gray-50 text-left ${isActive ? 'border-l-2 border-l-purple-600 pl-3.5' : ''}`}
                >
                  <span className="flex items-center gap-2">
                    {dot && <span className="text-xs leading-none">{dot}</span>}
                    <span className={`text-sm font-medium ${isActive ? 'text-purple-600' : 'text-gray-800'}`}>{cat}</span>
                  </span>
                  <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full shrink-0">{count}</span>
                </button>
              );
            })}
            <div className="pb-8" />
          </div>
        </div>
      )}
    </div>
  );
}
