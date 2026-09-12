'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import toast from 'react-hot-toast';

interface ComboRow {
  id: string;
  merchant_id: string;
  required_product_ids: string[];
  free_product_id: string;
  label: string | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

interface MerchantOption { id: string; store_name: string; }
interface ProductOption  { id: string; name: string; selling_price: number; }

function isoToDate(iso: string | null) { return iso ? iso.slice(0, 10) : ''; }
function dateToISO(d: string) { return d ? new Date(d).toISOString() : null; }

const emptyForm = {
  merchant_id: '',
  label: '',
  required_product_ids: [] as string[],
  free_product_id: '',
  starts_at: '',
  ends_at: '',
};

export default function AdminCombosPage() {
  const [combos, setCombos]       = useState<ComboRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [form, setForm]           = useState(emptyForm);
  const [merchants, setMerchants] = useState<MerchantOption[]>([]);
  const [products, setProducts]   = useState<ProductOption[]>([]);
  const [productSearch, setProductSearch] = useState('');
  // Flat name cache keyed by product id for the list view
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const supabase = createClient();

  const loadCombos = async () => {
    const res = await fetch('/api/admin/combo-promos');
    const body = await res.json().catch(() => ({ combos: [] }));
    const rows: ComboRow[] = body.combos ?? [];
    setCombos(rows);
    setLoading(false);

    // Resolve product names for all IDs appearing in any combo
    const allIds = Array.from(new Set([
      ...rows.map(r => r.free_product_id),
      ...rows.flatMap(r => r.required_product_ids),
    ]));
    if (allIds.length) {
      const { data } = await supabase
        .from('vm_products')
        .select('id, name')
        .in('id', allIds);
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((p: any) => { map[p.id] = p.name; });
        setProductNames(map);
      }
    }
  };

  useEffect(() => {
    loadCombos();
    fetch('/api/admin/merchants')
      .then(r => r.json())
      .then(d => setMerchants(
        (d.merchants ?? []).map((m: any) => ({ id: m.id, store_name: m.store_name }))
      ))
      .catch(() => {});
  }, []);

  // Load products when merchant changes in the form
  useEffect(() => {
    if (!form.merchant_id) { setProducts([]); return; }
    supabase
      .from('vm_products')
      .select('id, name, selling_price')
      .eq('merchant_id', form.merchant_id)
      .eq('is_active', true)
      .order('name')
      .limit(500)
      .then(({ data }) => setProducts(
        (data ?? []).map((p: any) => ({ id: p.id, name: p.name, selling_price: p.selling_price }))
      ));
  }, [form.merchant_id]);

