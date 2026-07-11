'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Minus, Plus, Heart, X } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { formatCurrency } from '@/lib/utils/format';
import type { Product, Category } from '@/types';
import toast from 'react-hot-toast';

interface ProductDetailClientProps {
  product: Product;
  category: Category | null;
  similarProducts: Product[];
  topInCategory: Product[];
  alsoLiked: Product[];
}

function MiniProductCard({ product }: { product: Product }) {
  return (
    <a
      href={`/product/${product.id}`}
      className="flex-shrink-0 w-36 bg-white border border-gray-100 rounded-xl p-2 block"
    >
      <div className="bg-gray-50 rounded-lg h-24 flex items-center justify-center mb-2 relative overflow-hidden">
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full object-contain p-1"
          />
        ) : (
          <span className="text-3xl">🛒</span>
        )}
        {product.offer_percentage > 0 && (
          <span className="absolute top-1 left-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
            {Math.round(product.offer_percentage)}% OFF
          </span>
        )}
      </div>
      <p className="text-xs font-medium text-gray-900 line-clamp-2 leading-tight mb-1 min-h-[2.5rem]">
        {product.name}
      </p>
      <p className="text-sm font-bold text-gray-900">₹{product.selling_price}</p>
      {product.mrp > product.selling_price && (
        <p className="text-xs text-gray-400 line-through">₹{product.mrp}</p>
      )}
    </a>
  );
}

