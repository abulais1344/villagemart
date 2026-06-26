'use client';

import { useRouter } from 'next/navigation';
import { useMerchant } from '../MerchantProvider';
import { MerchantHeader } from '@/components/merchant/MerchantHeader';

const STATUS_COLOR: Record<string, string> = {
  approved:  'bg-green-100 text-green-700',
  pending:   'bg-yellow-100 text-yellow-700',
  suspended: 'bg-red-100 text-red-700',
  rejected:  'bg-red-100 text-red-700',
};

export default function MerchantProfilePage() {
  const merchant = useMerchant();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/merchant/logout', { method: 'POST' });
    window.location.href = '/merchant-login';
  }

  const INFO_ROWS = [
    { label: 'Store Name',  value: merchant.store_name                    },
    { label: 'Cuisine',     value: merchant.cuisine_type    || '—'        },
    { label: 'Phone',       value: merchant.phone           || '—'        },
    { label: 'Area',        value: merchant.area || merchant.address || '—' },
    { label: 'Opens at',    value: merchant.opening_time    || '—'        },
    { label: 'Closes at',   value: merchant.closing_time    || '—'        },
    { label: 'Min Order',   value: merchant.min_order_amount ? `₹${merchant.min_order_amount}` : '—' },
    { label: 'Delivery',    value: merchant.avg_delivery_time ? `~${merchant.avg_delivery_time} min` : '—' },
  ];

  return (
    <>
      <MerchantHeader storeName={merchant.store_name} />
      <main className="px-4 py-4">
        {/* Status badge */}
        <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Account Status</span>
          <span className={`text-xs px-3 py-1 rounded-full font-semibold ${STATUS_COLOR[merchant.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {merchant.status}
          </span>
        </div>

        {/* Info list */}
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 mb-8">
          {INFO_ROWS.map(row => (
            <div key={row.label} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-gray-500">{row.label}</span>
              <span className="text-sm font-medium text-gray-900 text-right max-w-[60%] truncate">{row.value}</span>
            </div>
          ))}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl font-semibold text-sm"
        >
          Logout
        </button>

        <p className="text-xs text-center text-gray-400 mt-6">Powered by Zupr · © 2026 Zupr</p>
      </main>
    </>
  );
}
