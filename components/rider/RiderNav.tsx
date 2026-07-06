'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, LogOut } from 'lucide-react';

export function RiderNav() {
  const pathname = usePathname();

  async function handleLogout() {
    await fetch('/api/rider/logout', { method: 'POST' });
    window.location.href = '/rider-login';
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E5E7EB] safe-bottom">
      <div className="flex items-center justify-around h-16">
        <Link
          href="/rider/orders"
          className={`flex flex-col items-center gap-0.5 px-4 py-2 ${pathname.startsWith('/rider/orders') ? 'text-[#7C3AED]' : 'text-[#6B7280]'}`}
        >
          <ClipboardList className={`w-5 h-5 ${pathname.startsWith('/rider/orders') ? 'stroke-[2.5px]' : ''}`} />
          <span className="text-[10px] font-medium">Orders</span>
        </Link>

        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-0.5 px-4 py-2 text-red-500"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-medium">Logout</span>
        </button>
      </div>
    </nav>
  );
}
