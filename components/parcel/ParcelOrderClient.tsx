'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ArrowLeft, Plus, Minus, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { formatTime12hr } from '@/lib/utils/format';

interface Product {
  id: string;
  name: string;
  selling_price: number;
  mrp: number;
  unit: string | null;
  images: string[] | null;
  description: string | null;
  is_bestseller: boolean | null;
}

interface Merchant {
  id: string;
  store_name: string;
  logo_url: string | null;
  cover_image_url: string | null;
  parcel_delivery_charge: number;
  parcel_order_cutoff_time: string;
  commission_rate: number | null;
}

interface Props {
  merchant: Merchant;
  products: Product[];
  cutoffDisplay: string;
}

const PARCEL_MIN_SUBTOTAL = 1000;

type Step = 'menu' | 'form' | 'confirmed';

interface ConfirmedOrder {
  id: string;
  subtotal: number;
  delivery_charge: number;
  commission_amount: number;
  customer_name: string;
  destination_area: string;
}

export function ParcelOrderClient({ merchant, products, cutoffDisplay }: Props) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [step, setStep] = useState<Step>('menu');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [area, setArea] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState<ConfirmedOrder | null>(null);

  // ── Cart helpers ─────────────────────────────────────────────────────────

  function inc(id: string) {
    setQty(prev => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  }

  function dec(id: string) {
    setQty(prev => {
      const next = { ...prev };
      if ((next[id] ?? 0) <= 1) delete next[id];
      else next[id]--;
      return next;
    });
  }

  const selectedItems = products.filter(p => (qty[p.id] ?? 0) > 0);
  const subtotal = selectedItems.reduce((s, p) => s + p.selling_price * (qty[p.id] ?? 0), 0);
  const cartCount = Object.values(qty).reduce((s, n) => s + n, 0);

  // ── Grouped categories ───────────────────────────────────────────────────

  const categories: string[] = [];
  const seenCats = new Set<string>();
  for (const p of products) {
    const cat = p.description?.trim() ?? 'Menu';
    if (!seenCats.has(cat)) { seenCats.add(cat); categories.push(cat); }
  }
  const grouped = new Map<string, Product[]>();
  for (const p of products) {
    const cat = p.description?.trim() ?? 'Menu';
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(p);
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !area.trim() || !address.trim()) {
      setError('All fields are required.');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(phone.replace(/\s/g, ''))) {
      setError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (selectedItems.length === 0) {
      setError('Please select at least one item.');
      return;
    }
    if (subtotal < PARCEL_MIN_SUBTOTAL) {
      setError(`Parcel orders require a minimum of ₹${PARCEL_MIN_SUBTOTAL}. Add ₹${PARCEL_MIN_SUBTOTAL - subtotal} more to proceed.`);
      return;
    }

    setError('');
    setSubmitting(true);

    const items = selectedItems.map(p => ({
      id: p.id,
      name: p.name,
      quantity: qty[p.id],
      unit_price: p.selling_price,
    }));

    try {
      const res = await fetch('/api/parcel/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId: merchant.id,
          customer_name: name.trim(),
          customer_phone: phone.replace(/\s/g, ''),
          destination_area: area.trim(),
          delivery_address: address.trim(),
          items,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? 'Failed to place order. Please try again.');
        return;
      }

      setConfirmed(data.order);
      setStep('confirmed');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Confirmed screen ─────────────────────────────────────────────────────

  if (step === 'confirmed' && confirmed) {
    const total = confirmed.subtotal + confirmed.delivery_charge;
    return (
      <div className="min-h-screen bg-white px-4 py-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h1>
            <p className="text-sm text-gray-500">
              Order #{confirmed.id.slice(-6).toUpperCase()} · {merchant.store_name}
            </p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-5 space-y-3 mb-6">
            <h2 className="text-sm font-bold text-gray-700 mb-2">Order Summary</h2>
            {selectedItems.map(p => (
              <div key={p.id} className="flex justify-between text-sm">
                <span className="text-gray-700">{p.name} × {qty[p.id]}</span>
                <span className="font-medium">₹{(p.selling_price * (qty[p.id] ?? 0)).toFixed(0)}</span>
              </div>
            ))}
            <div className="border-t border-gray-200 pt-3 space-y-1.5">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span><span>₹{confirmed.subtotal.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Delivery to {confirmed.destination_area}</span>
                <span>₹{confirmed.delivery_charge.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-gray-900 pt-1">
                <span>Total</span><span>₹{total.toFixed(0)}</span>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 mb-8">
            <p className="text-sm font-semibold text-purple-800 mb-1">📞 What happens next?</p>
            <p className="text-sm text-purple-700 leading-relaxed">
              We'll contact you on <strong>{confirmed.customer_name.split(' ')[0]}'s</strong> number to confirm
              payment (UPI / cash) and delivery timing. Orders are typically dispatched same evening.
            </p>
          </div>

          <Link
            href="/"
            className="block w-full text-center bg-[#7C3AED] text-white font-semibold py-4 rounded-2xl"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // ── Form screen ──────────────────────────────────────────────────────────

  if (step === 'form') {
    return (
      <div className="min-h-screen bg-white pb-8">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setStep('menu')} className="p-1">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-900">Delivery Details</h1>
            <p className="text-xs text-gray-500">{merchant.store_name} · Parcel Order</p>
          </div>
        </div>

        {/* Order recap */}
        <div className="bg-gray-50 mx-4 mt-4 rounded-2xl p-4 space-y-1.5">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Your Order</p>
          {selectedItems.map(p => (
            <div key={p.id} className="flex justify-between text-sm">
              <span className="text-gray-700">{p.name} × {qty[p.id]}</span>
              <span className="font-medium text-gray-900">₹{(p.selling_price * (qty[p.id] ?? 0)).toFixed(0)}</span>
            </div>
          ))}
          <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-semibold">
            <span>Items subtotal</span>
            <span>₹{subtotal.toFixed(0)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Delivery charge (to your city)</span>
            <span>₹{merchant.parcel_delivery_charge}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-[#7C3AED]">
            <span>Estimated total</span>
            <span>₹{(subtotal + merchant.parcel_delivery_charge).toFixed(0)}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-4 mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="Full name"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">WhatsApp / Phone *</label>
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-purple-400">
              <span className="px-3 py-3 bg-gray-50 text-sm text-gray-500 border-r border-gray-200">🇮🇳 +91</span>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                required
                placeholder="10-digit number"
                className="flex-1 px-3 py-3 text-sm focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Destination City / Area *</label>
            <input
              type="text"
              value={area}
              onChange={e => setArea(e.target.value)}
              required
              placeholder="e.g. Nanded, Latur, Hyderabad"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Delivery Address *</label>
            <textarea
              value={address}
              onChange={e => setAddress(e.target.value)}
              required
              rows={3}
              placeholder="House/flat, street, landmark, pin code…"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
          )}

          <p className="text-xs text-gray-400 leading-relaxed">
            No online payment now. We'll contact you after confirming the batch to collect payment via UPI or cash.
          </p>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-60 text-white font-bold py-4 rounded-2xl text-base transition-colors"
          >
            {submitting ? 'Placing order…' : `Place Order · ₹${(subtotal + merchant.parcel_delivery_charge).toFixed(0)}`}
          </button>
        </form>
      </div>
    );
  }

  // ── Menu screen ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white pb-32">
      {/* Hero */}
      <div className="relative h-44 bg-gradient-to-br from-purple-600 to-purple-800">
        {merchant.cover_image_url && (
          <Image src={merchant.cover_image_url} alt={merchant.store_name} fill className="object-cover" sizes="100vw" priority />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <Link href="/" className="absolute top-4 left-4 z-10 w-9 h-9 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-sm">
          <ArrowLeft className="w-5 h-5 text-white" />
        </Link>
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <h1 className="text-xl font-bold text-white leading-tight">{merchant.store_name}</h1>
          <p className="text-xs text-white/70 mt-0.5">📦 Parcel orders · Order before {formatTime12hr(cutoffDisplay)}</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-amber-50 border-b border-amber-100 px-4 py-3">
        <p className="text-sm font-semibold text-amber-800">📦 Parcel Delivery — Outside Local Zone</p>
        <p className="text-xs text-amber-600 mt-0.5">
          Select items below, then fill in your delivery details. Orders dispatched in batches.
          Order cutoff: {formatTime12hr(cutoffDisplay)} IST daily.
        </p>
      </div>

      {/* Menu */}
      {products.length === 0 ? (
        <div className="text-center py-16 px-8">
          <p className="text-4xl mb-3">🍽️</p>
          <p className="text-gray-500">Menu coming soon</p>
        </div>
      ) : (
        Array.from(grouped.entries()).map(([cat, catProducts]) => (
          <div key={cat}>
            <div className="bg-gray-50 border-l-4 border-purple-600 px-4 py-2.5 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900">{cat}</h2>
            </div>
            {catProducts.map(product => {
              const q = qty[product.id] ?? 0;
              const hasDiscount = product.mrp > product.selling_price;
              return (
                <div key={product.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{product.name}</p>
                    {product.unit && <p className="text-xs text-gray-400">{product.unit}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-semibold text-gray-900">₹{product.selling_price}</span>
                      {hasDiscount && (
                        <span className="text-xs text-gray-400 line-through">₹{product.mrp}</span>
                      )}
                    </div>
                  </div>

                  {/* Image */}
                  {product.images?.[0] && (
                    <div className="shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-gray-100">
                      <Image src={product.images[0]} alt={product.name} width={80} height={80} className="object-cover w-full h-full" />
                    </div>
                  )}

                  {/* Add / Stepper */}
                  <div className="shrink-0">
                    {q === 0 ? (
                      <button
                        onClick={() => inc(product.id)}
                        className="border border-purple-600 text-purple-600 text-sm font-bold px-5 py-1.5 rounded-lg hover:bg-purple-50"
                      >
                        ADD
                      </button>
                    ) : (
                      <div className="inline-flex items-center rounded-lg overflow-hidden">
                        <button onClick={() => dec(product.id)} className="bg-purple-600 text-white w-8 h-8 flex items-center justify-center">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="bg-purple-600 text-white text-sm font-bold w-8 h-8 flex items-center justify-center border-x border-purple-500">
                          {q}
                        </span>
                        <button onClick={() => inc(product.id)} className="bg-purple-600 text-white w-8 h-8 flex items-center justify-center">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}

      {/* Sticky bottom CTA */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-white border-t border-gray-100">
          {subtotal < PARCEL_MIN_SUBTOTAL ? (
            <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl py-3.5 px-5">
              <p className="text-sm font-semibold text-amber-800 text-center">
                Add ₹{PARCEL_MIN_SUBTOTAL - subtotal} more to proceed
              </p>
              <p className="text-xs text-amber-600 text-center mt-0.5">
                Parcel orders require a minimum of ₹{PARCEL_MIN_SUBTOTAL}
              </p>
            </div>
          ) : (
            <button
              onClick={() => setStep('form')}
              className="w-full bg-[#7C3AED] text-white font-bold py-4 rounded-2xl flex items-center justify-between px-5"
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                <span>{cartCount} item{cartCount !== 1 ? 's' : ''}</span>
              </div>
              <span>Continue →</span>
              <span>₹{subtotal.toFixed(0)}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
