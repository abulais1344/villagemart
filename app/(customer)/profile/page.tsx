'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Phone, ClipboardList, ChevronRight, LogOut, Edit2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import type { AddressData } from '@/lib/customer';

const LABEL_EMOJI: Record<AddressData['label'], string> = {
  Home: '🏠',
  Work: '💼',
  Other: '📍',
};

interface Customer {
  name: string;
  phone: string;
  address: string;
  landmark: string;
  area: string;
  addresses?: AddressData[];
  active_address_index?: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Customer>({ name: '', phone: '', address: '', landmark: '', area: '' });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const stored = localStorage.getItem('vm_customer');
    if (!stored) {
      localStorage.setItem('login_redirect', '/profile');
      router.replace('/auth/login');
      return;
    }
    const c: Customer = JSON.parse(stored);
    setCustomer(c);
    setForm(c);
  }, [mounted]);

  if (!customer) return null;

  const openEdit = () => { setForm(customer); setEditing(true); };
  const cancelEdit = () => setEditing(false);

  const saveEdit = async () => {
    const updated: Customer = { ...form, phone: customer.phone };
    localStorage.setItem('vm_customer', JSON.stringify(updated));
    setCustomer(updated);
    setEditing(false);
    toast.success('Address updated!');

    const supabase = createClient();
    await supabase.from('vm_users').upsert(
      { phone: customer.phone, name: updated.name, address: updated.address, landmark: updated.landmark, area: updated.area },
      { onConflict: 'phone' }
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('vm_customer');
    localStorage.removeItem('villagemart-cart');
    router.push('/auth/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-[#1A1A1A]" />
        </button>
        <h1 className="text-base font-bold text-[#1A1A1A]">My Profile</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Profile card */}
        <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#7C3AED] flex items-center justify-center shrink-0">
            <span className="text-2xl font-bold text-white">
              {customer.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{customer.name}</p>
            <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
              <Phone className="w-3.5 h-3.5" />
              {customer.phone}
            </p>
          </div>
        </div>

        {/* Delivery address card */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-900">Saved Address</h2>
            {!editing && (
              <button
                onClick={openEdit}
                className="flex items-center gap-1 text-xs text-[#7C3AED] font-medium"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </button>
            )}
          </div>

          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Name</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Phone</label>
                <input
                  value={customer.phone}
                  disabled
                  className="w-full border border-gray-100 rounded-xl px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Address</label>
                <input
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Landmark (optional)</label>
                <input
                  value={form.landmark}
                  onChange={e => setForm(f => ({ ...f, landmark: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Area</label>
                <input
                  value={form.area}
                  onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={saveEdit}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#7C3AED] text-white rounded-xl py-2.5 text-sm font-semibold"
                >
                  <Check className="w-4 h-4" /> Save
                </button>
                <button
                  onClick={cancelEdit}
                  className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-semibold"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
              </div>
            </div>
          ) : customer.addresses && customer.addresses.length > 0 ? (
            <div className="space-y-2">
              {customer.addresses.map((addr, i) => {
                const isActive = i === (customer.active_address_index ?? 0);
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-2.5 rounded-xl px-3 py-2.5 ${
                      isActive ? 'bg-purple-50' : 'bg-gray-50'
                    }`}
                  >
                    <span className="text-base mt-0.5 shrink-0">{LABEL_EMOJI[addr.label]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-gray-800">{addr.label}</span>
                        {isActive && (
                          <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 leading-snug">{addr.address}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-0.5 text-sm text-gray-600">
              <p>{customer.address}</p>
              {customer.landmark && <p className="text-gray-400">Near: {customer.landmark}</p>}
              <p className="text-gray-400">{customer.area}</p>
            </div>
          )}
        </div>

        {/* My Orders shortcut */}
        <Link
          href="/orders"
          className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
            <ClipboardList className="w-5 h-5 text-[#7C3AED]" />
          </div>
          <span className="text-sm font-medium text-gray-900 flex-1">My Orders</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </Link>

        {/* Legal links */}
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
          {[
            { href: '/privacy', label: 'Privacy Policy' },
            { href: '/terms',   label: 'Terms & Conditions' },
            { href: '/refund',  label: 'Refund Policy' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center justify-between px-4 py-3.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              {label}
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
          ))}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-500 rounded-2xl py-3.5 text-sm font-semibold bg-white"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );
}
