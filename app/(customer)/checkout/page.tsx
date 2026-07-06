'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShieldCheck, MapPin, Lock } from 'lucide-react';
import Image from 'next/image';
import { useCartStore } from '@/store/cartStore';
import { getCustomer, type Customer, type AddressData } from '@/lib/customer';
import { formatCurrency } from '@/lib/utils/format';
import { isWithinDeliveryZone } from '@/lib/delivery-zone';
import { AddressManager } from '@/components/customer/AddressManager';

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<void> {
  return new Promise(resolve => {
    if ((window as Window & typeof globalThis).Razorpay) return resolve();
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    document.body.appendChild(script);
  });
}

function isRestaurantOpen(openingTime: string | null, closingTime: string | null): boolean {
  if (!openingTime || !closingTime) return true;
  const now = new Date();
  const [openH, openM] = openingTime.split(':').map(Number);
  const [closeH, closeM] = closingTime.split(':').map(Number);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const openMins = openH * 60 + openM;
  const closeMins = closeH * 60 + closeM;
  if (closeMins > openMins) return nowMins >= openMins && nowMins < closeMins;
  return nowMins >= openMins || nowMins < closeMins;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getSubtotal, clearCart } = useCartStore();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [zoneOk, setZoneOk] = useState<boolean | null>(null);
  const [restaurantClosed, setRestaurantClosed] = useState(false);
  const [showAddressManager, setShowAddressManager] = useState(false);
  const [appliedOffer, setAppliedOffer] = useState<{ id: string; title: string; discount_type: string; discount_value: number; max_discount: number | null; ends_at?: string | null } | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState<number | null>(null);
  const [deliveryChargeAmount, setDeliveryChargeAmount] = useState<number>(20);
  const paymentSucceeded = useRef(false);

  function handleAddressChange(addr: AddressData) {
    // AddressManager.persist() already updated localStorage; just refresh state
    const updated = getCustomer();
    if (updated) setCustomer(updated);
    if (typeof addr.lat === 'number' && typeof addr.lng === 'number') {
      setZoneOk(isWithinDeliveryZone(addr.lat, addr.lng));
    } else {
      setZoneOk(null);
    }
  }

  // Step 1: mark Zustand as hydrated from localStorage
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Step 2: run auth + cart checks only after hydration
  useEffect(() => {
    if (!hydrated) return;
    const c = getCustomer();
    if (!c) { window.location.href = '/auth/login'; return; }
    if (items.length === 0 && !paymentSucceeded.current) { window.location.href = '/'; return; }
    setCustomer(c);
    if (typeof c.lat === 'number' && typeof c.lng === 'number') {
      setZoneOk(isWithinDeliveryZone(c.lat, c.lng));
    }
    setMounted(true);

    // Apply best available offer
    const subtotal = items.reduce((s, { product, quantity }) => s + product.selling_price * quantity, 0);
    fetch('/api/customer/apply-offer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: c.phone, cart_subtotal: subtotal }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.offer && data.discount_amount > 0) {
          setAppliedOffer(data.offer);
          setDiscountAmount(data.discount_amount);
        }
      })
      .catch(() => {});

    const merchantId = items[0]?.product.merchant_id;
    if (merchantId) {
      fetch(`/api/customer/merchant-status?id=${merchantId}`)
        .then(r => r.json())
        .then((data: { opening_time?: string; closing_time?: string }) => {
          if (data.opening_time && data.closing_time) {
            setRestaurantClosed(!isRestaurantOpen(data.opening_time, data.closing_time));
          }
        })
        .catch(() => {});
    }
  }, [hydrated, items]);

  // Fetch delivery threshold from DB so we don't hardcode it
  useEffect(() => {
    fetch('/api/customer/delivery-info')
      .then(r => r.json())
      .then(d => {
        if (typeof d.free_delivery_threshold === 'number') setFreeDeliveryThreshold(d.free_delivery_threshold);
        if (typeof d.delivery_charge_amount === 'number') setDeliveryChargeAmount(d.delivery_charge_amount);
      })
      .catch(() => {});
  }, []);

  const subtotal = getSubtotal();
  const deliveryCharge: number | null = freeDeliveryThreshold !== null
    ? (subtotal >= freeDeliveryThreshold ? 0 : deliveryChargeAmount)
    : null;
  const total: number | null = deliveryCharge !== null ? subtotal + deliveryCharge - discountAmount : null;

  async function handlePayment() {
    if (!customer || total === null) return;
    setLoading(true);

    try {
      // 1. Create Razorpay order — server computes the authoritative amount
      const res = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(({ product, quantity }) => ({ id: product.id, quantity })),
          offerId: appliedOffer?.id ?? null,
        }),
      });
      const { orderId, amount, currency } = await res.json();
      if (!orderId) throw new Error('Failed to create payment order');

      // 2. Load Razorpay SDK
      await loadRazorpayScript();

      // 3. Open Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount,
        currency,
        name: 'Zupr',
        description: 'Order Payment',
        order_id: orderId,
        prefill: {
          name: customer.name,
          contact: `+91${customer.phone}`,
        },
        theme: { color: '#7C3AED' },
        modal: {
          ondismiss: () => setLoading(false),
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          // 4. Verify payment + save order
          const verifyRes = await fetch('/api/razorpay/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderData: {
                items: items.map(({ product, quantity }) => ({
                  id: product.id,
                  name: product.name,
                  selling_price: product.selling_price,
                  merchant_id: product.merchant_id,
                  quantity,
                })),
                customer,
                customerId: customer.id ?? null,
                subtotal,
                deliveryCharge,
                discountAmount,
                offerId: appliedOffer?.id ?? null,
                offerTitle: appliedOffer?.title ?? null,
                total,
                merchantId: items[0]?.product.merchant_id ?? null,
              },
            }),
          });

          const result = await verifyRes.json();
          if (result.success) {
            paymentSucceeded.current = true;
            clearCart();
            window.location.href = `/order-confirmation/${result.orderId}`;
          } else {
            alert('Payment verification failed. Please contact support.');
            setLoading(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }

  if (!hydrated || !mounted || !customer || items.length === 0) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-[#1A1A1A]" />
        </button>
        <h1 className="text-lg font-bold text-[#1A1A1A]">Checkout</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Delivery badge */}
        <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
          <span className="text-base">🛵</span>
          <p className="text-sm font-semibold text-green-700">Estimated delivery: 30–45 min</p>
        </div>

        {/* Order items */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#1A1A1A]">
              Order Summary ({items.length} {items.length === 1 ? 'item' : 'items'})
            </h2>
            {/* Item thumbnails */}
            <div className="flex items-center">
              {items.slice(0, 3).map(({ product }, i) => (
                <div
                  key={product.id}
                  className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white overflow-hidden shrink-0"
                  style={{ marginLeft: i === 0 ? 0 : -8 }}
                >
                  {product.images?.[0]
                    ? <Image src={product.images[0]} alt={product.name} width={28} height={28} className="object-cover w-full h-full" />
                    : <div className="w-full h-full flex items-center justify-center text-[10px]">🛒</div>
                  }
                </div>
              ))}
              {items.length > 3 && (
                <div className="w-7 h-7 rounded-full bg-purple-100 border-2 border-white flex items-center justify-center shrink-0" style={{ marginLeft: -8 }}>
                  <span className="text-[9px] font-bold text-purple-600">+{items.length - 3}</span>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            {items.map(({ product, quantity }) => (
              <div key={product.id} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-[#6B7280] flex-1 truncate pr-2">
                  {quantity}× {product.name}
                </span>
                <span className="text-sm font-medium text-[#1A1A1A] shrink-0">
                  {formatCurrency(product.selling_price * quantity)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery address */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#1A1A1A] flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#7C3AED]" /> Delivering to
            </h2>
            <button
              onClick={() => setShowAddressManager(true)}
              className="text-xs text-[#7C3AED] font-semibold"
            >
              Change
            </button>
          </div>
          <p className="font-medium text-[#1A1A1A]">{customer.name}</p>
          <p className="text-sm text-gray-500">📞 {customer.phone}</p>
          <p className="text-sm text-[#6B7280] mt-0.5">{customer.address}</p>
          {(customer.landmark || customer.area) && (
            <p className="text-sm text-[#9CA3AF] mt-0.5">
              {[customer.landmark, customer.area].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        {/* Offer banner */}
        {appliedOffer && discountAmount > 0 && (
          <div className="bg-green-50 border-2 border-green-200 rounded-2xl px-4 py-3.5 flex items-start gap-3">
            <span className="text-2xl mt-0.5">🎁</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-green-700">
                {appliedOffer.title}
              </p>
              <p className="text-base font-bold text-green-600 mt-0.5">
                You save {formatCurrency(discountAmount)} on this order!
              </p>
              {appliedOffer.ends_at && (
                <p className="text-xs text-green-500 mt-0.5">
                  Valid till {new Date(appliedOffer.ends_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>
            <span className="text-green-500 font-bold text-sm shrink-0 mt-0.5">✓</span>
          </div>
        )}

        {/* Bill details */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
          <h2 className="text-sm font-semibold text-[#1A1A1A] mb-3">Bill Details</h2>
          <div className="flex justify-between text-sm">
            <span className="text-[#6B7280]">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#6B7280]">Delivery</span>
            {deliveryCharge === null
              ? <span className="text-gray-400">…</span>
              : deliveryCharge === 0
              ? <span className="text-green-600 font-medium">FREE</span>
              : <span>{formatCurrency(deliveryCharge)}</span>
            }
          </div>
          {discountAmount > 0 && appliedOffer && (
            <div className="flex justify-between text-sm">
              <span className="text-green-600 truncate mr-2">Discount ({appliedOffer.title})</span>
              <span className="text-green-600 font-medium shrink-0">− {formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t border-gray-100 pt-2">
            <span>Total</span>
            <span className="text-[#7C3AED]">{total !== null ? formatCurrency(total) : '…'}</span>
          </div>
        </div>

        {/* Restaurant closed banner */}
        {restaurantClosed && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-sm font-semibold text-red-600">🔴 Restaurant is currently closed</p>
            <p className="text-xs text-red-500 mt-0.5">You cannot place an order right now. Please try again when the restaurant opens.</p>
          </div>
        )}

      </div>

      <AddressManager
        isOpen={showAddressManager}
        onClose={() => setShowAddressManager(false)}
        onAddressChange={handleAddressChange}
      />

      {/* Fixed pay button */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-100">
        {zoneOk === false && (
          <div className="px-4 pt-3 flex items-start gap-2 bg-red-50 border-b border-red-100">
            <span className="text-sm">⚠️</span>
            <div className="pb-2">
              <p className="text-xs font-semibold text-red-600">Delivery not available at your location</p>
              <button onClick={() => setShowAddressManager(true)} className="text-xs text-purple-600 font-semibold">
                Change location →
              </button>
            </div>
          </div>
        )}
        {zoneOk === null && (
          <div className="px-4 pt-3 flex items-start gap-2 bg-amber-50 border-b border-amber-200">
            <span className="text-sm">📍</span>
            <div className="pb-2">
              <p className="text-xs font-semibold text-amber-700">Location not pinned — we might miss you!</p>
              <button onClick={() => setShowAddressManager(true)} className="text-xs text-purple-600 font-semibold">
                Set exact location →
              </button>
            </div>
          </div>
        )}
        <div className="p-4">
          <button
            onClick={handlePayment}
            disabled={loading || zoneOk === false || restaurantClosed || total === null}
            className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-60 text-white rounded-2xl py-4 font-semibold text-base transition-colors flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4 shrink-0" />
            {loading ? 'Processing…' : total !== null ? `Pay ${formatCurrency(total)} via UPI / Card` : 'Loading…'}
          </button>
          <div className="flex items-center justify-center gap-1 mt-2">
            <ShieldCheck className="w-3.5 h-3.5 text-green-500 shrink-0" />
            <span className="text-xs text-[#9CA3AF]">Secured by Razorpay</span>
          </div>
        </div>
      </div>
    </div>
  );
}