  const handleSave = async () => {
    if (!form.merchant_id) { toast.error('Select a merchant'); return; }
    if (form.required_product_ids.length < 1) { toast.error('Select at least one required product'); return; }
    if (!form.free_product_id) { toast.error('Select the free product'); return; }

    setSaving(true);
    const res = await fetch('/api/admin/combo-promos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_id: form.merchant_id,
        required_product_ids: form.required_product_ids,
        free_product_id: form.free_product_id,
        label: form.label || null,
        starts_at: dateToISO(form.starts_at),
        ends_at: dateToISO(form.ends_at),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? 'Failed to save combo');
      return;
    }
    toast.success('Combo promo added');
    setShowForm(false);
    setForm(emptyForm);
    setProducts([]);
    setProductSearch('');
    loadCombos();
  };

  const toggleActive = async (combo: ComboRow) => {
    await fetch(`/api/admin/combo-promos/${combo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !combo.is_active }),
    });
    loadCombos();
  };

  const deleteCombo = async (id: string) => {
    const res = await fetch(`/api/admin/combo-promos/${id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Failed to delete'); return; }
    setCombos(prev => prev.filter(c => c.id !== id));
    toast.success('Deleted');
  };

  const toggleRequiredProduct = (productId: string) => {
    setForm(f => ({
      ...f,
      required_product_ids: f.required_product_ids.includes(productId)
        ? f.required_product_ids.filter(id => id !== productId)
        : [...f.required_product_ids, productId],
    }));
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const productName = (id: string) =>
    productNames[id] ?? products.find(p => p.id === id)?.name ?? id.slice(0, 8) + '…';

  const closeForm = () => {
    setShowForm(false);
    setForm(emptyForm);
    setProducts([]);
    setProductSearch('');
  };

  return (
    <>
      <AdminHeader title="Combo Promos" />
      <main className="px-4 py-4 space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-[#6B7280]">Buy A + B, get C free</p>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Add Combo
          </Button>
        </div>

        <div className="bg-primary-50 rounded-2xl p-4">
          <p className="text-sm text-primary-700 font-medium">
            When all required products are in the customer's cart, the free product is added automatically at ₹0.
          </p>
        </div>

        {loading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        ) : combos.length === 0 ? (
          <p className="text-sm text-[#6B7280] text-center py-8">No combo promos yet</p>
        ) : (
          <div className="space-y-2">
            {combos.map(c => (
              <div key={c.id} className={`bg-white rounded-2xl border p-4 ${c.is_active ? 'border-[#E5E7EB]' : 'border-dashed border-gray-300 opacity-60'}`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1A1A1A] truncate">
                      {c.label ?? (merchants.find(m => m.id === c.merchant_id)?.store_name ?? c.merchant_id.slice(0, 8))}
                    </p>
                    <p className="text-xs text-[#6B7280] mt-0.5 leading-snug">
                      {c.required_product_ids.map(id => productName(id)).join(' + ')}
                      {' → '}
                      <span className="text-success font-medium">Free: {productName(c.free_product_id)}</span>
                    </p>
                    {(c.starts_at || c.ends_at) && (
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {isoToDate(c.starts_at) || '—'} → {isoToDate(c.ends_at) || '∞'}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleActive(c)}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.is_active ? 'bg-green-100 text-success' : 'bg-gray-100 text-[#6B7280]'}`}
                    >
                      {c.is_active ? 'Active' : 'Off'}
                    </button>
                    <button onClick={() => deleteCombo(c.id)} className="text-error">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Modal open={showForm} onClose={closeForm} title="Add Combo Promo">
        <div className="space-y-4">
          {/* Merchant picker */}
          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Merchant</label>
            <select
              value={form.merchant_id}
              onChange={e => setForm(f => ({ ...f, merchant_id: e.target.value, required_product_ids: [], free_product_id: '' }))}
              className="w-full rounded-xl border border-[#E5E7EB] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select merchant…</option>
              {merchants.map(m => <option key={m.id} value={m.id}>{m.store_name}</option>)}
            </select>
          </div>

          {/* Label */}
          <Input
            label="Label (optional)"
            placeholder="e.g. Pizza + Manchurian → Free Cold Coffee"
            value={form.label}
            onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
          />

          {/* Required products multi-select — only shown once a merchant is selected */}
          {form.merchant_id && (
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                Required Products <span className="text-[#6B7280] font-normal">(all must be in cart)</span>
              </label>
              {form.required_product_ids.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {form.required_product_ids.map(id => {
                    const p = products.find(p => p.id === id);
                    return (
                      <span key={id} className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 text-xs px-2 py-1 rounded-full">
                        {p?.name ?? id.slice(0, 8)}
                        <button onClick={() => toggleRequiredProduct(id)} className="leading-none hover:text-error">×</button>
                      </span>
                    );
                  })}
                </div>
              )}
              <div className="relative mb-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B7280]" />
                <input
                  type="text"
                  placeholder="Search products…"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="max-h-44 overflow-y-auto border border-[#E5E7EB] rounded-xl divide-y divide-gray-50">
                {filteredProducts.length === 0 ? (
                  <p className="text-xs text-[#6B7280] text-center py-3">
                    {products.length === 0 ? 'Loading…' : 'No products match'}
                  </p>
                ) : filteredProducts.map(p => (
                  <label key={p.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={form.required_product_ids.includes(p.id)}
                      onChange={() => toggleRequiredProduct(p.id)}
                      className="accent-primary-600"
                    />
                    <span className="text-sm text-[#1A1A1A] flex-1 min-w-0 truncate">{p.name}</span>
                    <span className="text-xs text-[#6B7280] shrink-0">₹{p.selling_price}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Free product single-select */}
          {form.merchant_id && (
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Free Product</label>
              <select
                value={form.free_product_id}
                onChange={e => setForm(f => ({ ...f, free_product_id: e.target.value }))}
                className="w-full rounded-xl border border-[#E5E7EB] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select free product…</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} (₹{p.selling_price})</option>)}
              </select>
            </div>
          )}

          {/* Optional date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">Active From</label>
              <input type="date" value={form.starts_at}
                onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">Active Until</label>
              <input type="date" value={form.ends_at}
                onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <p className="text-xs text-gray-400">Leave dates blank for a permanently active combo.</p>

          <Button fullWidth loading={saving} onClick={handleSave}>Add Combo Promo</Button>
        </div>
      </Modal>
    </>
  );
}
