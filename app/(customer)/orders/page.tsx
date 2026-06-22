'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Loader2, ShoppingBag, ChevronRight,
  Clock, CheckCircle2, XCircle,
} from 'lucide-react';

// ── types ──────────────────────────────────────────────────────────────────
interface Snapshot {
  name?: string;
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
  total_amount: number;
  payment_status: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  merchant_name: string | null;
  delivery_address: { name?: string; phone?: string; address?: string; landmark?: string; area?: string } | null;
  items: OrderItem[];
}

// ── status badge config ────────────────────────────────────────────────────
const STATUS: Record<string, { label: string; cls: string; Icon: typeof Clock }> = {
  pending:   { label: 'Pending',    cls: 'text-amber-700 bg-amber-100',   Icon: Clock        },
  confirmed: { label: 'Confirmed',  cls: 'text-blue-600 bg-blue-50',      Icon: CheckCircle2 },
  preparing: { label: 'Preparing',  cls: 'text-orange-600 bg-orange-50',  Icon: Clock        },
  ready:     { label: 'Ready',      cls: 'text-green-700 bg-green-100',   Icon: CheckCircle2 },
  delivered: { label: 'Delivered',  cls: 'text-gray-500 bg-gray-100',     Icon: CheckCircle2 },
  cancelled: { label: 'Cancelled',  cls: 'text-red-600 bg-red-100',       Icon: XCircle      },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS[status] ?? STATUS['pending'];
  const { label, cls, Icon } = cfg;
  return (
    <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${cls}`}>
      <Icon size={14} />
      {label}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

// ── main component ─────────────────────────────────────────────────────────
export default function OrdersPage() {
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
  }, []);

  async function fetchOrders(customerPhone: string) {
    const res = await fetch(`/api/customer/orders?phone=${customerPhone}`);
    const data = await res.json();
    setOrders(data.orders ?? []);
    setLoading(false);
  }

  function toggleExpand(id: string) {
    setExpandedId(prev => (prev === id ? null : id));
  }

  // ── loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#7C3AED]" />
      </div>
    );
  }

  // ── not logged in ────────────────────────────────────────────────────────
  if (!phone) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center gap-4">
        <ShoppingBag className="w-16 h-16 text-gray-200" />
        <h2 className="text-lg font-bold text-[#1A1A1A]">No orders yet</h2>
        <p className="text-sm text-[#6B7280]">Login to see your order history</p>
        <Link
          href="/auth/login"
          className="px-6 py-3 bg-[#7C3AED] text-white rounded-xl font-semibold text-sm"
        >
          Login
        </Link>
      </div>
    );
  }

  // ── empty ────────────────────────────────────────────────────────────────
  if (orders.length === 0) {
    return (
      <>
        <StickyHeader />
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center gap-4">
          <ShoppingBag className="w-16 h-16 text-gray-200" />
          <h2 className="text-lg font-bold text-[#1A1A1A]">No orders yet</h2>
          <p className="text-sm text-[#6B7280]">Your orders will appear here</p>
          <Link
            href="/"
            className="px-6 py-3 bg-[#7C3AED] text-white rounded-xl font-semibold text-sm"
          >
            Start Shopping
          </Link>
        </div>
      </>
    );
  }

  // ── order list ───────────────────────────────────────────────────────────
  return (
    <>
      <StickyHeader />
      <div className="max-w-lg mx-auto space-y-3 px-4 py-4 pb-24">
        {orders.map(order => {
          const expanded = expandedId === order.id;
          const addr = order.delivery_address;
          const names = order.items
            .map(i => i.product_snapshot?.name)
            .filter(Boolean) as string[];
          const itemSummary = names.slice(0, 2).join(', ') +
            (names.length > 2 ? ` +${names.length - 2} more` : '');

          return (
            <div
              key={order.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              {/* Card summary — always visible */}
              <button
                className="w-full text-left px-4 py-4"
                onClick={() => toggleExpand(order.id)}
              >
                {/* Merchant name + short order ID */}
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <p className="text-sm font-semibold text-[#7C3AED] truncate flex-1">
                    {order.merchant_name ?? 'VillageMart'}
                  </p>
                  <span className="text-[10px] text-gray-400 font-mono shrink-0">
                    #{order.id.slice(-6).toUpperCase()}
                  </span>
                </div>

                {/* Item count + summary */}
                <p className="text-xs text-[#6B7280] mb-1">
                  {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                  {itemSummary ? ` · ${itemSummary}` : ''}
                </p>

                <p className="text-xs text-[#9CA3AF] mb-2">{formatDate(order.created_at)}</p>

                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-[#1A1A1A]">₹{order.total_amount}</p>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={order.status} />
                    <span className="text-xs font-medium text-[#7C3AED]">
                      {expanded ? '▲' : '▼'}
                    </span>
                  </div>
                </div>
              </button>

              {/* Expanded details */}
              {expanded && (
                <div className="border-t border-gray-100 px-4 py-4 space-y-4">
                  {/* Items */}
                  <div className="space-y-3">
                    {order.items.map((item, i) => {
                      const snap = item.product_snapshot;
                      return (
                        <div key={item.id ?? i} className="flex items-center gap-3">
                          {snap?.image_url ? (
                            <img
                              src={snap.image_url}
                              alt={snap.name ?? ''}
                              className="w-9 h-9 rounded-lg object-cover shrink-0 border border-gray-100"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center text-base">
                              🛒
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#1A1A1A] truncate">
                              {snap?.name ?? 'Item'}
                            </p>
                            {snap?.unit && (
                              <p className="text-xs text-[#9CA3AF]">{snap.unit}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-[#6B7280]">×{item.quantity}</p>
                            <p className="text-sm font-semibold text-[#1A1A1A]">₹{item.total_price}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Delivery address */}
                  {addr && (
                    <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                      <p className="text-xs font-semibold text-[#6B7280] mb-1">Delivered to</p>
                      <p className="text-sm font-medium text-[#1A1A1A]">
                        {addr.name}{addr.phone ? ` · ${addr.phone}` : ''}
                      </p>
                      {addr.address && (
                        <p className="text-xs text-[#6B7280] mt-0.5">{addr.address}</p>
                      )}
                    </div>
                  )}

                  {/* Order ID */}
                  <p className="text-xs text-gray-300 font-mono">
                    Order #{order.id.slice(0, 8).toUpperCase()}
                  </p>
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
