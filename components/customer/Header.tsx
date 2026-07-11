'use client';

import { useState, useEffect } from 'react';
import { MapPin, ShoppingCart, Bell, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { SearchBar } from './SearchBar';
import { createClient } from '@/lib/supabase/client';

interface HeaderProps {
  location?: string;
}

export function Header({ location = 'Ardhapur, Maharashtra' }: HeaderProps) {
  const [mounted, setMounted] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const itemCount = useCartStore(s => s.getItemCount());
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    function handleRead() { setUnreadCount(0); }
    window.addEventListener('notificationsRead', handleRead);
    return () => {
      clearInterval(interval);
      window.removeEventListener('notificationsRead', handleRead);
    };
  }, []);

  async function fetchUnread() {
    try {
      const raw = localStorage.getItem('vm_customer');
      if (!raw) return;
      const { phone } = JSON.parse(raw);
      if (!phone) return;
      const supabase = createClient();
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_phone', phone)
        .eq('is_read', false);
      setUnreadCount(count ?? 0);
    } catch {}
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E5E7EB] shadow-sm">
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        {/* Logo */}
        <Link href="/" className="shrink-0">
          <div className="flex items-center gap-0">
            <span className="text-purple-600 font-black text-xl tracking-tight leading-none">Z</span>
            <span className="text-gray-900 font-bold text-xl tracking-tight leading-none">upr</span>
          </div>
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
            {mounted && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-0.5 flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
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
      {pathname !== '/search' && pathname !== '/cart' && (
        <div className="px-4 pb-3">
          <SearchBar navigates />
        </div>
      )}
    </header>
  );
}
