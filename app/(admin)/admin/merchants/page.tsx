'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { MerchantFormModal } from '@/components/admin/MerchantFormModal';

const STATUS_FILTERS = ['all', 'pending', 'approved', 'rejected', 'suspended'] as const;

export default function AdminMerchantsPage() {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState<any>(null);
  const supabase = createClient();

  async function loadMerchants() {
    const { data } = await supabase
      .from('merchants')
      .select('*')
      .order('created_at', { ascending: false });
    setMerchants(data ?? []);
    setLoading(false);
  }

  useEffect(() => { loadMerchants(); }, []);

  async function handleStatusToggle(merchant: any) {
    const newStatus = merchant.status === 'approved' ? 'suspended' : 'approved';
    await supabase.from('merchants').update({ status: newStatus }).eq('id', merchant.id);
    loadMerchants();
  }

  async function handleOverrideChange(merchantId: string, value: boolean | null) {
    await fetch(`/api/admin/merchants/${merchantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_override: value }),
    });
    loadMerchants();
  }

  async function handleComingSoonToggle(merchantId: string, current: boolean) {
    await fetch(`/api/admin/merchants/${merchantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coming_soon: !current }),
    });
    loadMerchants();
  }

  const filtered = filterStatus === 'all'
    ? merchants
    : merchants.filter(m => m.status === filterStatus);

  return (
    <>
      <AdminHeader title="Merchants" />
      <main className="pb-24">

        {/* Count + Add button */}
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm text-gray-500">{merchants.length} merchants</p>
          <button
            onClick={() => { setEditingMerchant(null); setShowModal(true); }}
            className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium"
          >
            + Add Merchant
          </button>
        </div>

        {/* Status filter chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-3">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                filterStatus === s
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'border-gray-200 text-gray-500'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="px-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-36" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-2">🏪</p>
              <p className="text-sm">No merchants on Zupr yet</p>
            </div>
          ) : (
            filtered.map(merchant => (
              <div key={merchant.id} className="bg-white rounded-2xl p-4 border border-gray-100 mb-3">

                {/* Name + status badge */}
                <div className="flex items-start justify-between mb-1">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-semibold text-gray-900 truncate">{merchant.store_name}</p>
                    <p className="text-xs text-gray-500">
                      {merchant.merchant_type ?? '—'} · {merchant.area || merchant.address || '—'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      merchant.status === 'approved'  ? 'bg-green-100 text-green-700'  :
                      merchant.status === 'pending'   ? 'bg-yellow-100 text-yellow-700' :
                      merchant.status === 'suspended' ? 'bg-red-100 text-red-700'      :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {merchant.status}
                    </span>
                    {merchant.coming_soon && (
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-orange-100 text-orange-700">
                        Coming Soon
                      </span>
                    )}
                    {merchant.admin_override !== null && (
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        merchant.admin_override === true ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        Override Active
                      </span>
                    )}
                  </div>
                </div>

                {/* Meta row */}
                <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3 mt-2">
                  <span>📞 {merchant.phone || '—'}</span>
                  <span>⏱ {merchant.avg_delivery_time ?? 30} min</span>
                  <span>Min ₹{merchant.min_order_amount ?? 50}</span>
                  <span>Commission {merchant.commission_rate ?? 10}%</span>
                </div>

                {/* Merchant status + admin override */}
                <div className="flex items-center justify-between mb-3 bg-gray-50 rounded-xl px-3 py-2">
                  <span className="text-xs text-gray-500">
                    Merchant: {merchant.is_open !== false ? '🟢 Open' : '🔴 Closed'}
                  </span>
                  <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs font-medium">
                    {([
                      { label: 'Force Open', value: true },
                      { label: 'Auto', value: null },
                      { label: 'Force Closed', value: false },
                    ] as { label: string; value: boolean | null }[]).map(({ label, value }) => {
                      const active = (merchant.admin_override ?? null) === value;
                      return (
                        <button
                          key={label}
                          onClick={() => handleOverrideChange(merchant.id, value)}
                          className={`px-2 py-1 transition-colors border-r last:border-r-0 border-gray-200 ${
                            active
                              ? value === true  ? 'bg-green-500 text-white'
                                : value === false ? 'bg-red-500 text-white'
                                : 'bg-gray-600 text-white'
                              : 'bg-white text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Coming Soon toggle */}
                <div className="flex items-center justify-between mb-3 bg-gray-50 rounded-xl px-3 py-2">
                  <span className="text-xs text-gray-500">
                    {merchant.coming_soon ? '🟠 Coming Soon (menu hidden from customers)' : '🟢 Visible to customers'}
                  </span>
                  <button
                    onClick={() => handleComingSoonToggle(merchant.id, merchant.coming_soon ?? false)}
                    className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors ${
                      merchant.coming_soon
                        ? 'bg-orange-500 text-white'
                        : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {merchant.coming_soon ? 'Mark as Live' : 'Mark Coming Soon'}
                  </button>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditingMerchant(merchant); setShowModal(true); }}
                    className="flex-1 flex items-center justify-center gap-1 border border-purple-200 text-purple-600 rounded-xl py-2 text-sm"
                  >
                    ✏️ Edit
                  </button>
                  <a
                    href={`/admin/products?merchant_id=${merchant.id}&merchant_name=${encodeURIComponent(merchant.store_name)}`}
                    className="flex-1 flex items-center justify-center gap-1 border border-gray-200 text-gray-600 rounded-xl py-2 text-sm"
                  >
                    📦 Products
                  </a>
                  <button
                    onClick={() => handleStatusToggle(merchant)}
                    className={`flex-1 rounded-xl py-2 text-sm font-medium ${
                      merchant.status === 'approved'
                        ? 'bg-red-50 text-red-600'
                        : 'bg-green-50 text-green-600'
                    }`}
                  >
                    {merchant.status === 'approved' ? 'Suspend' : 'Approve'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {showModal && (
        <MerchantFormModal
          merchant={editingMerchant}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); loadMerchants(); }}
        />
      )}
    </>
  );
}
