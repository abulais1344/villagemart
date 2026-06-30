'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { X, Plus, Check, Trash2 } from 'lucide-react';
import type { AddressData, Customer } from '@/lib/customer';

const LocationPickerModal = dynamic(() => import('./LocationPickerModal'), { ssr: false });

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAddressChange: (addr: AddressData) => void;
}

const LABEL_EMOJI: Record<AddressData['label'], string> = {
  Home: '🏠',
  Work: '💼',
  Other: '📍',
};

function readCustomer(): Customer | null {
  try {
    const raw = localStorage.getItem('vm_customer');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function syncToSupabase(
  phone: string,
  addresses: AddressData[],
  activeIndex: number,
) {
  try {
    await fetch('/api/customer/addresses', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, addresses, active_address_index: activeIndex }),
    });
  } catch {
    // best-effort — don't block UI
  }
}

function persist(newAddresses: AddressData[], newActive: number) {
  const raw = localStorage.getItem('vm_customer');
  if (!raw) return;
  const c: Customer = JSON.parse(raw);
  const addr = newAddresses[newActive];
  const updated = {
    ...c,
    addresses: newAddresses,
    active_address_index: newActive,
    ...(addr
      ? { address: addr.address, area: addr.area, lat: addr.lat, lng: addr.lng }
      : {}),
  };
  localStorage.setItem('vm_customer', JSON.stringify(updated));
  if (c.phone) syncToSupabase(c.phone, newAddresses, newActive);
}

export function AddressManager({ isOpen, onClose, onAddressChange }: Props) {
  const [addresses, setAddresses] = useState<AddressData[]>(() => {
    const c = readCustomer();
    return c?.addresses ?? [];
  });
  const [activeIndex, setActiveIndex] = useState<number>(() => {
    const c = readCustomer();
    return c?.active_address_index ?? 0;
  });
  const [showPicker, setShowPicker] = useState(false);

  // Re-sync on every open; fall back to Supabase when localStorage has no addresses
  useEffect(() => {
    if (!isOpen) return;

    const c = readCustomer();
    const local: AddressData[] = c?.addresses ?? [];

    if (local.length > 0) {
      setAddresses(local);
      setActiveIndex(c?.active_address_index ?? 0);
      return;
    }

    if (!c?.phone) return;
    fetch(`/api/customer/addresses?phone=${encodeURIComponent(c.phone)}`)
      .then(r => r.json())
      .then((data: { addresses?: AddressData[]; active_address_index?: number }) => {
        if (!data?.addresses?.length) return;
        const remoteAddresses: AddressData[] = data.addresses;
        const remoteActive: number = data.active_address_index ?? 0;
        setAddresses(remoteAddresses);
        setActiveIndex(remoteActive);
        persist(remoteAddresses, remoteActive);
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  function selectAddress(i: number) {
    setActiveIndex(i);
    persist(addresses, i);
    onAddressChange(addresses[i]);
    onClose();
  }

  function deleteAddress(e: React.MouseEvent, i: number) {
    e.stopPropagation();
    const updated = addresses.filter((_, idx) => idx !== i);
    let newActive = activeIndex;
    if (i < activeIndex) newActive--;
    else if (i === activeIndex) newActive = 0;
    newActive = Math.max(0, Math.min(newActive, updated.length - 1));
    const finalActive = updated.length > 0 ? newActive : 0;
    setAddresses(updated);
    setActiveIndex(finalActive);
    persist(updated, finalActive);
    if (updated.length > 0) onAddressChange(updated[finalActive]);
  }

  function addAddress(data: AddressData) {
    const updated = [...addresses, data];
    const newActive = updated.length - 1;
    setAddresses(updated);
    setActiveIndex(newActive);
    persist(updated, newActive);
    setShowPicker(false);
    onAddressChange(data);
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      {/* Bottom sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl flex flex-col"
        style={{ zIndex: 50, maxHeight: '80vh' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-bold text-gray-900">Delivery Address</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Address list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
          {addresses.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              No saved addresses yet
            </p>
          )}

          {addresses.map((addr, i) => (
            <div
              key={i}
              onClick={() => selectAddress(i)}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                i === activeIndex
                  ? 'border-purple-300 bg-purple-50'
                  : 'border-gray-100 bg-white hover:border-purple-200'
              }`}
            >
              <span className="text-xl mt-0.5 shrink-0">{LABEL_EMOJI[addr.label]}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">{addr.label}</p>
                  {i === activeIndex && (
                    <span className="w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-snug">
                  {addr.address}
                </p>
              </div>
              <button
                onClick={e => deleteAddress(e, i)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 shrink-0 self-start"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {addresses.length < 3 && (
            <button
              onClick={() => setShowPicker(true)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-purple-300 text-purple-600 hover:bg-purple-50 transition-colors"
            >
              <Plus className="w-5 h-5 shrink-0" />
              <span className="text-sm font-medium">Add new address</span>
            </button>
          )}
        </div>

        <div className="h-4 shrink-0" />
      </div>

      {/* Location picker renders above the sheet (z-index: 60) */}
      <LocationPickerModal
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onSave={addAddress}
        defaultLat={addresses[activeIndex]?.lat ?? undefined}
        defaultLng={addresses[activeIndex]?.lng ?? undefined}
      />
    </>
  );
}
