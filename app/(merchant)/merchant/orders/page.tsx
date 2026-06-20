'use client';

import { useEffect, useRef, useState } from 'react';
import { useMerchant } from '../MerchantProvider';
import { MerchantHeader } from '@/components/merchant/MerchantHeader';

const STATUS_TABS = [
  { key: 'all',       label: 'All'       },
  { key: 'pending',   label: 'New'       },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready',     label: 'Ready'     },
  { key: 'delivered', label: 'Delivered' },
];

const STATUS_COLOR: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-700',
  preparing: 'bg-blue-100 text-blue-700',
  accepted:  'bg-blue-100 text-blue-700',
  packed:    'bg-purple-100 text-purple-700',
  ready:     'bg-green-100 text-green-700',
  delivered: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function getItemName(item: any): string {
  return item.product_snapshot?.name ?? item.product_name ?? 'Item';
}

function playBeep() {
  try {
    const audio = new Audio('/sounds/order-notification.mp3');
    audio.play().catch(() => {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } catch {}
    });
  } catch {}
}

export default function MerchantOrdersPage() {
  const merchant = useMerchant();
  const [orders, setOrders] = useState<any[]>([]);
  const [tab, setTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const prevPendingCount = useRef<number | null>(null);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 30_000);
    return () => clearInterval(interval);
  }, [tab]);

  async function loadOrders() {
    const res = await fetch(`/api/merchant/orders?status=${tab}`);
    const json = await res.json();
    const fetched: any[] = json.orders ?? [];
    setOrders(fetched);
    setLoading(false);

    const pendingCount = fetched.filter((o: any) => o.status === 'pending').length;
    if (prevPendingCount.current !== null && pendingCount > prevPendingCount.current) {
      playBeep();
    }
    prevPendingCount.current = pendingCount;
  }

  async function updateStatus(orderId: string, status: string) {
    await fetch('/api/merchant/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, status }),
    });
    loadOrders();
  }

  return (
    <>
      <MerchantHeader storeName={merchant.store_name} />

      {/* Filter tabs */}
      <div className="flex overflow-x-auto bg-white border-b border-gray-100 sticky top-[61px] z-30"
        style={{ scrollbarWidth: 'none' }}>
        {STATUS_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-[#7C3AED] text-[#7C3AED]'
                : 'border-transparent text-gray-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <main className="px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-36 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-2">📭</p>
            <p className="text-sm text-gray-500">No orders here</p>
          </div>
        ) : (
          orders.map(order => (
            <div key={order.id} className="bg-white rounded-2xl p-4 border border-gray-100 mb-3">
              {/* Header row */}
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-gray-900">
                  Order #{(order.id as string).slice(-6).toUpperCase()}
                </span>
                <span className="text-xs text-gray-400">{timeAgo(order.created_at)}</span>
              </div>

              {/* Status pill */}
              <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mb-3 ${STATUS_COLOR[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {order.status}
              </span>

              {/* Items */}
              <div className="mb-3 space-y-0.5">
                {(order.order_items ?? []).map((item: any, i: number) => (
                  <p key={item.id ?? i} className="text-sm text-gray-700">
                    {item.quantity}x {getItemName(item)} — ₹{item.unit_price ?? item.total_price ?? 0}
                  </p>
                ))}
              </div>

              {/* Customer info */}
              {order.customer_name && (
                <p className="text-xs text-gray-500 mb-3">
                  👤 {order.customer_name}
                  {order.customer_phone ? ` · ${order.customer_phone}` : ''}
                </p>
              )}

              {/* Total */}
              <p className="font-semibold text-gray-900 mb-3">Total: ₹{order.total_amount}</p>

              {/* Action buttons */}
              {order.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStatus(order.id, 'preparing')}
                    className="flex-1 bg-[#7C3AED] text-white rounded-xl py-2 text-sm font-medium"
                  >
                    ✅ Accept
                  </button>
                  <button
                    onClick={() => updateStatus(order.id, 'cancelled')}
                    className="flex-1 bg-red-50 text-red-600 border border-red-200 rounded-xl py-2 text-sm"
                  >
                    ❌ Reject
                  </button>
                </div>
              )}
              {order.status === 'preparing' && (
                <button
                  onClick={() => updateStatus(order.id, 'ready')}
                  className="w-full bg-green-600 text-white rounded-xl py-2 text-sm font-medium"
                >
                  🍱 Mark Ready for Pickup
                </button>
              )}
              {order.status === 'ready' && (
                <p className="text-green-600 text-sm font-medium">✅ Ready — Waiting for rider</p>
              )}
            </div>
          ))
        )}
      </main>
    </>
  );
}
