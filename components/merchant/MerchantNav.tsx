'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ClipboardList, Utensils, User } from 'lucide-react';

const NAV = [
  { href: '/merchant/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/merchant/orders',    icon: ClipboardList,   label: 'Orders'    },
  { href: '/merchant/menu',      icon: Utensils,        label: 'Menu'      },
  { href: '/merchant/profile',   icon: User,            label: 'Profile'   },
];

export function MerchantNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E5E7EB] safe-bottom">
      <div className="flex items-center justify-around h-16">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={`flex flex-col items-center gap-0.5 px-4 py-2 ${active ? 'text-[#7C3AED]' : 'text-[#6B7280]'}`}>
              <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5px]' : ''}`} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
