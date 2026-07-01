'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { OfferFormModal, type OfferRow } from './OfferFormModal';
import toast from 'react-hot-toast';

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default function AdminOffersPage() {
  const [offers, setOffers]   = useState<OfferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<OfferRow | null>(null);

  const load = async () => {
    const res = await fetch('/api/admin/offers');
    if (!res.ok) { toast.error('Failed to load offers'); return; }
    const json = await res.json();
    setOffers(json.offers ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openAdd = () => { setEditing(null); setShowForm(true); };
  const openEdit = (o: OfferRow) => { setEditing(o); setShowForm(true); };

  const toggleActive = async (o: OfferRow) => {
    const next = !o.is_active;
    setOffers(prev => prev.map(x => x.id === o.id ? { ...x, is_active: next } : x));
    const res = await fetch(`/api/admin/offers?id=${o.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: next }),
    });
    if (!res.ok) {
      setOffers(prev => prev.map(x => x.id === o.id ? { ...x, is_active: o.is_active } : x));
      toast.error('Toggle failed');
    } else {
      toast.success(next ? 'Offer activated' : 'Offer paused');
    }
  };

  const deleteOffer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this offer?')) return;
    const res = await fetch(`/api/admin/offers?id=${id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Delete failed'); return; }
    setOffers(prev => prev.filter(o => o.id !== id));
    toast.success('Offer deleted');
  };

  const handleSaved = () => {
    setShowForm(false);
    toast.success(editing ? 'Offer updated' : 'Offer created');
    load();
  };

  return (
    <>
      <AdminHeader title="Offers" />
      <main className="px-4 py-4 space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-[#6B7280]">{offers.length} offer{offers.length !== 1 ? 's' : ''}</p>
          <Button size="sm" onClick={openAdd}>
            <Plus className="w-4 h-4" /> Add Offer
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        ) : offers.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🎁</p>
            <p className="text-sm text-[#6B7280]">No offers yet. Create your first one!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {offers.map(o => (
              <div key={o.id} className="bg-white rounded-2xl border border-[#E5E7EB] p-3">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0 text-xl">
                    🎁
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[#1A1A1A] truncate">{o.title}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${o.type === 'platform' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {o.type}
                      </span>
                    </div>
                    <p className="text-xs text-[#6B7280] mt-0.5">
                      {o.discount_type === 'flat' ? `₹${o.discount_value} OFF` : `${o.discount_value}% OFF`}
                      {o.min_order_amount > 0 && ` · Min ₹${o.min_order_amount}`}
                      {o.first_order_only && ' · First order only'}
                    </p>
                    <p className="text-xs text-[#9CA3AF] mt-0.5">
                      {fmtDate(o.starts_at)} → {fmtDate(o.ends_at)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleActive(o)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${o.is_active ? 'bg-[#7C3AED]' : 'bg-gray-200'}`}
                      title={o.is_active ? 'Active — click to pause' : 'Paused — click to activate'}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${o.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                    <button onClick={() => openEdit(o)} className="text-primary-600 p-1"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => deleteOffer(o.id)} className="text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <OfferFormModal
        open={showForm}
        editing={editing}
        onClose={() => setShowForm(false)}
        onSaved={handleSaved}
      />
    </>
  );
}
