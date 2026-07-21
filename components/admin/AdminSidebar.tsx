'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Store, Package, ClipboardList,
  Tag, Percent, Truck, BarChart2, Gift, LogOut, Bike, Archive, Activity
} from 'lucide-react';

const NAV = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/orders', icon: ClipboardList, label: 'Orders' },
  { href: '/admin/parcel-orders', icon: Archive, label: 'Parcels' },
  { href: '/admin/products', icon: Package, label: 'Products' },
  { href: '/admin/users', icon: Users, label: 'Users' },
  { href: '/admin/merchants', icon: Store, label: 'Merchants' },
  { href: '/admin/riders', icon: Bike, label: 'Riders' },
  { href: '/admin/categories', icon: Tag, label: 'Categories' },
  { href: '/admin/offers', icon: Gift, label: 'Offers' },
  { href: '/admin/commissions', icon: Percent, label: 'Commissions' },
  { href: '/admin/delivery-charges', icon: Truck, label: 'Delivery Charges' },
  { href: '/admin/analytics', icon: BarChart2, label: 'Analytics' },
  { href: '/admin/events', icon: Activity, label: 'Events' },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/admin-logout', { method: 'POST' });
    router.push('/admin-login');
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E5E7EB] overflow-x-auto safe-bottom">
      <div className="flex">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 shrink-0 transition-colors ${active ? 'text-primary-600' : 'text-[#6B7280]'}`}
            >
              <Icon className={`w-4 h-4 ${active ? 'stroke-[2.5px]' : ''}`} />
              <span className="text-[9px] font-medium whitespace-nowrap">{label}</span>
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-0.5 px-3 py-2 shrink-0 transition-colors text-red-500 hover:text-red-600"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-[9px] font-medium whitespace-nowrap">Logout</span>
        </button>
      </div>
    </nav>
  );
}
