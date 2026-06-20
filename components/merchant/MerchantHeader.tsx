'use client';

import { Bell } from 'lucide-react';

interface MerchantHeaderProps {
  storeName?: string;
}

export function MerchantHeader({ storeName }: MerchantHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E5E7EB] px-4 py-3 flex items-center justify-between">
      <div>
        <p className="text-xs text-[#6B7280]">Merchant Portal</p>
        <h1 className="text-base font-bold text-[#1A1A1A]">{storeName ?? 'VillageMart Store'}</h1>
      </div>
      <button className="p-2 rounded-xl hover:bg-gray-100">
        <Bell className="w-5 h-5 text-[#1A1A1A]" />
      </button>
    </header>
  );
}