export function ProductDetailClient({ product, category, similarProducts, topInCategory, alsoLiked }: ProductDetailClientProps) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const lightboxTouchStartY = useRef<number | null>(null);
  const { items, addItem, clearCart } = useCartStore();
  const cartItem = items.find(i => i.product.id === product.id);
  const isInCart = !!cartItem;
  const [showConflict, setShowConflict] = useState(false);
  const outOfStock = product.stock_status === 'out_of_stock' || product.stock_quantity === 0;
  const images = product.images?.length ? product.images : [];
  const totalPrice = product.selling_price * qty;

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || images.length <= 1) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      setImageIndex(prev =>
        diff > 0
          ? Math.min(prev + 1, images.length - 1)
          : Math.max(prev - 1, 0)
      );
    }
    touchStartX.current = null;
  }

  function handleLightboxTouchStart(e: React.TouchEvent) {
    lightboxTouchStartY.current = e.touches[0].clientY;
  }

  function handleLightboxTouchEnd(e: React.TouchEvent) {
    if (lightboxTouchStartY.current === null) return;
    const diff = e.changedTouches[0].clientY - lightboxTouchStartY.current;
    if (diff > 80) setLightboxOpen(false);
    lightboxTouchStartY.current = null;
  }

  const handleAddToCart = () => {
    const hasConflict = product.merchant_id != null &&
      items.some(i => i.product.merchant_id !== product.merchant_id);
    if (hasConflict) {
      setShowConflict(true);
      return;
    }
    for (let i = 0; i < qty; i++) addItem(product);
    toast.success(`${product.name} added to cart!`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm px-4 py-3 flex items-center justify-between border-b border-[#E5E7EB]">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button className="p-2 rounded-xl hover:bg-gray-100">
          <Heart className="w-5 h-5 text-[#6B7280]" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-40">
        {/* Product image gallery */}
        <div className="relative bg-gray-50">
          <div
            className="h-64 flex items-center justify-center relative cursor-pointer select-none"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onClick={() => images[imageIndex] && setLightboxOpen(true)}
          >
            {images[imageIndex] ? (
              <Image
                src={images[imageIndex]}
                alt={product.name}
                fill
                className="object-contain p-4"
                sizes="100vw"
              />
            ) : (
              <div className="text-6xl">🛒</div>
            )}

            {/* Offer badge */}
            {product.offer_percentage > 0 && (
              <span className="absolute top-4 left-4 bg-error text-white text-xs font-bold px-2 py-1 rounded-lg">
                {Math.round(product.offer_percentage)}% OFF
              </span>
            )}

            {/* Image counter */}
            {images.length > 1 && (
              <span className="absolute top-3 right-3 text-xs text-[#6B7280] bg-white/80 px-2 py-0.5 rounded-full">
                {imageIndex + 1} / {images.length}
              </span>
            )}
          </div>

          {/* Dots */}
          {images.length > 1 && (
            <div className="flex justify-center items-center gap-1.5 pb-3">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setImageIndex(i)}
                  aria-label={`Image ${i + 1}`}
                  className={`rounded-full transition-all ${
                    i === imageIndex
                      ? 'w-2 h-2 bg-[#7C3AED]'
                      : 'w-1.5 h-1.5 bg-gray-300'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Lightbox */}
        {lightboxOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center animate-fadeIn"
            onClick={() => setLightboxOpen(false)}
            onTouchStart={handleLightboxTouchStart}
            onTouchEnd={handleLightboxTouchEnd}
          >
            {/* Close button */}
            <button
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/20 text-white"
              onClick={(e) => { e.stopPropagation(); setLightboxOpen(false); }}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Counter in lightbox */}
            {images.length > 1 && (
              <span className="absolute top-5 left-1/2 -translate-x-1/2 text-sm text-white/70">
                {imageIndex + 1} / {images.length}
              </span>
            )}

            {/* Image — stop propagation so tapping image itself doesn't close */}
            <div
              className="relative w-full h-4/5 max-w-lg"
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              <Image
                src={images[imageIndex]}
                alt={product.name}
                fill
                className="object-contain"
                sizes="100vw"
              />
            </div>
          </div>
        )}

        {/* Product info */}
        <div className="px-4 py-4 space-y-4">
          {/* Name and status */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h1 className="text-xl font-bold text-[#1A1A1A]">{product.name}</h1>
              <p className="text-sm text-[#6B7280] mt-1">{product.unit}</p>
              {category && <p className="text-xs text-primary-600 mt-1">{category.name}</p>}
            </div>
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                outOfStock
                  ? 'bg-red-100 text-red-700'
                  : product.stock_status === 'low_stock'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-green-100 text-green-700'
              }`}
            >
              {outOfStock ? 'Out of stock' : product.stock_status === 'low_stock' ? 'Low stock' : 'In stock'}
            </span>
          </div>

          {/* Price row */}
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold text-[#1A1A1A]">{formatCurrency(product.selling_price)}</span>
            {product.mrp > product.selling_price && (
              <span className="text-base text-[#6B7280] line-through">{formatCurrency(product.mrp)}</span>
            )}
          </div>

          {/* Merchant */}
          {product.merchant && (
            <div className="bg-primary-50 rounded-xl p-3 text-sm text-[#1A1A1A]">
              Sold by <span className="font-semibold">{product.merchant.store_name}</span>
            </div>
          )}

          {/* Quantity selector */}
          {!outOfStock && (
            <div className="bg-gray-50 rounded-xl p-4">
              <label className="text-sm font-semibold text-[#1A1A1A] block mb-3">Quantity</label>
              <div className="flex items-center gap-3 w-fit">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  disabled={qty <= 1}
                  className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600 hover:bg-primary-100 disabled:opacity-50"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-lg font-bold w-8 text-center">{qty}</span>
                <button
                  onClick={() => setQty(Math.min(product.stock_quantity, qty + 1))}
                  disabled={qty >= product.stock_quantity}
                  className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-[#6B7280] mt-2">{product.stock_quantity} available</p>
            </div>
          )}

          {/* Description */}
          {product.description && (
            <div>
              <h3 className="text-sm font-semibold text-[#1A1A1A] mb-2">About this product</h3>
              <p className="text-sm text-[#6B7280] leading-relaxed">{product.description}</p>
            </div>
          )}


          {/* Stock warning */}
          {product.stock_status === 'low_stock' && (
            <p className="text-sm text-amber-600 font-medium">⚡ Only {product.stock_quantity} left!</p>
          )}
        </div>

        {/* People also bought */}
        {alsoLiked.length > 0 && (
          <div className="px-4 pb-4 border-t border-gray-100 pt-4">
            <h3 className="text-base font-semibold text-gray-900 mb-3">People also bought</h3>
            <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
              {alsoLiked.map(item => (
                <MiniProductCard key={item.id} product={item} />
              ))}
            </div>
          </div>
        )}

        {/* Top in category */}
        {topInCategory.length > 0 && (
          <div className="px-4 pb-4 border-t border-gray-100 pt-4">
            <h3 className="text-base font-semibold text-gray-900 mb-3">
              Top in {category?.name ?? 'this category'}
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
              {topInCategory.map(item => (
                <MiniProductCard key={item.id} product={item} />
              ))}
            </div>
          </div>
        )}

        {/* Similar products + see all bar */}
        {similarProducts.length > 0 && (
          <div className="px-4 pb-4 border-t border-gray-100 pt-4">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Similar products</h3>
            <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
              {similarProducts.map(item => (
                <MiniProductCard key={item.id} product={item} />
              ))}
            </div>
            <a
              href={`/category/${category?.slug ?? 'all'}`}
              className="flex items-center justify-between mt-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100"
            >
              <span className="text-sm font-medium text-gray-700">
                See all {category?.name ?? ''} products
              </span>
              <span className="text-purple-600 text-sm font-medium">→</span>
            </a>
          </div>
        )}
      </div>

      {showConflict && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 px-4 pb-8"
          onClick={() => setShowConflict(false)}
        >
          <div
            className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <p className="font-bold text-gray-900 text-base">Start new order?</p>
            <p className="text-sm text-gray-600 leading-snug">
              Your cart has items from another restaurant. Clear your cart to add this item?
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowConflict(false)}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-700"
              >
                Keep Cart
              </button>
              <button
                onClick={() => {
                  clearCart();
                  for (let i = 0; i < qty; i++) addItem(product);
                  setShowConflict(false);
                  toast.success(`${product.name} added to cart!`);
                }}
                className="flex-1 bg-purple-600 text-white rounded-xl py-2.5 text-sm font-semibold"
              >
                Clear &amp; Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed bottom button */}
      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-lg z-50 px-4 py-3 bg-white border-t border-[#E5E7EB] safe-bottom">
        {outOfStock ? (
          <button disabled className="w-full py-3 rounded-xl bg-gray-200 text-gray-500 font-semibold text-lg">
            Out of Stock
          </button>
        ) : isInCart ? (
          <div className="space-y-2">
            <button
              onClick={() => router.push('/cart')}
              className="w-full py-3 rounded-xl border-2 border-primary-600 text-primary-600 font-semibold text-lg hover:bg-primary-50"
            >
              Go to Cart · {formatCurrency(cartItem!.quantity * product.selling_price)}
            </button>
            <button
              onClick={handleAddToCart}
              className="w-full py-3 rounded-xl bg-primary-50 text-primary-600 font-semibold text-lg hover:bg-primary-100"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <button
            onClick={handleAddToCart}
            className="w-full py-3 rounded-xl bg-primary-600 text-white font-semibold text-lg hover:bg-primary-700"
          >
            Add to Cart · {formatCurrency(totalPrice)}
          </button>
        )}
      </div>
    </div>
  );
}
