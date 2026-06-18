'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Minus, Plus, ShoppingCart, Heart } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils/format';
import type { Product } from '@/types';
import toast from 'react-hot-toast';

interface ProductDetailClientProps {
  product: Product;
}

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const router = useRouter();
  const [imageIndex, setImageIndex] = useState(0);
  const { items, addItem, updateQuantity, removeItem } = useCartStore();
  const cartItem = items.find(i => i.product.id === product.id);
  const qty = cartItem?.quantity ?? 0;
  const outOfStock = product.stock_status === 'out_of_stock' || product.stock_quantity === 0;
  const images = product.images?.length ? product.images : [''];

  return (
    <div className="min-h-screen bg-white pb-32">
      {/* Back button */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button className="p-2 rounded-xl hover:bg-gray-100">
          <Heart className="w-5 h-5 text-[#6B7280]" />
        </button>
      </div>

      {/* Image gallery */}
      <div className="relative bg-gray-50 -mt-14">
        <div className="h-72 relative">
          {images[imageIndex] ? (
            <Image src={images[imageIndex]} alt={product.name} fill className="object-contain" sizes="100vw" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">🛒</div>
          )}
          {product.offer_percentage > 0 && (
            <span className="absolute top-14 left-4 bg-error text-white text-xs font-bold px-2 py-1 rounded-lg">
              {Math.round(product.offer_percentage)}% OFF
            </span>
          )}
        </div>
        {images.length > 1 && (
          <div className="flex justify-center gap-1.5 pb-3 mt-2">
            {images.map((_, i) => (
              <button key={i} onClick={() => setImageIndex(i)}
                className={`w-2 h-2 rounded-full transition-colors ${i === imageIndex ? 'bg-primary-600' : 'bg-gray-300'}`} />
            ))}
          </div>
        )}
      </div>

      {/* Details */}
      <div className="px-4 py-4 space-y-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-lg font-bold text-[#1A1A1A] flex-1">{product.name}</h1>
            <Badge variant={outOfStock ? 'error' : product.stock_status === 'low_stock' ? 'warning' : 'success'}>
              {outOfStock ? 'Out of stock' : product.stock_status === 'low_stock' ? 'Low stock' : 'In stock'}
            </Badge>
          </div>
          <p className="text-sm text-[#6B7280] mt-1">{product.unit}</p>
          {product.category && <p className="text-xs text-primary-600 mt-1">{product.category.name}</p>}
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-bold text-[#1A1A1A]">{formatCurrency(product.selling_price)}</span>
          {product.mrp > product.selling_price && (
            <span className="text-base text-[#6B7280] line-through">{formatCurrency(product.mrp)}</span>
          )}
          {product.offer_percentage > 0 && (
            <span className="text-sm font-semibold text-success">{Math.round(product.offer_percentage)}% off</span>
          )}
        </div>

        {/* Merchant */}
        {product.merchant && (
          <div className="flex items-center gap-2 p-3 bg-primary-50 rounded-xl">
            <ShoppingCart className="w-4 h-4 text-primary-600 shrink-0" />
            <p className="text-sm text-[#1A1A1A]">Sold by <span className="font-semibold">{product.merchant.store_name}</span></p>
          </div>
        )}

        {/* Description */}
        {product.description && (
          <div>
            <h3 className="text-sm font-semibold text-[#1A1A1A] mb-1">About this product</h3>
            <p className="text-sm text-[#6B7280] leading-relaxed">{product.description}</p>
          </div>
        )}

        {/* Stock info */}
        {product.stock_status === 'low_stock' && (
          <p className="text-sm text-amber-600 font-medium">⚡ Only {product.stock_quantity} left!</p>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E7EB] px-4 py-3 safe-bottom">
        {!outOfStock ? (
          qty > 0 ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 bg-primary-600 rounded-xl px-4 py-3">
                <button onClick={() => qty <= 1 ? removeItem(product.id) : updateQuantity(product.id, qty - 1)}>
                  <Minus className="w-5 h-5 text-white" />
                </button>
                <span className="text-white font-bold text-lg w-8 text-center">{qty}</span>
                <button onClick={() => updateQuantity(product.id, qty + 1)}>
                  <Plus className="w-5 h-5 text-white" />
                </button>
              </div>
              <Button onClick={() => router.push('/cart')} size="lg" className="flex-1 ml-3">
                Go to Cart · {formatCurrency(product.selling_price * qty)}
              </Button>
            </div>
          ) : (
            <Button fullWidth size="lg" onClick={() => { addItem(product); toast.success('Added to cart!'); }}>
              <ShoppingCart className="w-5 h-5" /> Add to Cart
            </Button>
          )
        ) : (
          <Button fullWidth size="lg" disabled variant="secondary">
            Out of Stock
          </Button>
        )}
      </div>
    </div>
  );
}
