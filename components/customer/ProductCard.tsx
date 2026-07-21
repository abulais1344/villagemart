'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProductImage } from '@/components/shared/ProductImage';
import { Plus, Minus } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import type { Product } from '@/types';
import { formatCurrency } from '@/lib/utils/format';
import { PulseHint } from './PulseHint';
import { logEvent } from '@/lib/events';

interface ProductCardProps {
  product: Product;
  hint?: boolean;
  onHintDismiss?: () => void;
  merchantName?: string | null;
  merchantClosed?: boolean;
}

export function ProductCard({ product, hint = false, onHintDismiss, merchantName, merchantClosed = false }: ProductCardProps) {
  const [mounted, setMounted] = useState(false);
  const { items, addItem, updateQuantity, removeItem, clearCart } = useCartStore();
  const [showConflict, setShowConflict] = useState(false);
  const cartItem = items.find(i => i.product.id === product.id);
  const qty = cartItem?.quantity ?? 0;
  const outOfStock = product.stock_status === 'out_of_stock' || product.stock_quantity === 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock || merchantClosed) return;
    const hasConflict = product.merchant_id != null &&
      items.some(i => i.product.merchant_id !== product.merchant_id);
    if (hasConflict) {
      setShowConflict(true);
      return;
    }
    addItem(product);
    logEvent({ event_type: 'add_to_cart', merchant_id: product.merchant_id, metadata: { product_id: product.id, product_name: product.name } });
    onHintDismiss?.();
  };

  const handleIncrease = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (merchantClosed) return;
    updateQuantity(product.id, qty + 1);
  };

  const handleDecrease = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (qty <= 1) removeItem(product.id);
    else updateQuantity(product.id, qty - 1);
  };

  return (
    <>
    <Link href={`/product/${product.id}`} className="block">
      <div className={`bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden transition-shadow hover:shadow-md ${outOfStock || merchantClosed ? 'opacity-60' : ''}`}>
        {/* Image */}
        <div className="relative aspect-square bg-gray-50">
          <ProductImage
            images={product.images}
            categorySlug={product.category?.slug}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, 200px"
          />

          {/* Offer badge */}
          {product.offer_percentage > 0 && (
            <span className="absolute top-2 left-2 bg-error text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
              {Math.round(product.offer_percentage)}% OFF
            </span>
          )}

          {/* Out of stock overlay */}
          {outOfStock && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <span className="text-xs font-semibold text-[#6B7280] bg-white px-2 py-1 rounded-full border">Out of stock</span>
            </div>
          )}

          {/* Closed restaurant overlay */}
          {merchantClosed && !outOfStock && (
            <div className="absolute inset-0 bg-black/30 flex items-end justify-center pb-2">
              <span className="text-[10px] font-semibold text-white bg-red-500/90 px-2.5 py-0.5 rounded-full">Closed</span>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="p-2.5">
          <p className="text-sm font-medium text-[#1A1A1A] line-clamp-2 leading-tight">{product.name}</p>
          {merchantName && (
            <p className="text-[10px] text-[#6B7280] mt-0.5 truncate">from {merchantName}</p>
          )}

          <div className="flex items-center justify-between mt-2">
            <div>
              <p className="text-sm font-bold text-[#1A1A1A]">{formatCurrency(product.selling_price)}</p>
              {product.mrp > product.selling_price && (
                <p className="text-xs text-[#6B7280] line-through">{formatCurrency(product.mrp)}</p>
              )}
            </div>

            {/* Cart control */}
            {mounted && !outOfStock && (
              merchantClosed ? (
                <span className="text-[10px] font-medium text-red-500 bg-red-50 border border-red-200 px-2 py-1 rounded-lg">
                  Closed
                </span>
              ) : qty > 0 ? (
                <div className="flex items-center gap-1.5 bg-primary-600 rounded-lg px-2 py-1">
                  <button onClick={handleDecrease} className="text-white">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-white text-sm font-bold min-w-[16px] text-center">{qty}</span>
                  <button onClick={handleIncrease} className="text-white">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <PulseHint show={hint} label="Tap to add 👆">
                  <button
                    onClick={handleAdd}
                    className="bg-primary-50 border border-primary-200 text-primary-700 rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-primary-100 transition-colors"
                  >
                    ADD
                  </button>
                </PulseHint>
              )
            )}
          </div>
        </div>
      </div>
    </Link>
    {showConflict && (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-8"
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
                addItem(product);
                logEvent({ event_type: 'add_to_cart', merchant_id: product.merchant_id, metadata: { product_id: product.id, product_name: product.name } });
                setShowConflict(false);
                onHintDismiss?.();
              }}
              className="flex-1 bg-purple-600 text-white rounded-xl py-2.5 text-sm font-semibold"
            >
              Clear &amp; Add
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
