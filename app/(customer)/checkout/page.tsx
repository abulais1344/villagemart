'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShieldCheck, MapPin } from 'lucide-react';
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

  const subtotal = getSubtotal();
  const deliveryCharge = subtotal >= 199 ? 0 : 20;
  const total = subtotal + deliveryCharge;

  async function handlePayment() {
    if (!customer) return;
    setLoading(true);

    try {
      // 1. Create Razorpay order
      const res = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: total }),
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
                subtotal,
                deliveryCharge,
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
        {/* Order items */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-[#1A1A1A] mb-3">
            Order Summary ({items.length} {items.length === 1 ? 'item' : 'items'})
          </h2>
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

        {/* Bill details */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
          <h2 className="text-sm font-semibold text-[#1A1A1A] mb-3">Bill Details</h2>
          <div className="flex justify-between text-sm">
            <span className="text-[#6B7280]">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#6B7280]">Delivery</span>
            {deliveryCharge === 0
              ? <span className="text-green-600 font-medium">FREE</span>
              : <span>{formatCurrency(deliveryCharge)}</span>
            }
          </div>
          <div className="flex justify-between font-bold text-base border-t border-gray-100 pt-2">
            <span>Total</span>
            <span className="text-[#7C3AED]">{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Delivery zone status */}
        {zoneOk === false && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-sm font-semibold text-red-600">⚠️ Delivery not available</p>
            <p className="text-xs text-red-500 mt-0.5 leading-snug">
              We currently deliver only within 10 km of Ardhapur. Please update your delivery location.
            </p>
            <button
              onClick={() => setShowAddressManager(true)}
              className="text-xs text-purple-600 font-semibold mt-1.5 inline-block"
            >
              Change location →
            </button>
          </div>
        )}
        {zoneOk === null && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-sm font-semibold text-amber-700">📍 Location not pinned</p>
            <p className="text-xs text-amber-600 mt-0.5 leading-snug">
              Set your exact delivery location to ensure we can reach you.
            </p>
            <button
              onClick={() => setShowAddressManager(true)}
              className="text-xs text-purple-600 font-semibold mt-1.5 inline-block"
            >
              Set location →
            </button>
          </div>
        )}

        {/* Restaurant closed banner */}
        {restaurantClosed && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-sm font-semibold text-red-600">🔴 Restaurant is currently closed</p>
            <p className="text-xs text-red-500 mt-0.5">You cannot place an order right now. Please try again when the restaurant opens.</p>
          </div>
        )}

        {/* Security note */}
        <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
          <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
          100% secure payment via Razorpay
        </div>

        <div className="flex items-center gap-2 mt-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          <span className="text-lg">🛵</span>
          <div>
            <p className="text-sm font-semibold text-green-700">Estimated delivery: 30-45 min</p>
            <p className="text-xs text-green-600">Order will be delivered to your address</p>
          </div>
        </div>
      </div>

      <AddressManager
        isOpen={showAddressManager}
        onClose={() => setShowAddressManager(false)}
        onAddressChange={handleAddressChange}
      />

      {/* Fixed pay button */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-gray-100">
        <button
          onClick={handlePayment}
          disabled={loading || zoneOk === false || restaurantClosed}
          className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-60 text-white rounded-2xl py-4 font-semibold text-base transition-colors"
        >
          {loading ? 'Processing…' : `Pay ${formatCurrency(total)} via UPI / Card`}
        </button>
      </div>
    </div>
  );
}
