'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShieldCheck, MapPin, Lock } from 'lucide-react';
import { ProductImage } from '@/components/shared/ProductImage';
import Image from 'next/image';
import { useCartStore } from '@/store/cartStore';
import { getCustomer, type Customer, type AddressData } from '@/lib/customer';
import { formatCurrency, formatTime12hr } from '@/lib/utils/format';
import { SUPPORT_WHATSAPP_URL } from '@/lib/constants';
import { isWithinDeliveryZone } from '@/lib/delivery-zone';
import { isRestaurantOpen } from '@/lib/utils/restaurant';
import { AddressManager } from '@/components/customer/AddressManager';
import ConfirmingPaymentOverlay from '@/components/ConfirmingPaymentOverlay';
import toast from 'react-hot-toast';

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

function isBeforeParcelCutoff(cutoffStr: string | null): boolean {
  if (!cutoffStr) return true;
  const [cutH, cutM] = cutoffStr.slice(0, 5).split(':').map(Number);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const h = parseInt(parts.find(p => p.type === 'hour')!.value);
  const m = parseInt(parts.find(p => p.type === 'minute')!.value);
  return h < cutH || (h === cutH && m < cutM);
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
  const [merchantName, setMerchantName] = useState<string | null>(null);
  const [merchantLogoUrl, setMerchantLogoUrl] = useState<string | null>(null);
  const [showAddressManager, setShowAddressManager] = useState(false);
  const [landmarkDraft, setLandmarkDraft] = useState('');
  const [appliedOffer, setAppliedOffer] = useState<{ id: string; title: string; discount_type: string; discount_value: number; max_discount: number | null; ends_at?: string | null } | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState<number | null>(null);
  const [deliveryChargeAmount, setDeliveryChargeAmount] = useState<number>(20);
  const paymentSucceeded = useRef(false);
  const parcelSucceeded = useRef(false);

  // Parcel order state
  const [merchantParcelEnabled, setMerchantParcelEnabled] = useState(false);
  const [merchantParcelCharge, setMerchantParcelCharge] = useState(150);
  const [merchantParcelCutoff, setMerchantParcelCutoff] = useState<string | null>(null);
  const [parcelArea, setParcelArea] = useState('');
  const [parcelSubmitting, setParcelSubmitting] = useState(false);
  const [parcelConfirmed, setParcelConfirmed] = useState<{ id: string; subtotal: number; delivery_charge: number } | null>(null);
  const [parcelError, setParcelError] = useState<string | null>(null);

  function handleAddressChange(addr: AddressData) {
    // AddressManager.persist() already updated localStorage; just refresh state
    const updated = getCustomer();
    if (updated) setCustomer(updated);
    setLandmarkDraft(''); // reset draft when switching addresses
    if (typeof addr.lat === 'number' && typeof addr.lng === 'number') {
      setZoneOk(isWithinDeliveryZone(addr.lat, addr.lng));
    } else {
      setZoneOk(null);
    }
  }

  async function saveLandmarkBackfill(value: string) {
    if (!value || !customer?.addresses || !customer.phone) return;
    const idx = customer.active_address_index ?? 0;
    const updatedAddresses = customer.addresses.map((addr, i) =>
      i === idx ? { ...addr, landmark: value } : addr
    );
    const patched = { ...customer, addresses: updatedAddresses, landmark: value };
    localStorage.setItem('vm_customer', JSON.stringify(patched));
    setCustomer(patched);
    fetch('/api/customer/addresses', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: customer.phone, addresses: updatedAddresses, active_address_index: idx }),
    }).catch(() => {});
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
    if (items.length === 0 && !paymentSucceeded.current && !parcelSucceeded.current) { window.location.href = '/'; return; }
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
        .then((data: { opening_time?: string; closing_time?: string; is_open?: boolean | null; admin_override?: boolean | null; store_name?: string; logo_url?: string | null; parcel_service_enabled?: boolean; parcel_delivery_charge?: number; parcel_order_cutoff_time?: string | null }) => {
          setRestaurantClosed(!isRestaurantOpen(
            data.opening_time ?? null,
            data.closing_time ?? null,
            data.is_open,
            data.admin_override,
          ));
          setMerchantName(data.store_name ?? null);
          setMerchantLogoUrl(data.logo_url ?? null);
          setMerchantParcelEnabled(data.parcel_service_enabled ?? false);
          setMerchantParcelCharge(data.parcel_delivery_charge ?? 150);
          setMerchantParcelCutoff(data.parcel_order_cutoff_time ?? null);
        })
        .catch((err) => console.error('Failed to fetch merchant info:', err));
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

  const activeAddrIdx = customer?.active_address_index ?? 0;
  const activeAddr = customer?.addresses?.[activeAddrIdx];
  const needsLandmark = !!customer && !activeAddr?.landmark?.trim();

  const subtotal = getSubtotal();
  const deliveryCharge: number | null = freeDeliveryThreshold !== null
    ? (subtotal >= freeDeliveryThreshold ? 0 : deliveryChargeAmount)
    : null;
  const total: number | null = deliveryCharge !== null ? subtotal + deliveryCharge - discountAmount : null;

  const isParcelEligible = zoneOk === false && merchantParcelEnabled && isBeforeParcelCutoff(merchantParcelCutoff);
  const isPastCutoff = zoneOk === false && merchantParcelEnabled && !isBeforeParcelCutoff(merchantParcelCutoff);
  const parcelEstimatedTotal = subtotal + merchantParcelCharge;

  async function handleParcelOrder() {
    if (!customer || !parcelArea.trim()) return;
    setParcelSubmitting(true);
    setParcelError(null);
    const deliveryAddress = [customer.address, customer.landmark, customer.area].filter(Boolean).join(', ');
    const merchantId = items[0]?.product.merchant_id;
    try {
      const res = await fetch('/api/parcel/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId,
          customer_name: customer.name,
          customer_phone: customer.phone,
          destination_area: parcelArea.trim(),
          delivery_address: deliveryAddress,
          items: items.map(({ product, quantity }) => ({ id: product.id, quantity })),
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        parcelSucceeded.current = true;
        clearCart();
        setParcelConfirmed(json.order);
      } else {
        setParcelError(json.error ?? 'Failed to place order. Please try again.');
      }
    } catch {
      setParcelError('Network error. Please try again.');
    } finally {
      setParcelSubmitting(false);
    }
  }

  async function handlePayment() {
    if (!customer || total === null) return;
    setLoading(true);

    // If landmark was just typed but blur-save hasn't fired yet, save it now
    const effectiveLandmark = needsLandmark && landmarkDraft.trim()
      ? landmarkDraft.trim()
      : (customer.landmark ?? '');
    if (needsLandmark && landmarkDraft.trim()) {
      saveLandmarkBackfill(landmarkDraft.trim());
    }

    try {
      // 1. Create Razorpay order — server computes the authoritative amount
      const res = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(({ product, quantity }) => ({ id: product.id, quantity })),
          offerId: appliedOffer?.id ?? null,
          merchantId: items[0]?.product.merchant_id ?? null,
          customer: {
            id: customer.id ?? null,
            name: customer.name,
            phone: customer.phone,
            address: customer.address ?? '',
            landmark: effectiveLandmark,
            area: customer.area ?? '',
          },
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error ?? 'Failed to create payment order');
      }
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
      if (err instanceof Error) toast.error(err.message);
      setLoading(false);
    }
  }

  if (!hydrated || !mounted || !customer || (items.length === 0 && !parcelConfirmed)) return null;

  if (parcelConfirmed) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <h1 className="text-lg font-bold text-[#1A1A1A]">Order Placed!</h1>
        </div>
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center space-y-4">
          <div className="text-6xl">✅</div>
          <h2 className="text-xl font-bold text-[#1A1A1A]">Parcel order received!</h2>
          <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
            We&apos;ll contact you on WhatsApp/call to confirm payment and delivery timing.
          </p>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 w-full text-left space-y-2">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Order Summary</p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Items subtotal</span>
              <span className="font-medium">{formatCurrency(parcelConfirmed.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Delivery</span>
              <span className="font-medium">{formatCurrency(parcelConfirmed.delivery_charge)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold border-t border-gray-100 pt-2">
              <span>Estimated Total</span>
              <span className="text-[#7C3AED]">{formatCurrency(parcelConfirmed.subtotal + parcelConfirmed.delivery_charge)}</span>
            </div>
          </div>
          <p className="text-xs text-gray-400">Order #{parcelConfirmed.id.slice(-6).toUpperCase()}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-[#7C3AED] text-white rounded-2xl py-4 font-semibold text-base"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${isParcelEligible ? 'pb-64' : 'pb-28'}`}>
      {(loading || parcelSubmitting) && <ConfirmingPaymentOverlay />}

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

        {/* Merchant */}
        {merchantName && (
          <div className="flex items-center gap-2 px-1">
            {merchantLogoUrl
              ? <Image src={merchantLogoUrl} alt={merchantName} width={20} height={20} className="rounded-full object-cover shrink-0" />
              : <span className="text-base">🏪</span>}
            <p className="text-sm text-[#6B7280]">
              Ordering from <span className="font-semibold text-[#1A1A1A]">{merchantName}</span>
            </p>
          </div>
        )}

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
                  <ProductImage images={product.images} categorySlug={product.category?.slug} alt={product.name} width={28} height={28} />
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

          {/* One-time landmark backfill for existing addresses that never had one */}
          {needsLandmark && (
            <div className="mt-3 pt-3 border-t border-amber-100">
              <p className="text-xs font-semibold text-amber-700 mb-1.5">
                📍 Add a landmark to help your rider find you
              </p>
              <input
                type="text"
                value={landmarkDraft}
                onChange={e => setLandmarkDraft(e.target.value)}
                onBlur={() => { if (landmarkDraft.trim()) saveLandmarkBackfill(landmarkDraft.trim()); }}
                placeholder="e.g. Near SBI Bank, behind the school..."
                className="w-full border border-amber-200 bg-amber-50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
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
            {isParcelEligible
              ? <span>{formatCurrency(merchantParcelCharge)}</span>
              : deliveryCharge === null
              ? <span className="text-gray-400">…</span>
              : deliveryCharge === 0
              ? <span className="text-green-600 font-medium">FREE</span>
              : <span>{formatCurrency(deliveryCharge)}</span>
            }
          </div>
          {!isParcelEligible && discountAmount > 0 && appliedOffer && (
            <div className="flex justify-between text-sm">
              <span className="text-green-600 truncate mr-2">Discount ({appliedOffer.title})</span>
              <span className="text-green-600 font-medium shrink-0">− {formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t border-gray-100 pt-2">
            <span>Total</span>
            <span className="text-[#7C3AED]">
              {isParcelEligible ? formatCurrency(parcelEstimatedTotal) : (total !== null ? formatCurrency(total) : '…')}
            </span>
          </div>
          {isParcelEligible && (
            <p className="text-xs text-amber-600 mt-1">📦 Parcel batch delivery — payment confirmed via WhatsApp/call</p>
          )}
        </div>

        {/* Restaurant closed banner — hidden for parcel orders (parcel is scheduled, not immediate) */}
        {restaurantClosed && !isParcelEligible && (
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

      {/* Fixed pay / parcel button */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-100">
        {isParcelEligible ? (
          <div className="p-4 space-y-3">
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
              <p className="text-xs font-semibold text-amber-800">📦 You&apos;re outside our regular zone — but we&apos;ve still got you covered</p>
              <p className="text-xs text-amber-700 mt-0.5">Scheduled parcel delivery is available here.</p>
              {merchantParcelCutoff && (
                <p className="text-xs text-amber-600 mt-0.5">
                  🕔 Order before {formatTime12hr(merchantParcelCutoff)} for today&apos;s delivery
                </p>
              )}
              <p className="text-xs text-amber-600 mt-1">
                💬 Questions?{' '}
                <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="underline font-medium">
                  Chat with us on WhatsApp
                </a>
              </p>
            </div>
            <input
              type="text"
              placeholder="Your area / town (e.g. Nanded)"
              value={parcelArea}
              onChange={e => setParcelArea(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400"
            />
            {parcelError && <p className="text-xs text-red-600">{parcelError}</p>}
            <button
              onClick={handleParcelOrder}
              disabled={parcelSubmitting || !parcelArea.trim()}
              className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-60 text-white rounded-2xl py-4 font-semibold text-base transition-colors"
            >
              {parcelSubmitting ? 'Placing order…' : `Place Parcel Order — est. ${formatCurrency(parcelEstimatedTotal)}`}
            </button>
          </div>
        ) : (
          <>
            {zoneOk === false && (
              isPastCutoff ? (
                <div className="px-4 pt-3 pb-3 bg-orange-50 border-b border-orange-100">
                  <p className="text-xs font-semibold text-orange-800">
                    ⏰ Today&apos;s parcel orders are closed
                    {merchantParcelCutoff ? ` (cutoff was ${formatTime12hr(merchantParcelCutoff)})` : ''}
                  </p>
                  <p className="text-xs text-orange-700 mt-0.5">Check back tomorrow, or message us on WhatsApp for urgent requests.</p>
                  <p className="text-xs text-orange-700 mt-1">
                    💬{' '}
                    <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="underline font-medium">
                      Chat with us on WhatsApp
                    </a>
                  </p>
                </div>
              ) : (
                <div className="px-4 pt-3 flex items-start gap-2 bg-red-50 border-b border-red-100">
                  <span className="text-sm">⚠️</span>
                  <div className="pb-2">
                    <p className="text-xs font-semibold text-red-600">Delivery not available at your location</p>
                    <button onClick={() => setShowAddressManager(true)} className="text-xs text-purple-600 font-semibold">
                      Change location →
                    </button>
                  </div>
                </div>
              )
            )}
            <div className="p-4">
              <button
                onClick={zoneOk === true ? handlePayment : () => setShowAddressManager(true)}
                disabled={loading || restaurantClosed || total === null || (needsLandmark && !landmarkDraft.trim())}
                className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-60 text-white rounded-2xl py-4 font-semibold text-base transition-colors flex items-center justify-center gap-2"
              >
                {zoneOk !== true ? (
                  <><MapPin className="w-4 h-4 shrink-0" /> Confirm your location to continue</>
                ) : loading ? (
                  'Processing…'
                ) : total !== null ? (
                  <><Lock className="w-4 h-4 shrink-0" /> {`Pay ${formatCurrency(total)} via UPI / Card`}</>
                ) : (
                  'Loading…'
                )}
              </button>
              <div className="flex items-center justify-center gap-1 mt-2">
                <ShieldCheck className="w-3.5 h-3.5 text-green-500 shrink-0" />
                <span className="text-xs text-[#9CA3AF]">Secured by Razorpay</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
