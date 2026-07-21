'use client';

import { useEffect, useState } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';

const DAYS_OPTIONS = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 14 days', value: 14 },
  { label: 'Last 30 days', value: 30 },
];

const EVENT_TYPE_LABELS: Record<string, string> = {
  login: 'Login',
  store_visit: 'Store Visit',
  add_to_cart: 'Add to Cart',
  razorpay_opened: 'Razorpay Opened',
  checkout_blocked: 'Checkout Blocked',
  geocode_request: 'Geocode Request',
};

const REASON_LABELS: Record<string, string> = {
  restaurant_closed: 'Restaurant Closed',
  zone_invalid: 'Zone Invalid',
  geocode_quota_exceeded: 'Quota Exceeded',
  geocode_other_error: 'Other Error',
};

function StatTable({ title, rows, keyLabel, countLabel }: {
  title: string;
  rows: [string, number][];
  keyLabel: string;
  countLabel?: string;
}) {
  const total = rows.reduce((s, [, n]) => s + n, 0);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
        <span className="text-xs text-gray-400">{total.toLocaleString()} total</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No data</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50">
              <th className="text-left text-xs text-gray-400 font-medium px-4 py-2">{keyLabel}</th>
              <th className="text-right text-xs text-gray-400 font-medium px-4 py-2">{countLabel ?? 'Count'}</th>
              <th className="text-right text-xs text-gray-400 font-medium px-4 py-2">%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([key, count]) => (
              <tr key={key} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-2.5 text-gray-700">{key}</td>
                <td className="px-4 py-2.5 text-right font-mono font-medium text-gray-900">
                  {count.toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-400 font-mono text-xs">
                  {total > 0 ? Math.round((count / total) * 100) : 0}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function AdminEventsPage() {
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [countByType, setCountByType] = useState<Record<string, number>>({});
  const [blockedByReason, setBlockedByReason] = useState<Record<string, number>>({});
  const [geocodeBySource, setGeocodeBySource] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/events?days=${days}`)
      .then(r => r.json())
      .then(d => {
        setCountByType(d.countByType ?? {});
        setBlockedByReason(d.blockedByReason ?? {});
        setGeocodeBySource(d.geocodeBySource ?? {});
        setTotal(d.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [days]);

  const typeRows: [string, number][] = Object.entries(countByType)
    .map(([k, v]) => [EVENT_TYPE_LABELS[k] ?? k, v] as [string, number])
    .sort((a, b) => b[1] - a[1]);

  const reasonRows: [string, number][] = Object.entries(blockedByReason)
    .map(([k, v]) => [REASON_LABELS[k] ?? k, v] as [string, number])
    .sort((a, b) => b[1] - a[1]);

  const sourceRows: [string, number][] = Object.entries(geocodeBySource)
    .sort((a, b) => b[1] - a[1]);

  return (
    <>
      <AdminHeader title="Events" />
      <main className="px-4 py-4 space-y-4">
        {/* Date range selector */}
        <div className="flex gap-2">
          {DAYS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setDays(opt.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                days === opt.value
                  ? 'bg-[#7C3AED] text-white'
                  : 'bg-white border border-gray-200 text-gray-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400">{total.toLocaleString()} events recorded in this period</p>

            <StatTable
              title="Events by Type"
              rows={typeRows}
              keyLabel="Event"
            />

            <StatTable
              title="Checkout Blocked — by Reason"
              rows={reasonRows}
              keyLabel="Reason"
            />

            <StatTable
              title="Geocode Requests — by Source"
              rows={sourceRows}
              keyLabel="Source (component)"
              countLabel="Calls"
            />
          </>
        )}
      </main>
    </>
  );
}
