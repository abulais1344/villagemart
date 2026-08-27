'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Loader2, ShoppingBag, ChevronRight,
  Clock, CheckCircle2, XCircle, Truck,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';
import { firebaseAuth } from '@/lib/firebase/client';
import { RiderLiveMap } from '@/components/customer/RiderLiveMap';

// ── rating widget ──────────────────────────────────────────────────────────
interface RatingEntry { rating: number; comment: string | null; }

function StarButton({ filled, onHover, onClick }: { filled: boolean; onHover: () => void; onClick: () => void }) {
  return (
    <button
      type="button"
      onMouseEnter={onHover}
      onTouchStart={onHover}
      onClick={onClick}
      className="text-2xl leading-none transition-transform active:scale-110"
      aria-label={filled ? 'Filled star' : 'Empty star'}
    >
      <span className={filled ? 'text-amber-400' : 'text-gray-200'}>★</span>
    </button>
  );
}

function OrderRatingWidget({
  orderId,
  onRated,
}: {
  orderId: string;
  onRated: (rating: number, comment: string | null) => void;
}) {
  const [hover, setHover] = useState(0);
  const [selected, setSelected] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (selected === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const idToken = await firebaseAuth.currentUser?.getIdToken();
      if (!idToken) { setError('Please log in again to rate.'); return; }
      const res = await fetch('/api/customer/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, rating: selected, comment: comment.trim() || null, idToken }),
      });
      if (res.status === 409) { onRated(selected, comment.trim() || null); return; } // already rated
      if (!res.ok) { setError('Could not save rating. Try again.'); return; }
      onRated(selected, comment.trim() || null);
    } catch {
      setError('Network error. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const active = hover || selected;

  return (
    <div>
      <p className="text-xs font-semibold text-[#6B7280] mb-2 uppercase tracking-wide">How was your order?</p>
      <div
        className="flex gap-1 mb-2"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map(n => (
          <StarButton
            key={n}
            filled={n <= active}
            onHover={() => setHover(n)}
            onClick={() => { setSelected(n); setHover(0); }}
          />
        ))}
      </div>
      {selected > 0 && (
        <>
          <input
            type="text"
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Add a comment (optional)"
            maxLength={200}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400 mb-2"
          />
          <button
            onClick={submit}
            disabled={submitting}
            className="text-sm font-semibold text-white bg-purple-600 rounded-lg px-4 py-1.5 disabled:opacity-60"
          >
            {submitting ? 'Sending…' : 'Submit'}
          </button>
        </>
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function RatingConfirmation({ entry }: { entry: RatingEntry }) {
  const stars = '★'.repeat(entry.rating) + '☆'.repeat(5 - entry.rating);
  return (
    <div>
      <p className="text-xs font-semibold text-[#6B7280] mb-1 uppercase tracking-wide">Your Rating</p>
      <p className="text-sm text-gray-700">Thanks for your feedback <span className="text-amber-400">{stars}</span></p>
    </div>
  );
}

// ── types ──────────────────────────────────────────────────────────────────
interface Snapshot {
  name?: string;
  image?: string;
  image_url?: string;
  unit?: string;
}

interface OrderItem {
  id: string;
  order_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_snapshot: Snapshot | null;
}

interface Order {
  id: string;
  created_at: string;
  subtotal: number;
  delivery_charge: number;
  discount_amount: number;
  total_amount: number;
  payment_status: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  merchant_name: string | null;
  rider_id: string | null;
  delivery_address: { name?: string; phone?: string; address?: string; landmark?: string; area?: string; lat?: number; lng?: number } | null;
  items: OrderItem[];
}

// ── status config ──────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; bg: string; text: string; Icon: typeof Clock }> = {
  pending:          { label: 'Pending',          bg: 'bg-orange-100',  text: 'text-orange-700', Icon: Clock        },
  confirmed:        { label: 'Confirmed',         bg: 'bg-blue-50',     text: 'text-blue-600',   Icon: CheckCircle2 },
  preparing:        { label: 'Preparing',         bg: 'bg-blue-100',    text: 'text-blue-700',   Icon: Clock        },
  ready:            { label: 'Ready',             bg: 'bg-purple-100',  text: 'text-purple-700', Icon: CheckCircle2 },
  out_for_delivery: { label: 'Out for Delivery',  bg: 'bg-indigo-100',  text: 'text-indigo-700', Icon: Truck        },
  delivered:        { label: 'Delivered',         bg: 'bg-green-100',   text: 'text-green-700',  Icon: CheckCircle2 },
  cancelled:        { label: 'Cancelled',         bg: 'bg-red-100',     text: 'text-red-600',    Icon: XCircle      },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG['pending'];
  const { label, bg, text, Icon } = cfg;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${bg} ${text}`}>
      <Icon size={12} />
      {label}
    </span>
  );
}

// ── order timeline ─────────────────────────────────────────────────────────
const TIMELINE_STEPS = [
  { key: 'pending',          label: 'Placed'      },
  { key: 'confirmed',        label: 'Confirmed'   },
  { key: 'preparing',        label: 'Preparing'   },
  { key: 'out_for_delivery', label: 'On the Way'  },
];

// Sentinel 4: all 4 steps show as fully done, no active dot (delivered state).
// Unknown/future statuses fall back to 0 (Placed active) — never goes blank.
const STATUS_TO_STEP: Record<string, number> = {
  pending:          0,
  confirmed:        1,
  preparing:        2,
  ready:            2,
  out_for_delivery: 3,
  delivered:        4,
};

function OrderTimeline({ status }: { status: string }) {
  // Cancelled: muted skeleton of the 4 steps + red label below.
  // We don't store which step the order reached before cancellation,
  // so we can't honestly light up partial progress.
  if (status === 'cancelled') {
    return (
      <div className="space-y-2">
        <div className="overflow-x-auto -mx-1 px-1 opacity-30">
          <div className="flex items-start min-w-max gap-0">
            {TIMELINE_STEPS.map((step, i) => {
              const isLast = i === TIMELINE_STEPS.length - 1;
              return (
                <div key={step.key} className="flex items-start">
                  <div className="flex flex-col items-center" style={{ minWidth: 60 }}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 border-gray-300 bg-white">
                      <div className="w-2 h-2 rounded-full bg-gray-300" />
                    </div>
                    <p className="text-[10px] mt-1 text-center leading-tight font-medium w-14 text-gray-400">
                      {step.label}
                    </p>
                  </div>
                  {!isLast && (
                    <div className="h-0.5 w-8 mt-3 mx-0.5 rounded-full bg-gray-100" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
          <span className="text-xs font-medium text-red-500">Order Cancelled</span>
        </div>
      </div>
    );
  }

  const currentIdx = STATUS_TO_STEP[status] ?? 0;

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div className="flex items-start min-w-max gap-0">
        {TIMELINE_STEPS.map((step, i) => {
          const done = currentIdx >= i;
          const active = currentIdx === i;
          const isLast = i === TIMELINE_STEPS.length - 1;

          return (
            <div key={step.key} className="flex items-start">
              <div className="flex flex-col items-center" style={{ minWidth: 60 }}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors
                  ${done
                    ? active
                      ? 'bg-purple-600 border-purple-600'
                      : 'bg-green-500 border-green-500'
                    : 'bg-white border-gray-200'
                  }`}
                >
                  {done && !active
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    : active
                    ? <div className="w-2 h-2 rounded-full bg-white" />
                    : <div className="w-2 h-2 rounded-full bg-gray-200" />
                  }
                </div>
                <p className={`text-[10px] mt-1 text-center leading-tight font-medium w-14
                  ${done ? active ? 'text-purple-600' : 'text-green-600' : 'text-gray-300'}`}
                >
                  {step.label}
                </p>
              </div>
              {!isLast && (
                <div className={`h-0.5 w-8 mt-3 mx-0.5 rounded-full ${currentIdx > i ? 'bg-green-400' : 'bg-gray-100'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── rider card ─────────────────────────────────────────────────────────────
const VEHICLE_EMOJI: Record<string, string> = {
  bike:    '🏍️',
  bicycle: '🚲',
  auto:    '🛺',
  car:     '🚗',
  van:     '🚐',
  truck:   '🚚',
};

interface RiderDetail { name: string; phone: string; vehicleType: string; }

function RiderCard({ name, phone, vehicleType, status, merchantName }: RiderDetail & { status: string; merchantName: string | null }) {
  const emoji = VEHICLE_EMOJI[vehicleType?.toLowerCase()] ?? '🛵';
  const vehicleLabel = vehicleType
    ? vehicleType.charAt(0).toUpperCase() + vehicleType.slice(1)
    : 'Vehicle';

  if (status === 'delivered') {
    return (
      <div className="bg-gray-50 rounded-xl px-3 py-2.5">
        <p className="text-xs text-[#6B7280]">Delivered by {name} · {emoji} {vehicleLabel}</p>
      </div>
    );
  }

  const message = status === 'out_for_delivery'
    ? `${name} has picked up your order and is on the way!`
    : `${name} will pick up your order from ${merchantName ?? 'the store'} soon`;

  return (
    <div className="bg-indigo-50 rounded-xl px-3 py-3">
      <p className="text-xs font-semibold text-[#6B7280] mb-2 uppercase tracking-wide">Your Rider</p>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#1A1A1A]">{name} · {emoji} {vehicleLabel}</p>
          <p className="text-xs text-indigo-700 mt-0.5 leading-snug">{message}</p>
        </div>
        <a
          href={`tel:${phone}`}
          className="shrink-0 flex items-center gap-1 text-xs font-semibold text-white bg-green-600 rounded-lg px-3 py-2"
        >
          📞 Call
        </a>
      </div>
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function snapImage(snap: Snapshot | null) {
  return snap?.image || snap?.image_url || null;
}

// ── main component ─────────────────────────────────────────────────────────
export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [riderLocation, setRiderLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [ratings, setRatings] = useState<Map<string, RatingEntry>>(new Map());
  const [riderDetails, setRiderDetails] = useState<Map<string, RiderDetail>>(new Map());
  const phoneRef = useRef<string | null>(null);
  const fetchedRiderDetailIds = useRef<Set<string>>(new Set());
  const hasInitializedExpanded = useRef(false);

  useEffect(() => {
    const raw = localStorage.getItem('vm_customer');
    if (!raw) { setLoading(false); return; }
    const customer = JSON.parse(raw);
    setPhone(customer.phone ?? null);
    phoneRef.current = customer.phone ?? null;
    if (customer.phone) {
      fetchOrders(customer.phone);
      fetchRatings(customer.phone);
    } else {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchRatings(customerPhone: string) {
    try {
      const res = await fetch(`/api/customer/ratings?phone=${customerPhone}`);
      const data = await res.json();
      const map = new Map<string, RatingEntry>();
      for (const r of data.ratings ?? []) {
        map.set(r.order_id, { rating: r.rating, comment: r.comment ?? null });
      }
      setRatings(map);
    } catch {}
  }

  // Re-fetch orders every 15 s while any order is actively out_for_delivery.
  // This is the order-status live-update mechanism: no Supabase Realtime needed
  // (which would require a Supabase Auth session the app doesn't have — it uses
  // Firebase Phone Auth). When the rider marks delivered, the next fetch resolves
  // with status='delivered', setOrders fires, and the location poll stops.
  const hasActiveDeliveryRef = useRef(false);
  hasActiveDeliveryRef.current = orders.some(o => !['delivered', 'cancelled'].includes(o.status));

  useEffect(() => {
    const interval = setInterval(() => {
      if (hasActiveDeliveryRef.current && phoneRef.current) {
        console.log('[order-status] re-fetching orders (active delivery in progress)');
        fetchOrders(phoneRef.current);
      }
    }, 15_000);
    return () => clearInterval(interval);
  }, []); // stable — reads state via refs, never needs to restart

  // Derive stable primitives for the location effect's dependency array.
  // Location polling tracks whichever expanded order is out_for_delivery (at
  // most one at a time in practice). This avoids restarting the location
  // interval on every fetchOrders call (which replaces the orders array reference).
  const locationOrderId = [...expandedIds].find(id => {
    const o = orders.find(ord => ord.id === id);
    return o?.status === 'out_for_delivery' && !!o?.rider_id;
  }) ?? null;
  const expandedOrder = orders.find(o => o.id === locationOrderId);
  const expandedStatus = expandedOrder?.status ?? null;
  const expandedRiderId = expandedOrder?.rider_id ?? null;

  // Poll rider location when an out_for_delivery order card is expanded.
  useEffect(() => {
    console.log('[rider-location] effect fired — locationOrderId:', locationOrderId, '| status:', expandedStatus, '| rider_id:', expandedRiderId);

    if (!locationOrderId || expandedStatus !== 'out_for_delivery' || !expandedRiderId) {
      console.log('[rider-location] guard failed — not an active delivery or no rider assigned');
      setRiderLocation(null);
      return;
    }

    console.log('[rider-location] guard passed — starting poll for order', locationOrderId);

    async function fetchLocation() {
      console.log('[rider-location] polling tick for order', locationOrderId);
      try {
        const idToken = await firebaseAuth.currentUser?.getIdToken();
        console.log('[rider-location] idToken present:', !!idToken, '| firebase uid:', firebaseAuth.currentUser?.uid ?? null);
        if (!idToken) return;
        const res = await fetch('/api/customer/rider-location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: locationOrderId, idToken }),
        });
        console.log('[rider-location] response status:', res.status);
        if (!res.ok) return;
        const data = await res.json();
        console.log('[rider-location] response data:', data);
        if (typeof data.lat === 'number' && typeof data.lng === 'number') {
          setRiderLocation({ lat: data.lat, lng: data.lng });
        }
      } catch (err) {
        console.error('[rider-location] fetch error:', err);
      }
    }

    fetchLocation();
    const interval = setInterval(fetchLocation, 10_000);
    return () => {
      console.log('[rider-location] cleaning up interval — locationOrderId:', locationOrderId, 'status now:', expandedStatus);
      clearInterval(interval);
    };
  }, [locationOrderId, expandedStatus, expandedRiderId]);

  // Fetch rider name/phone/vehicle for each expanded order that has a rider.
  // Runs whenever expandedIds changes (manual toggle or initial auto-expand).
  // The ref guards against re-fetching the same order twice.
  useEffect(() => {
    for (const orderId of expandedIds) {
      if (fetchedRiderDetailIds.current.has(orderId)) continue;
      const order = orders.find(o => o.id === orderId);
      if (!order?.rider_id) continue;
      fetchedRiderDetailIds.current.add(orderId);
      (async () => {
        const idToken = await firebaseAuth.currentUser?.getIdToken();
        if (!idToken) { fetchedRiderDetailIds.current.delete(orderId); return; }
        const res = await fetch('/api/customer/rider-detail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, idToken }),
        });
        if (!res.ok) { fetchedRiderDetailIds.current.delete(orderId); return; }
        const data = await res.json();
        setRiderDetails(prev => new Map(prev).set(orderId, {
          name: data.name,
          phone: data.phone,
          vehicleType: data.vehicleType,
        }));
      })();
    }
  }, [expandedIds]); // eslint-disable-line react-hooks/exhaustive-deps

  function goToLogin() {
    localStorage.setItem('login_redirect', '/orders');
    router.push('/auth/login');
  }

  async function fetchOrders(customerPhone: string) {
    const res = await fetch(`/api/customer/orders?phone=${customerPhone}`);
    const data = await res.json();
    const fetched: Order[] = data.orders ?? [];
    setOrders(fetched);
    // On first load, auto-expand any order that isn't in a terminal state.
    // The guard prevents the 15-second poll from resetting manual toggles.
    if (!hasInitializedExpanded.current) {
      hasInitializedExpanded.current = true;
      setExpandedIds(new Set(
        fetched
          .filter(o => !['delivered', 'cancelled'].includes(o.status))
          .map(o => o.id)
      ));
    }
    setLoading(false);
  }

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#7C3AED]" />
      </div>
    );
  }

  if (!phone) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="flex items-center gap-0 mb-8">
          <span className="text-purple-600 font-black text-2xl tracking-tight leading-none">Z</span>
          <span className="text-gray-900 font-bold text-2xl tracking-tight leading-none">upr</span>
        </div>
        <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mb-6">
          <ShoppingBag className="w-10 h-10 text-purple-400" />
        </div>
        <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Track your orders</h2>
        <p className="text-sm text-[#6B7280] mb-8 max-w-xs">
          Login to see your order history and track deliveries in real time.
        </p>
        <button
          onClick={goToLogin}
          className="w-full max-w-xs py-3.5 bg-[#7C3AED] text-white rounded-xl font-semibold text-sm mb-3"
        >
          Login / Sign up
        </button>
        <button
          onClick={() => router.push('/')}
          className="w-full max-w-xs py-3.5 border border-[#E5E7EB] text-[#6B7280] rounded-xl font-semibold text-sm"
        >
          Browse Menu →
        </button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <>
        <StickyHeader />
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center gap-4">
          <ShoppingBag className="w-16 h-16 text-gray-200" />
          <h2 className="text-lg font-bold text-[#1A1A1A]">No orders yet</h2>
          <p className="text-sm text-[#6B7280]">Your orders will appear here</p>
          <Link href="/" className="px-6 py-3 bg-[#7C3AED] text-white rounded-xl font-semibold text-sm">
            Start Shopping
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <StickyHeader />
      <div className="max-w-lg mx-auto space-y-3 px-4 py-4 pb-24">
        {orders.map(order => {
          const expanded = expandedIds.has(order.id);
          const addr = order.delivery_address;
          const discount = order.discount_amount ?? 0;
          const subtotal = order.subtotal ?? order.total_amount;
          const deliveryCharge = order.delivery_charge ?? 0;

          return (
            <div
              key={order.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              {/* Collapsed summary */}
              <button className="w-full text-left px-4 py-4" onClick={() => toggleExpand(order.id)}>
                {/* Merchant + order number */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-sm font-bold text-[#7C3AED] truncate flex-1">
                    {order.merchant_name ?? 'Zupr'}
                  </p>
                  <span className="text-[10px] text-gray-400 font-mono shrink-0">
                    #{order.id.slice(-6).toUpperCase()}
                  </span>
                </div>

                {/* Item thumbnails row */}
                <div className="flex items-center gap-1.5 mb-2">
                  {order.items.slice(0, 4).map((item, i) => {
                    const img = snapImage(item.product_snapshot);
                    return (
                      <div key={item.id ?? i} className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-100 overflow-hidden shrink-0">
                        {img
                          ? <img src={img} alt={item.product_snapshot?.name ?? ''} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-xs">🛒</div>
                        }
                      </div>
                    );
                  })}
                  {order.items.length > 4 && (
                    <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-purple-600">+{order.items.length - 4}</span>
                    </div>
                  )}
                  <span className="text-xs text-[#9CA3AF] ml-1">
                    {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <p className="text-xs text-[#9CA3AF] mb-2">{formatDate(order.created_at)}</p>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-[#1A1A1A]">{formatCurrency(order.total_amount)}</p>
                    {discount > 0 && (
                      <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        🎁 ₹{discount} saved!
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={order.status} />
                    <span className="text-xs text-gray-300">{expanded ? '▲' : '▼'}</span>
                  </div>
                </div>
              </button>

              {/* Expanded details */}
              {expanded && (
                <div className="border-t border-gray-100 px-4 py-4 space-y-4">
                  {/* Track order timeline */}
                  <div>
                    <p className="text-xs font-semibold text-[#6B7280] mb-2.5 uppercase tracking-wide">Track Order</p>
                    <OrderTimeline status={order.status} />
                  </div>

                  {/* Rider card — hidden on cancelled; neutral attribution on delivered */}
                  {order.rider_id && riderDetails.has(order.id) && order.status !== 'cancelled' && (
                    <RiderCard
                      {...riderDetails.get(order.id)!}
                      status={order.status}
                      merchantName={order.merchant_name}
                    />
                  )}

                  {/* Live rider map — only while out_for_delivery */}
                  {order.status === 'out_for_delivery' && (
                    <div>
                      <p className="text-xs font-semibold text-[#6B7280] mb-2.5 uppercase tracking-wide">🛵 Live Tracking</p>
                      <RiderLiveMap
                        riderLat={riderLocation?.lat ?? null}
                        riderLng={riderLocation?.lng ?? null}
                        deliveryLat={order.delivery_address?.lat ?? null}
                        deliveryLng={order.delivery_address?.lng ?? null}
                      />
                      {riderLocation && (
                        <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" />Rider</span>
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />Your address</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Items */}
                  <div>
                    <p className="text-xs font-semibold text-[#6B7280] mb-2 uppercase tracking-wide">Items Ordered</p>
                    <div className="space-y-2.5">
                      {order.items.map((item, i) => {
                        const snap = item.product_snapshot;
                        const img = snapImage(snap);
                        return (
                          <div key={item.id ?? i} className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-100 overflow-hidden shrink-0">
                              {img
                                ? <img src={img} alt={snap?.name ?? ''} className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center text-base">🛒</div>
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#1A1A1A] truncate">{snap?.name ?? 'Item'}</p>
                              {snap?.unit && <p className="text-xs text-[#9CA3AF]">{snap.unit}</p>}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs text-[#6B7280]">×{item.quantity}</p>
                              <p className="text-sm font-semibold text-[#1A1A1A]">{formatCurrency(item.total_price)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bill summary */}
                  <div className="bg-gray-50 rounded-xl px-3 py-3 space-y-1.5">
                    <p className="text-xs font-semibold text-[#6B7280] mb-2 uppercase tracking-wide">Bill Summary</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#6B7280]">Subtotal</span>
                      <span className="text-[#1A1A1A]">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#6B7280]">Delivery charge</span>
                      {deliveryCharge === 0
                        ? <span className="text-green-600 font-medium">FREE</span>
                        : <span className="text-[#1A1A1A]">{formatCurrency(deliveryCharge)}</span>
                      }
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600">🎁 Discount</span>
                        <span className="text-green-600 font-medium">−{formatCurrency(discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-1.5 mt-1.5">
                      <span className="text-[#1A1A1A]">Total Paid</span>
                      <span className="text-[#7C3AED]">{formatCurrency(order.total_amount)}</span>
                    </div>
                  </div>

                  {/* Delivery address */}
                  {addr && (
                    <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                      <p className="text-xs font-semibold text-[#6B7280] mb-1 uppercase tracking-wide">Delivered to</p>
                      <p className="text-sm font-medium text-[#1A1A1A]">
                        {addr.name}{addr.phone ? ` · ${addr.phone}` : ''}
                      </p>
                      {addr.address && (
                        <p className="text-xs text-[#6B7280] mt-0.5">
                          {[addr.address, addr.landmark, addr.area].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Rating widget — delivered orders only, never shown to merchant */}
                  {order.status === 'delivered' && (
                    <div className="bg-purple-50 rounded-xl px-3 py-3">
                      {ratings.has(order.id) ? (
                        <RatingConfirmation entry={ratings.get(order.id)!} />
                      ) : (
                        <OrderRatingWidget
                          orderId={order.id}
                          onRated={(rating, comment) =>
                            setRatings(prev => new Map(prev).set(order.id, { rating, comment }))
                          }
                        />
                      )}
                    </div>
                  )}

                  <p className="text-[10px] text-gray-300 font-mono">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function StickyHeader() {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-2">
      <Link href="/" className="p-1 rounded-lg hover:bg-gray-100">
        <ChevronRight className="w-5 h-5 text-[#1A1A1A] rotate-180" />
      </Link>
      <h1 className="text-base font-bold text-[#1A1A1A]">My Orders</h1>
    </header>
  );
}
