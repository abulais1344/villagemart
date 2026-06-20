'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Plus, Minus } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import type { Product } from '@/types';
import { formatCurrency } from '@/lib/utils/format';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [mounted, setMounted] = useState(false);
  const { items, addItem, updateQuantity, removeItem } = useCartStore();
  const cartItem = items.find(i => i.product.id === product.id);
  const qty = cartItem?.quantity ?? 0;
  const outOfStock = product.stock_status === 'out_of_stock' || product.stock_quantity === 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!outOfStock) addItem(product);
  };

  const handleIncrease = (e: React.MouseEvent) => {
    e.preventDefault();
    updateQuantity(product.id, qty + 1);
  };

  const handleDecrease = (e: React.MouseEvent) => {
    e.preventDefault();
    if (qty <= 1) removeItem(product.id);
    else updateQuantity(product.id, qty - 1);
  };

  return (
    <Link href={`/product/${product.id}`} className="block">
      <div className={`bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden transition-shadow hover:shadow-md ${outOfStock ? 'opacity-70' : ''}`}>
        {/* Image */}
        <div className="relative h-36 bg-gray-50">
          {product.images?.[0] ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, 200px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl">🛒</span>
            </div>
          )}

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
        </div>

        {/* Details */}
        <div className="p-2.5">
          <p className="text-sm font-medium text-[#1A1A1A] line-clamp-2 leading-tight">{product.name}</p>

          <div className="flex items-center justify-between mt-2">
            <div>
              <p className="text-sm font-bold text-[#1A1A1A]">{formatCurrency(product.selling_price)}</p>
              {product.mrp > product.selling_price && (
                <p className="text-xs text-[#6B7280] line-through">{formatCurrency(product.mrp)}</p>
              )}
            </div>

            {/* Cart control */}
            {mounted && !outOfStock && (
              qty > 0 ? (
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
                <button
                  onClick={handleAdd}
                  className="bg-primary-50 border border-primary-200 text-primary-700 rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-primary-100 transition-colors"
                >
                  ADD
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
