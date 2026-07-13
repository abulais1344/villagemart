'use client';

import { useEffect, useState } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import toast from 'react-hot-toast';

const STATUSES = ['pending', 'scheduled', 'dispatched', 'delivered', 'cancelled'] as const;
type ParcelStatus = typeof STATUSES[number];

const STATUS_STYLE: Record<ParcelStatus, string> = {
  pending:    'bg-yellow-100 text-yellow-700',
  scheduled:  'bg-blue-100 text-blue-700',
  dispatched: 'bg-indigo-100 text-indigo-700',
  delivered:  'bg-green-100 text-green-700',
  cancelled:  'bg-red-100 text-red-700',
};

interface ParcelOrder {
  id: string;
  store_name: string;
  destination_area: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  items: Array<{ name: string; quantity: number; unit_price: number }>;
  subtotal: number;
  delivery_charge: number;
  commission_amount: number;
  status: ParcelStatus;
  order_date: string;
  notes: string | null;
  created_at: string;
}

interface ParcelMerchant {
  id: string;
  store_name: string;
  parcel_delivery_charge: number;
  parcel_order_cutoff_time: string;
}

export default function AdminParcelOrdersPage() {
  const [orders, setOrders] = useState<ParcelOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filterArea, setFilterArea] = useState('all');
  const [filterDate, setFilterDate] = useState('all');

  // Settings panel
  const [merchants, setMerchants] = useState<ParcelMerchant[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingValues, setSettingValues] = useState<Record<string, { charge: string; cutoff: string }>>({});
  const [savingSettings, setSavingSettings] = useState<string | null>(null);

  async function loadOrders() {
    const res = await fetch('/api/admin/parcel-orders');
    const json = await res.json();
    setOrders(json.orders ?? []);
    setLoading(false);
  }

  async function loadSettings() {
    const res = await fetch('/api/admin/parcel-settings');
    const json = await res.json();
    const m: ParcelMerchant[] = json.merchants ?? [];
    setMerchants(m);
    const vals: Record<string, { charge: string; cutoff: string }> = {};
    for (const merch of m) {
      vals[merch.id] = {
        charge: String(merch.parcel_delivery_charge ?? 150),
        cutoff: (merch.parcel_order_cutoff_time ?? '17:30:00').slice(0, 5),
      };
    }
    setSettingValues(vals);
  }

  useEffect(() => { loadOrders(); loadSettings(); }, []);

  async function patchStatus(orderId: string, status: string) {
    setUpdating(orderId);
    const res = await fetch('/api/admin/parcel-orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, status }),
    });
    setUpdating(null);
    if (res.ok) {
      toast.success('Status updated');
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: status as ParcelStatus } : o));
    } else {
      toast.error('Failed to update');
    }
  }

  async function saveSettings(merchantId: string) {
    const vals = settingValues[merchantId];
    if (!vals) return;
    setSavingSettings(merchantId);
    const res = await fetch('/api/admin/parcel-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantId,
        parcel_delivery_charge: parseFloat(vals.charge),
        parcel_order_cutoff_time: vals.cutoff + ':00',
      }),
    });
    setSavingSettings(null);
    if (res.ok) toast.success('Settings saved');
    else toast.error('Failed to save');
  }

  // Filter helpers
  const allAreas = [...new Set(orders.map(o => o.destination_area))].sort();
  const allDates = [...new Set(orders.map(o => o.order_date))].sort().reverse();

  const filtered = orders.filter(o => {
    if (filterArea !== 'all' && o.destination_area !== filterArea) return false;
    if (filterDate !== 'all' && o.order_date !== filterDate) return false;
    return true;
  });

  // Group by date then area
  const grouped = new Map<string, Map<string, ParcelOrder[]>>();
  for (const o of filtered) {
    if (!grouped.has(o.order_date)) grouped.set(o.order_date, new Map());
    const byArea = grouped.get(o.order_date)!;
    if (!byArea.has(o.destination_area)) byArea.set(o.destination_area, []);
    byArea.get(o.destination_area)!.push(o);
  }

  const fieldClass = 'border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-purple-400';

  return (
    <>
      <AdminHeader title="Parcel Orders" />

      <main className="px-4 py-4 space-y-4 pb-24">

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <select value={filterDate} onChange={e => setFilterDate(e.target.value)} className={fieldClass}>
            <option value="all">All dates</option>
            {allDates.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filterArea} onChange={e => setFilterArea(e.target.value)} className={fieldClass}>
            <option value="all">All areas</option>
            {allAreas.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={loadOrders} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
            Refresh
          </button>
          <button
            onClick={() => { setSettingsOpen(s => !s); }}
            className="ml-auto border border-purple-200 text-purple-700 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-purple-50"
          >
            ⚙️ Settings
          </button>
        </div>

        {/* Settings panel */}
        {settingsOpen && (
          <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 space-y-4">
            <h3 className="text-sm font-bold text-purple-900">Parcel Settings</h3>
            {merchants.length === 0 && <p className="text-xs text-gray-500">No parcel-enabled merchants found.</p>}
            {merchants.map(m => {
              const vals = settingValues[m.id] ?? { charge: '150', cutoff: '17:30' };
              return (
                <div key={m.id} className="bg-white rounded-xl p-3 space-y-3">
                  <p className="text-sm font-semibold text-gray-800">{m.store_name}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Delivery charge (₹)</label>
                      <input
                        type="number"
                        value={vals.charge}
                        onChange={e => setSettingValues(prev => ({ ...prev, [m.id]: { ...vals, charge: e.target.value } }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-purple-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Order cutoff (IST)</label>
                      <input
                        type="time"
                        value={vals.cutoff}
                        onChange={e => setSettingValues(prev => ({ ...prev, [m.id]: { ...vals, cutoff: e.target.value } }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-purple-400"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => saveSettings(m.id)}
                    disabled={savingSettings === m.id}
                    className="w-full bg-purple-600 text-white text-sm font-semibold py-2 rounded-lg disabled:opacity-60"
                  >
                    {savingSettings === m.id ? 'Saving…' : 'Save'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Summary counts */}
        {!loading && (
          <div className="flex gap-2 flex-wrap text-xs">
            {STATUSES.map(s => {
              const count = filtered.filter(o => o.status === s).length;
              if (count === 0) return null;
              return (
                <span key={s} className={`px-2.5 py-1 rounded-full font-semibold ${STATUS_STYLE[s]}`}>
                  {s}: {count}
                </span>
              );
            })}
          </div>
        )}

        {/* Order groups */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-2">📭</p>
            <p className="text-sm text-gray-500">No parcel orders</p>
          </div>
        ) : (
          Array.from(grouped.entries()).map(([date, byArea]) => (
            <div key={date}>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 mt-4">{date}</h2>
              {Array.from(byArea.entries()).map(([area, areaOrders]) => (
                <div key={area} className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-gray-700">📦 {area}</span>
                    <span className="text-xs text-gray-400">({areaOrders.length} order{areaOrders.length !== 1 ? 's' : ''})</span>
                    <span className="text-xs font-medium text-purple-600">
                      Total: ₹{areaOrders.reduce((s, o) => s + o.subtotal + o.delivery_charge, 0).toFixed(0)}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {areaOrders.map(order => {
                      const total = order.subtotal + order.delivery_charge;
                      return (
                        <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-mono text-xs text-gray-400">#{order.id.slice(-6).toUpperCase()}</span>
                              <span className="text-xs text-gray-400 ml-2">· {order.store_name}</span>
                              <p className="text-sm font-bold text-gray-900 mt-0.5">{order.customer_name}</p>
                              <a href={`tel:${order.customer_phone}`} className="text-sm text-purple-600 font-medium">
                                📞 {order.customer_phone}
                              </a>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${STATUS_STYLE[order.status]}`}>
                              {order.status}
                            </span>
                          </div>

                          {/* Address */}
                          <p className="text-xs text-gray-500 leading-snug">📍 {order.delivery_address}</p>

                          {/* Items */}
                          <div className="bg-gray-50 rounded-xl px-3 py-2 space-y-0.5">
                            {order.items.map((item, i) => (
                              <div key={i} className="flex justify-between text-xs text-gray-700">
                                <span>{item.name} ×{item.quantity}</span>
                                <span>₹{(item.unit_price * item.quantity).toFixed(0)}</span>
                              </div>
                            ))}
                          </div>

                          {/* Amounts */}
                          <div className="flex gap-4 text-xs text-gray-500">
                            <span>Subtotal: <strong className="text-gray-800">₹{order.subtotal.toFixed(0)}</strong></span>
                            <span>Delivery: <strong className="text-gray-800">₹{order.delivery_charge.toFixed(0)}</strong></span>
                            <span>Total: <strong className="text-purple-700">₹{total.toFixed(0)}</strong></span>
                            <span>Commission: <strong className="text-gray-800">₹{order.commission_amount.toFixed(2)}</strong></span>
                          </div>

                          {/* Status update */}
                          <div className="flex gap-2 items-center">
                            <select
                              defaultValue={order.status}
                              onChange={e => patchStatus(order.id, e.target.value)}
                              disabled={updating === order.id}
                              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400 disabled:opacity-60"
                            >
                              {STATUSES.map(s => (
                                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                              ))}
                            </select>
                            {updating === order.id && (
                              <span className="text-xs text-gray-400">Saving…</span>
                            )}
                          </div>

                          {/* WhatsApp link to customer */}
                          <a
                            href={`https://wa.me/91${order.customer_phone}?text=${encodeURIComponent(`Hi ${order.customer_name.split(' ')[0]}! Your parcel order #${order.id.slice(-6).toUpperCase()} from ${order.store_name} is confirmed. We'll update you on dispatch timing. — Zupr`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full text-center text-xs text-green-700 border border-green-200 rounded-xl py-2 hover:bg-green-50"
                          >
                            💬 WhatsApp Customer
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </main>
    </>
  );
}
