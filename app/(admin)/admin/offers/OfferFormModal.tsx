'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export type OfferRow = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number;
  max_discount: number | null;
  first_order_only: boolean;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
};

type FormState = {
  title: string;
  description: string;
  type: 'platform' | 'merchant';
  discount_type: 'flat' | 'percentage';
  discount_value: string;
  min_order_amount: string;
  max_discount: string;
  first_order_only: boolean;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
};

const EMPTY: FormState = {
  title: '', description: '',
  type: 'platform', discount_type: 'flat',
  discount_value: '', min_order_amount: '',
  max_discount: '', first_order_only: false,
  starts_at: '', ends_at: '', is_active: true,
};

function toInputDt(iso?: string | null) {
  if (!iso) return '';
  return iso.slice(0, 16);
}

interface Props {
  open: boolean;
  editing: OfferRow | null;
  onClose: () => void;
  onSaved: () => void;
}

export function OfferFormModal({ open, editing, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({
        title:             editing.title,
        description:       editing.description ?? '',
        type:              (editing.type as 'platform' | 'merchant') ?? 'platform',
        discount_type:     (editing.discount_type as 'flat' | 'percentage') ?? 'flat',
        discount_value:    String(editing.discount_value),
        min_order_amount:  String(editing.min_order_amount),
        max_discount:      editing.max_discount != null ? String(editing.max_discount) : '',
        first_order_only:  editing.first_order_only ?? false,
        starts_at:         toInputDt(editing.starts_at),
        ends_at:           toInputDt(editing.ends_at),
        is_active:         editing.is_active,
      });
    } else {
      setForm(EMPTY);
    }
  }, [editing, open]);

  const f = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const toggle = (key: 'first_order_only' | 'is_active') =>
    setForm(prev => ({ ...prev, [key]: !prev[key] }));

  async function handleSave() {
    if (!form.title || !form.discount_value) {
      return;
    }
    setSaving(true);

    const payload = {
      title:            form.title,
      description:      form.description || null,
      type:             form.type,
      discount_type:    form.discount_type,
      discount_value:   Number(form.discount_value),
      min_order_amount: Number(form.min_order_amount) || 0,
      max_discount:     form.max_discount ? Number(form.max_discount) : null,
      first_order_only: form.first_order_only,
      starts_at:        form.starts_at || null,
      ends_at:          form.ends_at || null,
      is_active:        form.is_active,
    };

    const url    = editing ? `/api/admin/offers?id=${editing.id}` : '/api/admin/offers';
    const method = editing ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? 'Save failed');
      return;
    }
    onSaved();
  }

  const labelClass = 'block text-sm font-medium text-[#1A1A1A] mb-1';

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Offer' : 'Add Offer'} size="lg">
      <div className="space-y-4">
        <Input
          label="Title *"
          value={form.title}
          onChange={f('title')}
          placeholder="e.g. First Order ₹50 OFF"
        />

        <div>
          <label className={labelClass}>Description</label>
          <textarea
            value={form.description}
            onChange={f('description')}
            rows={2}
            placeholder="Optional — shown to customer"
            className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Type</label>
            <select value={form.type} onChange={f('type')} className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]">
              <option value="platform">Platform (all)</option>
              <option value="merchant">Merchant-specific</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Discount Type</label>
            <select value={form.discount_type} onChange={f('discount_type')} className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]">
              <option value="flat">Flat (₹)</option>
              <option value="percentage">Percentage (%)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label={`Discount Value * (${form.discount_type === 'flat' ? '₹' : '%'})`}
            type="number"
            min={0}
            value={form.discount_value}
            onChange={f('discount_value')}
            placeholder="e.g. 50"
          />
          <Input
            label="Min Order Amount (₹)"
            type="number"
            min={0}
            value={form.min_order_amount}
            onChange={f('min_order_amount')}
            placeholder="e.g. 299"
          />
        </div>

        {form.discount_type === 'percentage' && (
          <Input
            label="Max Discount Cap (₹) — optional"
            type="number"
            min={0}
            value={form.max_discount}
            onChange={f('max_discount')}
            placeholder="e.g. 100"
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Starts At</label>
            <input
              type="datetime-local"
              value={form.starts_at}
              onChange={f('starts_at')}
              className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
            />
          </div>
          <div>
            <label className={labelClass}>Ends At</label>
            <input
              type="datetime-local"
              value={form.ends_at}
              onChange={f('ends_at')}
              className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
            />
          </div>
        </div>

        {/* Toggles */}
        <label className="flex items-center gap-3 cursor-pointer">
          <button
            type="button"
            onClick={() => toggle('first_order_only')}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${form.first_order_only ? 'bg-[#7C3AED]' : 'bg-gray-200'}`}
          >
            <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${form.first_order_only ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
          <span className="text-sm font-medium text-[#1A1A1A]">First order only</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <button
            type="button"
            onClick={() => toggle('is_active')}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${form.is_active ? 'bg-[#7C3AED]' : 'bg-gray-200'}`}
          >
            <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
          <span className="text-sm font-medium text-[#1A1A1A]">{form.is_active ? 'Active' : 'Inactive'}</span>
        </label>

        <Button fullWidth loading={saving} onClick={handleSave}>
          {editing ? 'Update Offer' : 'Create Offer'}
        </Button>
      </div>
    </Modal>
  );
}
