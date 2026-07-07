'use client';

import { useRouter } from 'next/navigation';
import { ProductImage } from '@/components/shared/ProductImage';
import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { useCartStore } from '@/store/cartStore';
import { formatCurrency } from '@/lib/utils/format';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, updateQuantity, removeItem, getSubtotal } = useCartStore();
  const router = useRouter();
  const subtotal = getSubtotal();

  return (
    <BottomSheet open={open} onClose={onClose} title="My Cart">
      {items.length === 0 ? (
        <div className="flex flex-col items-center py-10 gap-4">
          <ShoppingCart className="w-16 h-16 text-gray-200" />
          <p className="text-[#6B7280] font-medium">Your cart is empty</p>
          <Button variant="secondary" onClick={onClose}>Start Shopping</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="space-y-3">
            {items.map(({ product, quantity }) => (
              <div key={product.id} className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-gray-50 overflow-hidden shrink-0 border border-[#E5E7EB]">
                  <ProductImage images={product.images} categorySlug={product.category?.slug} alt={product.name} width={56} height={56} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1A1A1A] line-clamp-1">{product.name}</p>
                  <p className="text-xs text-[#6B7280]">{product.unit}</p>
                  <p className="text-sm font-bold text-primary-600">{formatCurrency(product.selling_price * quantity)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => quantity <= 1 ? removeItem(product.id) : updateQuantity(product.id, quantity - 1)}
                    className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600"
                  >
                    {quantity <= 1 ? <Trash2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                  </button>
                  <span className="text-sm font-bold w-5 text-center">{quantity}</span>
                  <button
                    onClick={() => updateQuantity(product.id, quantity + 1)}
                    className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center text-white"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-[#E5E7EB] pt-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-[#6B7280]">Subtotal</span>
              <span className="font-semibold">{formatCurrency(subtotal)}</span>
            </div>
            <p className="text-xs text-[#6B7280]">Delivery charge will be calculated at checkout</p>
          </div>

          <Button
            fullWidth
            size="lg"
            onClick={() => { onClose(); router.push('/checkout'); }}
          >
            Proceed to Checkout · {formatCurrency(subtotal)}
          </Button>
        </div>
      )}
    </BottomSheet>
  );
}
