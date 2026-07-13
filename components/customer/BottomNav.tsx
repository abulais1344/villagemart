'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardList } from 'lucide-react';
// import { Search } from 'lucide-react'; // re-enable with Search nav entry below

const NAV = [
  { href: '/', icon: Home, label: 'Home' },
  // { href: '/search', icon: Search, label: 'Search' },
  { href: '/orders', icon: ClipboardList, label: 'Orders' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E5E7EB] safe-bottom">
      <div className="flex items-center justify-around h-16">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-4 py-2 relative transition-colors ${active ? 'text-primary-600' : 'text-[#6B7280]'}`}
            >
              <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5px]' : ''}`} />
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
