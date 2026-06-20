'use client';

import { useEffect, useState } from 'react';
import { MapPin, Plus, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import type { Address } from '@/types';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';

interface AddressSelectorProps {
  selected: Address | null;
  onSelect: (address: Address) => void;
}

export function AddressSelector({ selected, onSelect }: AddressSelectorProps) {
  const [open, setOpen] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;
    supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .then(({ data }) => {
        setAddresses(data ?? []);
        if (data?.length && !selected) onSelect(data[0]);
      });
  }, [user]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-start gap-3 p-4 bg-white rounded-2xl border border-[#E5E7EB] text-left hover:border-primary-400 transition-colors"
      >
        <MapPin className="w-5 h-5 text-primary-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          {selected ? (
            <>
              <p className="text-xs font-medium text-primary-600 mb-0.5">{selected.label}</p>
              <p className="text-sm text-[#1A1A1A] line-clamp-2">{selected.full_address}</p>
              <p className="text-xs text-[#6B7280]">{selected.city} — {selected.pincode}</p>
            </>
          ) : (
            <p className="text-sm text-[#6B7280]">Select delivery address</p>
          )}
        </div>
        <span className="text-xs text-primary-600 font-semibold shrink-0">Change</span>
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Select Address">
        <div className="space-y-3">
          {addresses.map(addr => (
            <button
              key={addr.id}
              onClick={() => { onSelect(addr); setOpen(false); }}
              className={`w-full flex items-start gap-3 p-4 rounded-2xl border text-left transition-colors ${selected?.id === addr.id ? 'border-primary-600 bg-primary-50' : 'border-[#E5E7EB]'}`}
            >
              <MapPin className="w-4 h-4 text-primary-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#1A1A1A]">{addr.label}</p>
                <p className="text-sm text-[#6B7280]">{addr.full_address}</p>
                {addr.landmark && <p className="text-xs text-[#6B7280]">Near: {addr.landmark}</p>}
              </div>
              {selected?.id === addr.id && <Check className="w-4 h-4 text-primary-600 shrink-0" />}
            </button>
          ))}
          <Button
            variant="outline"
            fullWidth
            onClick={() => { setOpen(false); window.location.href = '/addresses'; }}
          >
            <Plus className="w-4 h-4" /> Add New Address
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}
