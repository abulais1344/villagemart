'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Loader2, ShoppingBag, ChevronRight,
  Clock, CheckCircle2, XCircle, Truck,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';

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
  delivery_address: { name?: string; phone?: string; address?: string; landmark?: string; area?: string } | null;
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
  { key: 'pending',          label: 'Placed'         },
  { key: 'confirmed',        label: 'Confirmed'      },
  { key: 'preparing',        label: 'Preparing'      },
  { key: 'out_for_delivery', label: 'On the Way'     },
  { key: 'delivered',        label: 'Delivered'      },
];

const STEP_ORDER = TIMELINE_STEPS.map(s => s.key);

function OrderTimeline({ status }: { status: string }) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-2 py-2">
        <XCircle className="w-4 h-4 text-red-500 shrink-0" />
        <span className="text-sm font-medium text-red-500">Order Cancelled</span>
      </div>
    );
  }

  const currentIdx = STEP_ORDER.indexOf(status);

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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('vm_customer');
    if (!raw) { setLoading(false); return; }
    const customer = JSON.parse(raw);
    setPhone(customer.phone ?? null);
    if (customer.phone) fetchOrders(customer.phone);
    else setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function goToLogin() {
    localStorage.setItem('login_redirect', '/orders');
    router.push('/auth/login');
  }

  async function fetchOrders(customerPhone: string) {
    const res = await fetch(`/api/customer/orders?phone=${customerPhone}`);
    const data = await res.json();
    setOrders(data.orders ?? []);
    setLoading(false);
  }

  function toggleExpand(id: string) {
    setExpandedId(prev => (prev === id ? null : id));
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
          const expanded = expandedId === order.id;
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
