'use client';

import { useState, useEffect } from 'react';
import { MapPin, ShoppingCart, Bell, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useCartStore } from '@/store/cartStore';
import { SearchBar } from './SearchBar';

interface HeaderProps {
  location?: string;
}

export function Header({ location = 'Ardhapur, Maharashtra' }: HeaderProps) {
  const [mounted, setMounted] = useState(false);
  const itemCount = useCartStore(s => s.getItemCount());

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E5E7EB] shadow-sm">
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        {/* Logo */}
        <Link href="/" className="shrink-0">
          <span className="text-lg font-bold text-primary-600">Village<span className="text-[#1A1A1A]">Mart</span></span>
        </Link>

        {/* Location */}
        <button className="flex items-center gap-1 text-left min-w-0 flex-1">
          <MapPin className="w-4 h-4 text-primary-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-[#6B7280] leading-none">Deliver to</p>
            <div className="flex items-center gap-0.5">
              <p className="text-sm font-semibold text-[#1A1A1A] truncate max-w-[140px]">{location}</p>
              <ChevronDown className="w-3.5 h-3.5 text-[#1A1A1A] shrink-0" />
            </div>
          </div>
        </button>

        {/* Right actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Link href="/notifications" className="p-2 rounded-xl hover:bg-gray-100 relative">
            <Bell className="w-5 h-5 text-[#1A1A1A]" />
          </Link>
          <Link href="/cart" className="p-2 rounded-xl hover:bg-gray-100 relative">
            <ShoppingCart className="w-5 h-5 text-[#1A1A1A]" />
            {mounted && itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-primary-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <SearchBar navigates />
      </div>
    </header>
  );
}
