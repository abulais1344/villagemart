'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { formatCurrency } from '@/lib/utils/format';

export function FloatingCartPill() {
  const { items, getSubtotal } = useCartStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const itemCount = items.length;
  const cartTotal = getSubtotal();

  if (!mounted || itemCount === 0) return null;

  return (
    <div
      className="fixed bottom-20 left-4 right-4 z-50 bg-[#7C3AED] text-white rounded-2xl px-4 py-3 flex items-center justify-between shadow-lg"
      style={{ animation: 'slideUp 0.3s ease-out' }}
    >
      <div className="flex items-center gap-2 flex-1">
        <ShoppingCart className="w-4 h-4 shrink-0" />
        <span className="text-sm font-semibold truncate">
          View Cart · {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </span>
      </div>
      <button
        onClick={() => { window.location.href = '/cart'; }}
        className="text-sm font-semibold whitespace-nowrap ml-2"
      >
        {formatCurrency(cartTotal)} →
      </button>
    </div>
  );
}
