'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { formatCurrency } from '@/lib/utils/format';

export function FloatingCartBar() {
  const { items, getSubtotal } = useCartStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted || items.length === 0) return null;

  const itemCount = items.length;
  const cartTotal = getSubtotal();

  return (
    <>
      <Link
        href="/cart"
        className="fixed bottom-20 left-4 right-4 z-40 bg-primary-600 text-white rounded-2xl px-4 py-3 flex items-center justify-between shadow-lg md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-auto md:min-w-80"
        style={{ animation: 'slideUp 0.3s ease-out' }}
      >
        <div className="flex items-center gap-2 flex-1">
          <ShoppingCart className="w-4 h-4 shrink-0" />
          <span className="text-sm font-semibold truncate">View cart · {itemCount} items</span>
        </div>
        <span className="text-sm font-semibold whitespace-nowrap ml-2">
          {formatCurrency(cartTotal)} →
        </span>
      </Link>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(80px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}
