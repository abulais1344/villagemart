'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export type RiderRow = {
  id: string;
  name: string;
  phone: string;
  portal_username: string;
  vehicle_type: string | null;
  notes: string | null;
  is_active: boolean;
  total_deliveries?: number;
  created_at: string;
};

type Form = {
  name: string;
  phone: string;
  portal_username: string;
  portal_password: string;
  vehicle_type: string;
  notes: string;
  is_active: boolean;
};

function empty(): Form {
  return { name: '', phone: '', portal_username: '', portal_password: '', vehicle_type: '', notes: '', is_active: true };
}

export function RiderFormModal({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing: RiderRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Form>(empty());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        name: editing.name,
        phone: editing.phone,
        portal_username: editing.portal_username,
        portal_password: '',
        vehicle_type: editing.vehicle_type ?? '',
        notes: editing.notes ?? '',
        is_active: editing.is_active,
      });
    } else {
      setForm(empty());
    }
    setError('');
  }, [editing, open]);

  function f(key: keyof Form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));
  }

  async function handleSave() {
    setSaving(true);
    setError('');

    const url = editing ? `/api/admin/riders?id=${editing.id}` : '/api/admin/riders';
    const method = editing ? 'PATCH' : 'POST';

    const body: Record<string, any> = {
      name: form.name,
      phone: form.phone,
      portal_username: form.portal_username,
      vehicle_type: form.vehicle_type,
      notes: form.notes,
      is_active: form.is_active,
    };
    if (!editing || form.portal_password) body.portal_password = form.portal_password;

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || 'Failed to save');
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Rider' : 'Add Rider'}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">Name *</label>
            <input
              value={form.name}
              onChange={f('name')}
              className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
              placeholder="Raju Sharma"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">Phone *</label>
            <input
              value={form.phone}
              onChange={f('phone')}
              className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
              placeholder="+91 9876543210"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">Username *</label>
            <input
              value={form.portal_username}
              onChange={f('portal_username')}
              className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
              placeholder="raju123"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">
              Password {editing ? '(leave blank to keep)' : '*'}
            </label>
            <input
              type="password"
              value={form.portal_password}
              onChange={f('portal_password')}
              className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
              placeholder={editing ? '••••••••' : 'Set password'}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#374151] mb-1">Vehicle Type</label>
          <input
            value={form.vehicle_type}
            onChange={f('vehicle_type')}
            className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
            placeholder="Motorcycle, Bicycle…"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#374151] mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={f('notes')}
            rows={2}
            className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED] resize-none"
            placeholder="Optional notes…"
          />
        </div>

        {editing && (
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
            <span className="text-sm font-medium text-[#374151]">Active (accepts orders)</span>
            <button
              type="button"
              onClick={() => setForm(prev => ({ ...prev, is_active: !prev.is_active }))}
              className={`w-12 h-6 rounded-full transition-colors relative ${form.is_active ? 'bg-[#7C3AED]' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave} loading={saving}>
            {editing ? 'Save Changes' : 'Add Rider'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
