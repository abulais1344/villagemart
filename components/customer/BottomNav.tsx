'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, ShoppingCart, ClipboardList, User } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';

const NAV = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/search', icon: Search, label: 'Search' },
  { href: '/cart', icon: ShoppingCart, label: 'Cart', badge: true },
  { href: '/orders', icon: ClipboardList, label: 'Orders' },
  { href: '/profile', icon: User, label: 'Profile' },
];

export function BottomNav() {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const itemCount = useCartStore(s => s.getItemCount());

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E5E7EB] safe-bottom">
      <div className="flex items-center justify-around h-16">
        {NAV.map(({ href, icon: Icon, label, badge }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-4 py-2 relative transition-colors ${active ? 'text-primary-600' : 'text-[#6B7280]'}`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5px]' : ''}`} />
                {badge && mounted && itemCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-primary-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium ${active ? 'text-primary-600' : ''}`}>{label}</span>
              {active && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary-600 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
