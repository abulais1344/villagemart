'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/utils/format';
import type { DeliveryCharge } from '@/types';
import toast from 'react-hot-toast';

// "YYYY-MM-DD" → ISO midnight IST (18:30 UTC previous day = start of day IST)
function dateToStartISO(d: string) { return d ? `${d}T18:30:00Z` : null; }
// "YYYY-MM-DD" → end-of-day IST (18:29:59 UTC same calendar day)
function dateToEndISO(d: string)   { return d ? `${d}T18:29:59Z` : null; }
function isoToDate(iso: string | null) { return iso ? iso.slice(0, 10) : ''; }

const emptyForm = { min_km: '0', max_km: '2', charge: '20', free_delivery_above: '', starts_at: '', ends_at: '' };

const emptySoda = { iday_soda_threshold_1: '120', iday_soda_qty_1: '1', iday_soda_threshold_2: '240', iday_soda_qty_2: '2', iday_soda_starts_at: '', iday_soda_ends_at: '' };

export default function AdminDeliveryChargesPage() {
  const [slabs, setSlabs] = useState<DeliveryCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [soda, setSoda] = useState(emptySoda);
  const [sodaLoading, setSodaLoading] = useState(true);
  const [sodaSaving, setSodaSaving] = useState(false);

  const load = async () => {
    const res = await fetch('/api/admin/delivery-charges');
    const body = await res.json().catch(() => ({ slabs: [] }));
    setSlabs(body.slabs ?? []);
    setLoading(false);
  };

  const loadSoda = async () => {
    const res = await fetch('/api/admin/soda-settings');
    if (!res.ok) { setSodaLoading(false); return; }
    const data = await res.json();
    setSoda({
      iday_soda_threshold_1: String(data.iday_soda_threshold_1 ?? 120),
      iday_soda_qty_1:       String(data.iday_soda_qty_1 ?? 1),
      iday_soda_threshold_2: String(data.iday_soda_threshold_2 ?? 240),
      iday_soda_qty_2:       String(data.iday_soda_qty_2 ?? 2),
      iday_soda_starts_at:   isoToDate(data.iday_soda_starts_at ?? null),
      iday_soda_ends_at:     isoToDate(data.iday_soda_ends_at ?? null),
    });
    setSodaLoading(false);
  };

  useEffect(() => { load(); loadSoda(); }, []);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch('/api/admin/delivery-charges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        min_km: parseFloat(form.min_km),
        max_km: parseFloat(form.max_km),
        charge: parseFloat(form.charge),
        free_delivery_above: form.free_delivery_above ? parseFloat(form.free_delivery_above) : null,
        starts_at: dateToStartISO(form.starts_at),
        ends_at:   dateToEndISO(form.ends_at),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(`Failed to add slab: ${body.error ?? res.statusText}`);
      return;
    }
    toast.success('Delivery slab added');
    setShowForm(false);
    setForm(emptyForm);
    load();
  };

  const handleSodaSave = async () => {
    setSodaSaving(true);
    const res = await fetch('/api/admin/soda-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...soda,
        iday_soda_starts_at: dateToStartISO(soda.iday_soda_starts_at),
        iday_soda_ends_at:   dateToEndISO(soda.iday_soda_ends_at),
      }),
    });
    setSodaSaving(false);
    if (!res.ok) { toast.error('Failed to save soda settings'); return; }
    toast.success('Soda reward tiers saved');
  };

  const toggleSlab = async (slab: DeliveryCharge) => {
    await fetch(`/api/admin/delivery-charges/${slab.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !slab.is_active }),
    });
    load();
  };

  const deleteSlab = async (id: string) => {
    const res = await fetch(`/api/admin/delivery-charges/${id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Failed to delete slab'); return; }
    setSlabs(prev => prev.filter(s => s.id !== id));
    toast.success('Slab deleted');
  };

  const sf = (key: keyof typeof soda) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setSoda(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <>
      <AdminHeader title="Delivery Charges" />
      <main className="px-4 py-4 space-y-4">
        <div className="flex justify-between">
          <p className="text-sm text-[#6B7280]">Distance slabs</p>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Add Slab
          </Button>
        </div>

        <div className="bg-primary-50 rounded-2xl p-4">
          <p className="text-sm text-primary-700 font-medium">Configure distance-based delivery charges. Free delivery can be set based on order amount and optional date range.</p>
        </div>

        {loading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        ) : (
          <div className="space-y-2">
            {slabs.map(s => (
              <div key={s.id} className={`bg-white rounded-2xl border p-4 ${s.is_active ? 'border-[#E5E7EB]' : 'border-dashed border-gray-300 opacity-60'}`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-[#1A1A1A]">{s.min_km}–{s.max_km} km</p>
                  <div className="flex gap-2 items-center">
                    <button onClick={() => toggleSlab(s)} className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.is_active ? 'bg-green-100 text-success' : 'bg-gray-100 text-[#6B7280]'}`}>
                      {s.is_active ? 'Active' : 'Off'}
                    </button>
                    <button onClick={() => deleteSlab(s.id)} className="text-error"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <p className="text-xl font-bold text-primary-600">{formatCurrency(s.charge)}</p>
                {s.free_delivery_above && (
                  <p className="text-xs text-success mt-1">Free above {formatCurrency(s.free_delivery_above)}</p>
                )}
                {((s as any).starts_at || (s as any).ends_at) && (
                  <p className="text-xs text-gray-400 mt-1">
                    {(s as any).starts_at ? isoToDate((s as any).starts_at) : '—'} → {(s as any).ends_at ? isoToDate((s as any).ends_at) : '∞'}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Jeera Soda reward tiers ── */}
        <div className="pt-2 border-t border-gray-100">
          <p className="text-sm font-semibold text-[#1A1A1A] mb-3">🥤 Jeera Soda Reward Tiers</p>
          {sodaLoading ? (
            <Skeleton className="h-32" />
          ) : (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Tier 1 — Min order (₹)" type="number" value={soda.iday_soda_threshold_1} onChange={sf('iday_soda_threshold_1')} />
                <Input label="Tier 1 — Qty" type="number" value={soda.iday_soda_qty_1} onChange={sf('iday_soda_qty_1')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Tier 2 — Min order (₹)" type="number" value={soda.iday_soda_threshold_2} onChange={sf('iday_soda_threshold_2')} />
                <Input label="Tier 2 — Qty" type="number" value={soda.iday_soda_qty_2} onChange={sf('iday_soda_qty_2')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">Active From</label>
                  <input type="date" value={soda.iday_soda_starts_at} onChange={sf('iday_soda_starts_at')}
                    className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">Active Until</label>
                  <input type="date" value={soda.iday_soda_ends_at} onChange={sf('iday_soda_ends_at')}
                    className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]" />
                </div>
              </div>
              <Button fullWidth loading={sodaSaving} onClick={handleSodaSave}>Save Soda Tiers</Button>
            </div>
          )}
        </div>
      </main>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Delivery Slab">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Min Distance (km)" type="number" step="0.1" value={form.min_km} onChange={e => setForm(f => ({ ...f, min_km: e.target.value }))} />
            <Input label="Max Distance (km)" type="number" step="0.1" value={form.max_km} onChange={e => setForm(f => ({ ...f, max_km: e.target.value }))} />
          </div>
          <Input label="Charge (₹)" type="number" step="0.01" value={form.charge} onChange={e => setForm(f => ({ ...f, charge: e.target.value }))} />
          <Input label="Free Delivery Above (₹)" type="number" step="0.01" placeholder="Optional"
            value={form.free_delivery_above} onChange={e => setForm(f => ({ ...f, free_delivery_above: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">Starts At</label>
              <input
                type="date"
                value={form.starts_at}
                onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">Ends At</label>
              <input
                type="date"
                value={form.ends_at}
                onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400">Leave dates blank for a permanently active slab.</p>
          <Button fullWidth loading={saving} onClick={handleSave}>Add Slab</Button>
        </div>
      </Modal>
    </>
  );
}
