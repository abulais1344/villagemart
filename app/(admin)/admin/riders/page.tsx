'use client';

import { useEffect, useState } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import toast from 'react-hot-toast';
import { RiderFormModal, type RiderRow } from './RiderFormModal';

type RiderOrderHistory = {
  id: string;
  created_at: string;
  picked_up_at: string | null;
  delivered_at: string | null;
  status: string;
  customer_name: string;
  delivery_address: any;
  total_amount: number;
  store_name: string | null;
};

function todayIST(): string {
  const istMs = Date.now() + 5.5 * 60 * 60 * 1000;
  return new Date(istMs).toISOString().slice(0, 10);
}

function toISTDate(iso: string): string {
  const istMs = new Date(iso).getTime() + 5.5 * 60 * 60 * 1000;
  return new Date(istMs).toISOString().slice(0, 10);
}

function fmtDeliveryTime(o: RiderOrderHistory): string {
  if (!o.picked_up_at || !o.delivered_at) return '—';
  const mins = Math.round((new Date(o.delivered_at).getTime() - new Date(o.picked_up_at).getTime()) / 60000);
  return `${mins} min`;
}

function fmtDateTime(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 5.5 * 60 * 60 * 1000);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
}

const STATUS_COLOR: Record<string, string> = {
  delivered:        'bg-green-100 text-green-700',
  out_for_delivery: 'bg-indigo-100 text-indigo-700',
  cancelled:        'bg-red-100 text-red-700',
  ready:            'bg-green-100 text-green-700',
  preparing:        'bg-blue-100 text-blue-700',
  confirmed:        'bg-blue-100 text-blue-700',
  pending:          'bg-orange-100 text-orange-700',
};

export default function AdminRidersPage() {
  const [riders, setRiders] = useState<RiderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RiderRow | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [historyMap, setHistoryMap] = useState<Record<string, RiderOrderHistory[]>>({});
  const [historyLoading, setHistoryLoading] = useState<string | null>(null);

  async function load() {
    const res = await fetch('/api/admin/riders');
    if (res.ok) {
      const data = await res.json();
      setRiders(data.riders ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleExpand(rider: RiderRow) {
    if (expandedId === rider.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(rider.id);
    if (historyMap[rider.id]) return;
    setHistoryLoading(rider.id);
    const res = await fetch(`/api/admin/riders?riderId=${rider.id}`);
    if (res.ok) {
      const data = await res.json();
      setHistoryMap(prev => ({ ...prev, [rider.id]: data.orders ?? [] }));
    }
    setHistoryLoading(null);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete rider "${name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/riders?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Rider deleted');
      load();
    } else {
      toast.error('Failed to delete');
    }
  }

  function openEdit(rider: RiderRow) {
    setEditing(rider);
    setShowForm(true);
  }

  function handleSaved() {
    load();
    toast.success(editing ? 'Rider updated' : 'Rider added');
  }

  return (
    <>
      <AdminHeader title="Riders" />
      <main className="pb-4">
        <div className="px-4 py-4 flex justify-between items-center">
          <p className="text-sm text-[#6B7280]">{riders.length} rider{riders.length !== 1 ? 's' : ''}</p>
          <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
            + Add Rider
          </Button>
        </div>

        {loading ? (
          <div className="px-4 space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
          </div>
        ) : riders.length === 0 ? (
          <div className="text-center py-16 text-[#6B7280]">
            <p className="text-4xl mb-3">🛵</p>
            <p className="text-sm">No riders yet. Add one to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] text-xs text-[#6B7280]">
                  <th className="text-left px-4 py-2 font-medium">Name</th>
                  <th className="text-left px-4 py-2 font-medium">Phone</th>
                  <th className="text-left px-4 py-2 font-medium">Username</th>
                  <th className="text-left px-4 py-2 font-medium">Vehicle</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-right px-4 py-2 font-medium">Deliveries</th>
                  <th className="text-right px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {riders.map(rider => (
                  <>
                    <tr
                      key={rider.id}
                      className="border-b border-[#F3F4F6] hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleExpand(rider)}
                    >
                      <td className="px-4 py-3 font-medium text-[#1A1A1A]">{rider.name}</td>
                      <td className="px-4 py-3 text-[#6B7280]">{rider.phone}</td>
                      <td className="px-4 py-3 text-[#6B7280] font-mono text-xs">{rider.portal_username}</td>
                      <td className="px-4 py-3 text-[#6B7280]">{rider.vehicle_type || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${rider.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {rider.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[#1A1A1A]">
                        {rider.total_deliveries}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEdit(rider)}
                            className="text-xs text-[#7C3AED] font-medium hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(rider.id, rider.name)}
                            className="text-xs text-red-500 font-medium hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded history panel */}
                    {expandedId === rider.id && (
                      <tr key={`${rider.id}-detail`}>
                        <td colSpan={7} className="bg-gray-50 px-4 py-4 border-b border-[#E5E7EB]">
                          {historyLoading === rider.id ? (
                            <div className="space-y-2">
                              {[1, 2].map(i => <Skeleton key={i} className="h-8 w-full rounded-xl" />)}
                            </div>
                          ) : (() => {
                            const orders = historyMap[rider.id] ?? [];
                            const today = todayIST();
                            const todayCount = orders.filter(o => o.delivered_at && toISTDate(o.delivered_at) === today).length;
                            const totalDelivered = orders.filter(o => o.status === 'delivered').length;

                            return (
                              <>
                                <div className="flex gap-4 mb-3">
                                  <span className="text-xs font-semibold text-[#1A1A1A]">
                                    {totalDelivered} delivered total
                                  </span>
                                  <span className="text-xs font-semibold text-[#7C3AED]">
                                    {todayCount} today
                                  </span>
                                </div>

                                {orders.length === 0 ? (
                                  <p className="text-xs text-[#6B7280]">No orders assigned yet.</p>
                                ) : (
                                  <div className="overflow-x-auto rounded-xl border border-[#E5E7EB] bg-white">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="border-b border-[#E5E7EB] text-[#6B7280]">
                                          <th className="text-left px-3 py-2 font-medium">Date</th>
                                          <th className="text-left px-3 py-2 font-medium">Order #</th>
                                          <th className="text-left px-3 py-2 font-medium">Store</th>
                                          <th className="text-left px-3 py-2 font-medium">Customer</th>
                                          <th className="text-left px-3 py-2 font-medium">Delivery Time</th>
                                          <th className="text-left px-3 py-2 font-medium">Status</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {orders.map(o => (
                                          <tr key={o.id} className="border-b border-[#F3F4F6]">
                                            <td className="px-3 py-2 text-[#6B7280] whitespace-nowrap">{fmtDateTime(o.created_at)}</td>
                                            <td className="px-3 py-2 font-mono font-semibold">{o.id.slice(-6).toUpperCase()}</td>
                                            <td className="px-3 py-2 text-[#6B7280]">{o.store_name ?? '—'}</td>
                                            <td className="px-3 py-2 text-[#6B7280]">{o.customer_name}</td>
                                            <td className="px-3 py-2 font-medium">{fmtDeliveryTime(o)}</td>
                                            <td className="px-3 py-2">
                                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_COLOR[o.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                                {o.status.replace('_', ' ')}
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <RiderFormModal
        open={showForm}
        editing={editing}
        onClose={() => setShowForm(false)}
        onSaved={handleSaved}
      />
    </>
  );
}
