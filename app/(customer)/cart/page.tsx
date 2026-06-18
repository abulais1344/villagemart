'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Minus, Plus, Trash2, ShoppingCart, Tag } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { Header } from '@/components/customer/Header';
import { AddressSelector } from '@/components/customer/AddressSelector';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils/format';
import type { Address } from '@/types';

export default function CartPage() {
  const { items, updateQuantity, removeItem, getSubtotal, clearCart } = useCartStore();
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const router = useRouter();
  const subtotal = getSubtotal();
  const deliveryCharge = subtotal >= 299 ? 0 : 20;
  const total = subtotal + deliveryCharge;

  if (items.length === 0) {
    return (
      <>
        <Header />
        <div className="flex flex-col items-center justify-center py-24 px-4 gap-4">
          <ShoppingCart className="w-20 h-20 text-gray-200" />
          <h2 className="text-lg font-bold text-[#1A1A1A]">Your cart is empty</h2>
          <p className="text-sm text-[#6B7280] text-center">Add items to get started</p>
          <Button onClick={() => router.push('/')}>Start Shopping</Button>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="px-4 py-4 space-y-4">
        <h1 className="text-xl font-bold text-[#1A1A1A]">My Cart ({items.length} items)</h1>

        {/* Items */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] divide-y divide-[#E5E7EB]">
          {items.map(({ product, quantity }) => (
            <div key={product.id} className="flex items-center gap-3 p-4">
              <div className="w-16 h-16 rounded-xl bg-gray-50 overflow-hidden shrink-0 border border-[#E5E7EB]">
                {product.images?.[0] ? (
                  <Image src={product.images[0]} alt={product.name} width={64} height={64} className="object-cover w-full h-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">🛒</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1A1A1A] line-clamp-2">{product.name}</p>
                <p className="text-xs text-[#6B7280]">{product.unit}</p>
                <p className="text-sm font-bold text-primary-600 mt-1">{formatCurrency(product.selling_price * quantity)}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button onClick={() => removeItem(product.id)} className="text-[#6B7280]">
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 bg-primary-50 rounded-lg px-2 py-1">
                  <button onClick={() => quantity <= 1 ? removeItem(product.id) : updateQuantity(product.id, quantity - 1)} className="text-primary-600">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-bold w-5 text-center">{quantity}</span>
                  <button onClick={() => updateQuantity(product.id, quantity + 1)} className="text-primary-600">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Delivery address */}
        <div>
          <h3 className="text-sm font-semibold text-[#1A1A1A] mb-2">Delivery Address</h3>
          <AddressSelector selected={selectedAddress} onSelect={setSelectedAddress} />
        </div>

        {/* Offer banner */}
        {subtotal < 299 && (
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl border border-green-200">
            <Tag className="w-4 h-4 text-success shrink-0" />
            <p className="text-sm text-success font-medium">
              Add {formatCurrency(299 - subtotal)} more for free delivery!
            </p>
          </div>
        )}

        {/* Bill details */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 space-y-2">
          <h3 className="text-sm font-semibold text-[#1A1A1A] mb-3">Bill Details</h3>
          <div className="flex justify-between text-sm">
            <span className="text-[#6B7280]">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#6B7280]">Delivery charge</span>
            {deliveryCharge === 0 ? (
              <span className="text-success font-medium">FREE</span>
            ) : (
              <span>{formatCurrency(deliveryCharge)}</span>
            )}
          </div>
          <div className="flex justify-between text-base font-bold border-t border-[#E5E7EB] pt-2 mt-1">
            <span>Total</span>
            <span className="text-primary-600">{formatCurrency(total)}</span>
          </div>
        </div>

        <Button
          fullWidth size="lg"
          onClick={() => router.push('/checkout')}
          disabled={!selectedAddress}
        >
          Proceed to Checkout · {formatCurrency(total)}
        </Button>
      </main>
    </>
  );
}
