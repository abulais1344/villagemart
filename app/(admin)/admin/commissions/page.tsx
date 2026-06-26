'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Commission } from '@/types';
import toast from 'react-hot-toast';

export default function AdminCommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{ type: 'global' | 'category' | 'merchant'; rate: string }>({ type: 'global', rate: '10' });
  const supabase = createClient();

  const load = async () => {
    const { data } = await supabase.from('commissions').select('*').order('created_at', { ascending: false });
    setCommissions(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    await supabase.from('commissions').insert({ type: form.type, rate: parseFloat(form.rate), is_active: true });
    toast.success('Platform fee rule added');
    setSaving(false);
    setShowForm(false);
    load();
  };

  const toggleActive = async (c: Commission) => {
    await supabase.from('commissions').update({ is_active: !c.is_active }).eq('id', c.id);
    load();
  };

  const deleteCommission = async (id: string) => {
    await supabase.from('commissions').delete().eq('id', id);
    setCommissions(prev => prev.filter(c => c.id !== id));
    toast.success('Deleted');
  };

  return (
    <>
      <AdminHeader title="Commissions" />
      <main className="px-4 py-4 space-y-4">
        <div className="flex justify-between">
          <p className="text-sm text-[#6B7280]">Zupr Platform Fees</p>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Add Rule
          </Button>
        </div>

        <div className="bg-primary-50 rounded-2xl p-4">
          <p className="text-sm text-primary-700 font-medium">Commission is deducted from marketplace order totals before payout to merchants.</p>
        </div>

        {loading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : (
          <div className="space-y-2">
            {commissions.map(c => (
              <div key={c.id} className={`bg-white rounded-2xl border p-4 flex items-center gap-3 ${c.is_active ? 'border-[#E5E7EB]' : 'border-dashed border-gray-300 opacity-60'}`}>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#1A1A1A]">{c.type.charAt(0).toUpperCase() + c.type.slice(1)} Commission</p>
                  <p className="text-xl font-bold text-primary-600">{c.rate}%</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleActive(c)}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${c.is_active ? 'bg-green-100 text-success' : 'bg-gray-100 text-[#6B7280]'}`}
                  >
                    {c.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <button onClick={() => deleteCommission(c.id)} className="text-error"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Commission Rule">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Type</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as 'global' | 'category' | 'merchant' }))}
              className="w-full rounded-xl border border-[#E5E7EB] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="global">Global (applies to all)</option>
              <option value="category">Category-specific</option>
              <option value="merchant">Merchant-specific</option>
            </select>
          </div>
          <Input label="Commission Rate (%)" type="number" step="0.01" min="0" max="100"
            value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} />
          <Button fullWidth loading={saving} onClick={handleSave}>Add Commission Rule</Button>
        </div>
      </Modal>
    </>
  );
}
