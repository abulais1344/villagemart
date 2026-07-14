'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ProductImage } from '@/components/shared/ProductImage';
import { ArrowLeft, Minus, Plus, ChevronDown, X } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatTime12hr } from '@/lib/utils/format';
import type { Product } from '@/types';
import toast from 'react-hot-toast';

function isNonVeg(product: Product): boolean {
  return product.is_veg === false;
}

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
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const openMins = openH * 60 + openM;
  const closeMins = closeH * 60 + closeM;
  if (closeMins > openMins) return nowMins >= openMins && nowMins < closeMins;
  return nowMins >= openMins || nowMins < closeMins;
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
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [justInstalled, setJustInstalled] = useState(false);
  const [conflictProduct, setConflictProduct] = useState<Product | null>(null);
  const [otherStoreName, setOtherStoreName] = useState('another restaurant');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [showMenuSheet, setShowMenuSheet] = useState(false);
  const [selectedImage, setSelectedImage] = useState<Product | null>(null);
  const [imgVisible, setImgVisible] = useState(false);
  const [viewerProduct, setViewerProduct] = useState<Product | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerLoaded, setViewerLoaded] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [isPinching, setIsPinching] = useState(false);
  const categoryNavRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchDeltaY = useRef(0);
  const pinchDist = useRef<number | null>(null);
  const pinchBaseScale = useRef(1);
  const lastTapMs = useRef(0);
  const viewerSwipeY = useRef(0);
  const viewerSwipeDelta = useRef(0);
  const { items, addItem, updateQuantity, removeItem, clearCart } = useCartStore();
  const supabase = createClient();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const dismissed = localStorage.getItem('pwa_install_dismissed');
    if (isStandalone || dismissed) return;

    const onPrompt = (e: Event) => { e.preventDefault(); setInstallPrompt(e); };
    const onInstalled = () => { setInstallPrompt(null); setJustInstalled(true); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  useEffect(() => {
    function trackInstall() {
      fetch('/api/track-install', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: 'customer' }) }).catch(() => {});
      window.removeEventListener('appinstalled', trackInstall);
    }
    window.addEventListener('appinstalled', trackInstall);
    return () => window.removeEventListener('appinstalled', trackInstall);
  }, []);

  async function handleInstall() {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') { setInstallPrompt(null); setJustInstalled(true); }
  }

  function handleDismissInstall() {
    localStorage.setItem('pwa_install_dismissed', '1');
    setInstallPrompt(null);
  }

  function closeSheet() {
    setImgVisible(false);
    setTimeout(() => setSelectedImage(null), 250);
  }

  function openFullViewer() {
    setViewerProduct(selectedImage);
    setZoomScale(1);
    setViewerLoaded(false);
  }

  function closeFullViewer() {
    setViewerVisible(false);
    setTimeout(() => setViewerProduct(null), 220);
  }

  useEffect(() => {
    if (selectedImage) {
      requestAnimationFrame(() => requestAnimationFrame(() => setImgVisible(true)));
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [selectedImage]);

  useEffect(() => {
    if (viewerProduct) {
      setViewerLoaded(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setViewerVisible(true)));
    }
  }, [viewerProduct]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (viewerProduct) closeFullViewer();
      else if (selectedImage) closeSheet();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedImage, viewerProduct]);

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
  const isOpen = isRestaurantOpen(merchant.opening_time ?? null, merchant.closing_time ?? null);
  const isGrouped = !searchQuery.trim() && categories.length > 0;
  const popularItems = filtered.filter(isBestseller).slice(0, 8);

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
                onClick={() => {
                  if (!isOpen) {
                    toast.error(`${merchant.store_name} is closed. Opens at ${merchant.opening_time ? formatTime12hr(merchant.opening_time) : '—'}`);
                    return;
                  }
                  handleAddItem(product);
                }}
                className={`border border-purple-600 text-purple-600 text-sm font-bold px-6 py-1 rounded-lg transition-colors ${!isOpen ? 'opacity-40 cursor-not-allowed' : 'hover:bg-purple-50'}`}
              >
                ADD
              </button>
            )}
          </div>
        </div>

        {/* Right: image — tappable to open product detail sheet */}
        <div
          className={`shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-gray-100 ${product.images?.[0] ? 'cursor-pointer active:opacity-80' : ''}`}
          onClick={() => product.images?.[0] && setSelectedImage(product)}
        >
          <ProductImage
            images={product.images}
            categorySlug={product.category?.slug}
            alt={product.name}
            width={96}
            height={96}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white pb-40">

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
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isOpen ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
            {isOpen ? '● Open' : '● Closed'}
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

      {/* ── PWA install banner (Chrome/Android only; hidden if already installed or dismissed) ── */}
      {installPrompt && !justInstalled && (
        <div className="bg-[#7C3AED] text-white px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">📲 Install App for easy access</p>
            <p className="text-xs opacity-80 mt-0.5">Order faster — works like a native app</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleInstall}
              className="bg-white text-[#7C3AED] rounded-lg px-3 py-1.5 text-xs font-semibold"
            >
              Install
            </button>
            <button
              onClick={handleDismissInstall}
              className="text-white/60 text-lg leading-none px-1"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      )}
      {justInstalled && (
        <div className="bg-green-600 text-white text-sm font-medium text-center px-4 py-2">
          App installed! ✅
        </div>
      )}

      {/* ── Parcel delivery banner ── */}
      {merchant.parcel_service_enabled && (
        <a
          href={`/parcel/${merchant.id}`}
          className="flex items-center justify-between px-4 py-2.5 bg-amber-50 border-b border-amber-100 gap-3"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-800">📦 Need delivery in Nanded or nearby?</p>
            <p className="text-xs text-amber-700 mt-0.5">We deliver there too — place a scheduled parcel order.</p>
            {merchant.parcel_order_cutoff_time && (
              <p className="text-xs text-amber-600 mt-0.5">
                🕔 Order before {formatTime12hr(merchant.parcel_order_cutoff_time)} for today&apos;s delivery →
              </p>
            )}
          </div>
        </a>
      )}

      {/* ── Closed banner ── */}
      {!isOpen && (
        <div className="bg-red-50 border-b border-red-100 px-4 py-3 flex items-center gap-2">
          <span className="text-red-500 text-lg">🔴</span>
          <div>
            <p className="text-sm font-semibold text-red-600">Restaurant is currently closed</p>
            <p className="text-xs text-red-400">Opens at {merchant.opening_time ? formatTime12hr(merchant.opening_time) : '—'} · You can browse the menu</p>
          </div>
        </div>
      )}

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
                  <ProductImage images={product.images} categorySlug={product.category?.slug} alt={product.name} width={80} height={80} />
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

      {/* ── Product detail sheet ── */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          style={{
            backgroundColor: `rgba(0,0,0,${imgVisible ? '0.55' : '0'})`,
            transition: 'background-color 220ms ease-out',
          }}
          onClick={closeSheet}
          onTouchStart={e => { touchStartY.current = e.touches[0].clientY; touchDeltaY.current = 0; }}
          onTouchMove={e => { touchDeltaY.current = e.touches[0].clientY - touchStartY.current; }}
          onTouchEnd={() => { if (touchDeltaY.current > 80) closeSheet(); }}
        >
          <div
            className="bg-white rounded-t-3xl w-full overflow-hidden relative"
            onClick={e => e.stopPropagation()}
            style={{
              transform: imgVisible ? 'translateY(0)' : 'translateY(100%)',
              transition: 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1)',
              maxHeight: '92vh',
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-0">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            {/* X close */}
            <button
              onClick={closeSheet}
              className="absolute top-3 right-4 z-10 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>

            {/* Image — only shown for real photos; tap opens full-screen viewer */}
            {selectedImage.images?.[0] && (
              <div
                className="relative aspect-square w-full bg-gray-100 cursor-zoom-in"
                onClick={openFullViewer}
              >
                <Image
                  src={selectedImage.images[0]}
                  alt={selectedImage.name}
                  fill
                  className="object-cover object-center"
                  sizes="100vw"
                />
                <div className="absolute bottom-2.5 right-2.5 bg-black/45 rounded-full px-2.5 py-1 flex items-center gap-1 backdrop-blur-sm pointer-events-none">
                  <svg className="w-3 h-3 fill-white" viewBox="0 0 24 24">
                    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zm.5-7H9v2H7v1h2v2h1v-2h2V9h-2V7z" />
                  </svg>
                  <span className="text-white text-[10px] font-medium">Expand</span>
                </div>
              </div>
            )}

            {/* Product info */}
            <div className="overflow-y-auto overscroll-contain px-5 pt-4 pb-10">
              <div className="flex items-start gap-2 mb-1">
                <div className={`mt-1 w-4 h-4 border-2 rounded-sm flex items-center justify-center shrink-0 ${isNonVeg(selectedImage) ? 'border-red-500' : 'border-green-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${isNonVeg(selectedImage) ? 'bg-red-500' : 'bg-green-600'}`} />
                </div>
                <p className="text-xl font-bold text-gray-900 leading-snug">{selectedImage.name}</p>
              </div>

              <p className="text-lg font-semibold text-purple-600 ml-6 mb-2">
                {formatCurrency(selectedImage.selling_price)}
                {selectedImage.mrp > selectedImage.selling_price && (
                  <span className="ml-2 text-sm text-gray-400 line-through font-normal">{formatCurrency(selectedImage.mrp)}</span>
                )}
              </p>

              {!isGrouped && selectedImage.description && (
                <p className="text-sm text-gray-500 ml-6 mb-3 leading-relaxed">{selectedImage.description}</p>
              )}

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
                    onClick={() => {
                      if (!isOpen) {
                        toast.error(`${merchant.store_name} is closed. Opens at ${merchant.opening_time ? formatTime12hr(merchant.opening_time) : '—'}`);
                        return;
                      }
                      handleAddItem(selectedImage);
                    }}
                    className={`w-full py-4 rounded-xl text-white font-bold text-sm mt-2 shadow-lg shadow-purple-200 bg-gradient-to-r from-purple-600 to-purple-700 ${!isOpen ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    Add to Cart
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── Full-screen image viewer ── */}
      {viewerProduct && (
        <div
          className="fixed inset-0 z-[60] bg-black overflow-hidden"
          style={{
            opacity: viewerVisible ? 1 : 0,
            transform: viewerVisible ? 'scale(1)' : 'scale(0.95)',
            transition: 'opacity 220ms ease-out, transform 220ms ease-out',
          }}
          onClick={() => { if (zoomScale <= 1.05) closeFullViewer(); }}
          onTouchStart={(e) => {
            if (e.touches.length === 2) {
              const dx = e.touches[0].clientX - e.touches[1].clientX;
              const dy = e.touches[0].clientY - e.touches[1].clientY;
              pinchDist.current = Math.sqrt(dx * dx + dy * dy);
              pinchBaseScale.current = zoomScale;
              viewerSwipeDelta.current = 0;
              setIsPinching(true);
            } else {
              viewerSwipeY.current = e.touches[0].clientY;
              viewerSwipeDelta.current = 0;
            }
          }}
          onTouchMove={(e) => {
            if (e.touches.length === 2 && pinchDist.current !== null) {
              const dx = e.touches[0].clientX - e.touches[1].clientX;
              const dy = e.touches[0].clientY - e.touches[1].clientY;
              const dist = Math.sqrt(dx * dx + dy * dy);
              setZoomScale(Math.max(1, Math.min(4, pinchBaseScale.current * (dist / pinchDist.current))));
            } else if (e.touches.length === 1 && !isPinching) {
              viewerSwipeDelta.current = e.touches[0].clientY - viewerSwipeY.current;
            }
          }}
          onTouchEnd={() => {
            if (isPinching) {
              setIsPinching(false);
              pinchDist.current = null;
              return;
            }
            if (zoomScale <= 1.1 && viewerSwipeDelta.current > 80) {
              closeFullViewer();
              return;
            }
            if (Math.abs(viewerSwipeDelta.current) < 12) {
              const now = Date.now();
              if (now - lastTapMs.current < 280) {
                setZoomScale(s => (s > 1.05 ? 1 : 2.5));
                lastTapMs.current = 0;
              } else {
                lastTapMs.current = now;
              }
            }
          }}
        >
          {/* X close */}
          <button
            onClick={(e) => { e.stopPropagation(); closeFullViewer(); }}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Zoomable image */}
          <div
            className="absolute inset-0"
            onClick={e => e.stopPropagation()}
            style={{
              transform: `scale(${zoomScale})`,
              transformOrigin: 'center center',
              transition: isPinching ? 'none' : 'transform 200ms ease-out',
              touchAction: zoomScale > 1 ? 'none' : 'pan-y',
            }}
          >
            {/* Blur placeholder from cached thumbnail */}
            <Image
              src={viewerProduct.images![0]}
              alt=""
              fill
              className="object-contain scale-110 blur-2xl"
              style={{ opacity: viewerLoaded ? 0 : 0.5, transition: 'opacity 300ms ease-out' }}
              sizes="100vw"
            />
            {/* Sharp full-res image fades in on load */}
            <Image
              src={viewerProduct.images![0]}
              alt={viewerProduct.name}
              fill
              className="object-contain"
              style={{ opacity: viewerLoaded ? 1 : 0, transition: 'opacity 300ms ease-out' }}
              sizes="100vw"
              priority
              onLoad={() => setViewerLoaded(true)}
            />
          </div>

          {/* Bottom gradient with name + price */}
          <div
            className="absolute bottom-0 left-0 right-0 px-5 pt-16 pb-12 pointer-events-none"
            style={{
              background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, transparent 100%)',
              opacity: viewerVisible ? 1 : 0,
              transition: 'opacity 350ms ease-out',
            }}
          >
            <p className="text-white text-lg font-bold leading-snug drop-shadow">{viewerProduct.name}</p>
            <p className="text-purple-300 text-base font-semibold mt-0.5 drop-shadow">{formatCurrency(viewerProduct.selling_price)}</p>
            <p className="text-white/40 text-[11px] mt-2">Pinch to zoom · Double-tap · Swipe down to close</p>
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
