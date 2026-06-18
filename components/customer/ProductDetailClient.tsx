'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Minus, Plus, Heart } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { formatCurrency } from '@/lib/utils/format';
import type { Product, Category } from '@/types';
import toast from 'react-hot-toast';

interface ProductDetailClientProps {
  product: Product;
  category: Category | null;
}

export function ProductDetailClient({ product, category }: ProductDetailClientProps) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const { items, addItem } = useCartStore();
  const cartItem = items.find(i => i.product.id === product.id);
  const isInCart = !!cartItem;
  const outOfStock = product.stock_status === 'out_of_stock' || product.stock_quantity === 0;
  const images = product.images?.length ? product.images : [];
  const totalPrice = product.selling_price * qty;

  const handleAddToCart = () => {
    for (let i = 0; i < qty; i++) {
      addItem(product);
    }
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
      <div className="flex-1 overflow-y-auto pb-28">
        {/* Product image */}
        <div className="relative bg-gray-50">
          <div className="h-64 flex items-center justify-center relative">
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

            {/* Offer badge on image */}
            {product.offer_percentage > 0 && (
              <span className="absolute top-4 left-4 bg-error text-white text-xs font-bold px-2 py-1 rounded-lg">
                {Math.round(product.offer_percentage)}% OFF
              </span>
            )}
          </div>

          {/* Image carousel dots */}
          {images.length > 1 && (
            <div className="flex justify-center gap-1.5 pb-3">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setImageIndex(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${i === imageIndex ? 'bg-primary-600' : 'bg-gray-300'}`}
                />
              ))}
            </div>
          )}
        </div>

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

          {/* SKU */}
          {product.sku && (
            <div>
              <p className="text-xs text-[#6B7280]">SKU</p>
              <p className="text-sm font-mono text-[#1A1A1A] mt-1">{product.sku}</p>
            </div>
          )}

          {/* Stock warning */}
          {product.stock_status === 'low_stock' && (
            <p className="text-sm text-amber-600 font-medium">⚡ Only {product.stock_quantity} left!</p>
          )}
        </div>
      </div>

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
              View Cart · {formatCurrency(cartItem!.quantity * product.selling_price)}
            </button>
            <button
              onClick={handleAddToCart}
              className="w-full py-3 rounded-xl bg-primary-50 text-primary-600 font-semibold text-lg hover:bg-primary-100"
            >
              Add More
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
