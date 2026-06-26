'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';

interface MerchantHeaderProps {
  storeName?: string;
}

export function MerchantHeader({ storeName }: MerchantHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-[#7C3AED] px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link href="/merchant/dashboard">
          <div className="flex items-center gap-0">
            <span className="text-white font-black text-xl tracking-tight leading-none">Z</span>
            <span className="text-purple-200 font-bold text-xl tracking-tight leading-none">upr</span>
          </div>
        </Link>
        <div>
          <p className="text-xs text-purple-200">Zupr Partner</p>
          <h1 className="text-base font-bold text-white">{storeName ?? 'My Store'}</h1>
        </div>
      </div>
      <button className="p-2 rounded-xl hover:bg-purple-700 transition-colors">
        <Bell className="w-5 h-5 text-white" />
      </button>
    </header>
  );
}
