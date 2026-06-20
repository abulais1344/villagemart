'use client';

import { useEffect, useState } from 'react';
import { MapPin, Plus, Trash2, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { Header } from '@/components/customer/Header';
import { MapPicker } from '@/components/shared/MapPicker';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Address } from '@/types';
import toast from 'react-hot-toast';

const LABELS = ['Home', 'Work', 'Other'];

export default function AddressesPage() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<'map' | 'details'>('map');
  const [coords, setCoords] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [form, setForm] = useState({ label: 'Home', full_address: '', landmark: '', city: 'Ardhapur', pincode: '' });
  const supabase = createClient();

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from('addresses').select('*').eq('user_id', user.id).order('is_default', { ascending: false });
    setAddresses(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const setDefault = async (id: string) => {
    if (!user) return;
    await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id);
    await supabase.from('addresses').update({ is_default: true }).eq('id', id);
    load();
  };

  const deleteAddress = async (id: string) => {
    await supabase.from('addresses').delete().eq('id', id);
    setAddresses(prev => prev.filter(a => a.id !== id));
    toast.success('Address removed');
  };

  const handleMapConfirm = (loc: { lat: number; lng: number; address?: string }) => {
    setCoords(loc);
    if (loc.address) setForm(f => ({ ...f, full_address: loc.address ?? '' }));
    setStep('details');
  };

  const handleSave = async () => {
    if (!user || !coords || !form.full_address || !form.city) {
      toast.error('Please fill all required fields');
      return;
    }
    setSaving(true);
    const isFirst = addresses.length === 0;
    await supabase.from('addresses').insert({
      user_id: user.id,
      label: form.label,
      full_address: form.full_address,
      landmark: form.landmark || null,
      city: form.city,
      pincode: form.pincode,
      latitude: coords.lat,
      longitude: coords.lng,
      is_default: isFirst,
    });
    toast.success('Address saved!');
    setSaving(false);
    setShowAdd(false);
    setStep('map');
    setCoords(null);
    setForm({ label: 'Home', full_address: '', landmark: '', city: 'Ardhapur', pincode: '' });
    load();
  };

  return (
    <>
      <Header />
      <main className="px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-[#1A1A1A]">My Addresses</h1>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        ) : addresses.length === 0 ? (
          <div className="text-center py-16">
            <MapPin className="w-16 h-16 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-[#6B7280]">No addresses saved yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map(addr => (
              <div key={addr.id} className={`bg-white rounded-2xl border p-4 ${addr.is_default ? 'border-primary-400 bg-primary-50/30' : 'border-[#E5E7EB]'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-4 h-4 text-primary-600" />
                      <span className="text-sm font-semibold text-[#1A1A1A]">{addr.label}</span>
                      {addr.is_default && (
                        <span className="flex items-center gap-1 text-xs text-primary-600 font-medium">
                          <Star className="w-3 h-3 fill-current" /> Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#6B7280]">{addr.full_address}</p>
                    {addr.landmark && <p className="text-xs text-[#6B7280]">Near: {addr.landmark}</p>}
                    <p className="text-xs text-[#6B7280]">{addr.city} — {addr.pincode}</p>
                  </div>
                  <div className="flex gap-2 ml-3">
                    {!addr.is_default && (
                      <button onClick={() => setDefault(addr.id)} className="text-xs text-primary-600 font-medium">Set default</button>
                    )}
                    <button onClick={() => deleteAddress(addr.id)} className="text-error">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomSheet open={showAdd} onClose={() => { setShowAdd(false); setStep('map'); }} title={step === 'map' ? 'Pin Your Location' : 'Address Details'}>
        {step === 'map' ? (
          <MapPicker onConfirm={handleMapConfirm} />
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Label</label>
              <div className="flex gap-2">
                {LABELS.map(l => (
                  <button key={l} onClick={() => setForm(f => ({ ...f, label: l }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${form.label === l ? 'bg-primary-600 text-white border-primary-600' : 'border-[#E5E7EB] text-[#6B7280]'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <Input label="Full Address *" value={form.full_address} onChange={e => setForm(f => ({ ...f, full_address: e.target.value }))} placeholder="House/flat, street, area..." />
            <Input label="Landmark" value={form.landmark} onChange={e => setForm(f => ({ ...f, landmark: e.target.value }))} placeholder="Near school, temple..." />
            <div className="grid grid-cols-2 gap-3">
              <Input label="City *" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
              <Input label="Pincode" value={form.pincode} onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))} inputMode="numeric" maxLength={6} />
            </div>
            <Button fullWidth size="lg" onClick={handleSave} loading={saving}>Save Address</Button>
          </div>
        )}
      </BottomSheet>
    </>
  );
}
