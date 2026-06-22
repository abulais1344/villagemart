'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { formatCurrency } from '@/lib/utils/format';

export function FloatingCartBar() {
  const pathname = usePathname();
  const { items, getSubtotal } = useCartStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (pathname === '/cart' || pathname === '/checkout') return null;
  if (!mounted || items.length === 0) return null;

  const itemCount = items.length;
  const cartTotal = getSubtotal();

  return (
    <>
      <div className="fixed bottom-20 left-0 right-0 px-4 z-40" style={{ animation: 'slideUp 0.3s ease-out' }}>
        <Link href="/cart">
          <div className="bg-purple-600 text-white rounded-2xl px-5 py-3.5 flex items-center justify-between shadow-xl shadow-purple-200 mx-auto max-w-sm">
            <div className="flex items-center gap-2">
              <div className="bg-purple-500 rounded-lg p-1.5">
                <ShoppingCart size={16} />
              </div>
              <span className="text-sm font-medium">{itemCount} items</span>
            </div>
            <span className="text-sm font-semibold">View Cart</span>
            <span className="text-sm font-semibold">{formatCurrency(cartTotal)} →</span>
          </div>
        </Link>
      </div>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(80px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}
