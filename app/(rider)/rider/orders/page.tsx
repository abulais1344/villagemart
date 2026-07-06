'use client';

import { useEffect, useState } from 'react';
import { useRider } from '../RiderProvider';
import toast from 'react-hot-toast';

const STATUS_LABEL: Record<string, string> = {
  pending:          'Pending',
  confirmed:        'Confirmed',
  preparing:        'Preparing',
  ready:            'Ready',
  out_for_delivery: 'On the Way',
  delivered:        'Delivered',
  cancelled:        'Cancelled',
};

const STATUS_COLOR: Record<string, string> = {
  pending:          'bg-orange-100 text-orange-700',
  confirmed:        'bg-blue-100 text-blue-700',
  preparing:        'bg-blue-100 text-blue-700',
  ready:            'bg-green-100 text-green-700',
  out_for_delivery: 'bg-indigo-100 text-indigo-700',
  delivered:        'bg-green-100 text-green-700',
  cancelled:        'bg-red-100 text-red-700',
};

export default function RiderOrdersPage() {
  const rider = useRider();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  async function loadOrders() {
    const res = await fetch('/api/rider/orders');
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { loadOrders(); }, []);

  async function handleAction(orderId: string, action: 'pickup' | 'deliver') {
    setActing(orderId);
    const res = await fetch('/api/rider/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, action }),
    });
    if (res.ok) {
      toast.success(action === 'pickup' ? 'Picked up!' : 'Delivered! 🎉');
      await loadOrders();
    } else {
      const data = await res.json();
      toast.error(data.error || 'Failed');
    }
    setActing(null);
  }

  const active = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');
  const history = orders.filter(o => o.status === 'delivered' || o.status === 'cancelled');

  return (
    <>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-[#E5E7EB] px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-[#1A1A1A]">My Orders</h1>
            <p className="text-xs text-[#6B7280]">{rider.name} · 🛵</p>
          </div>
          <button
            onClick={loadOrders}
            className="text-xs text-[#7C3AED] font-medium px-3 py-1.5 rounded-lg bg-purple-50"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* Active orders */}
        <section>
          <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">
            Active ({active.length})
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-[#E5E7EB] p-4 animate-pulse">
                  <div className="h-4 bg-gray-100 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-2/3 mb-1" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : active.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">🛵</p>
              <p className="text-sm text-[#6B7280]">No active orders right now</p>
            </div>
          ) : (
            <div className="space-y-3">
              {active.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  acting={acting}
                  onAction={handleAction}
                />
              ))}
            </div>
          )}
        </section>

        {/* History */}
        {history.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">
              History ({history.length})
            </h2>
            <div className="space-y-3">
              {history.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  acting={acting}
                  onAction={handleAction}
                  dimmed
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

function OrderCard({
  order,
  acting,
  onAction,
  dimmed = false,
}: {
  order: any;
  acting: string | null;
  onAction: (id: string, action: 'pickup' | 'deliver') => void;
  dimmed?: boolean;
}) {
  const addr = order.delivery_address as any;
  const addressStr = [addr?.address, addr?.area].filter(Boolean).join(', ');
  const landmark = addr?.landmark;
  const shortId = order.id.slice(-6).toUpperCase();
  const isActing = acting === order.id;

  return (
    <div className={`bg-white rounded-2xl border border-[#E5E7EB] p-4 ${dimmed ? 'opacity-60' : ''}`}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-xs font-bold text-[#1A1A1A]">#{shortId}</span>
          {order.store_name && (
            <span className="text-xs text-[#6B7280] ml-2">· {order.store_name}</span>
          )}
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>

      {/* Customer */}
      <div className="space-y-1 mb-3">
        <p className="text-sm font-medium text-[#1A1A1A]">{order.customer_name}</p>
        <a
          href={`tel:${order.customer_phone}`}
          className="text-sm text-[#7C3AED] font-medium"
        >
          📞 {order.customer_phone}
        </a>
        <p className="text-xs text-[#6B7280]">🏠 {addressStr}</p>
        {landmark && <p className="text-xs text-[#6B7280]">📍 {landmark}</p>}
      </div>

      {/* Items */}
      {order.order_items?.length > 0 && (
        <div className="bg-gray-50 rounded-xl px-3 py-2 mb-3">
          <p className="text-[10px] font-semibold text-[#6B7280] uppercase mb-1">Items</p>
          <ul className="space-y-0.5">
            {order.order_items.map((item: any, i: number) => (
              <li key={i} className="text-xs text-[#374151]">
                {item.product_snapshot?.name ?? 'Item'} ×{item.quantity}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action button */}
      {order.status === 'ready' && (
        <button
          onClick={() => onAction(order.id, 'pickup')}
          disabled={isActing}
          className="w-full bg-green-600 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60"
        >
          {isActing ? 'Updating…' : '🛵 Pick Up Order'}
        </button>
      )}
      {order.status === 'out_for_delivery' && (
        <button
          onClick={() => onAction(order.id, 'deliver')}
          disabled={isActing}
          className="w-full bg-[#7C3AED] text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60"
        >
          {isActing ? 'Updating…' : '✅ Mark Delivered'}
        </button>
      )}
      {!['ready', 'out_for_delivery', 'delivered', 'cancelled'].includes(order.status) && (
        <p className="text-center text-xs text-[#6B7280] py-1">Waiting for restaurant…</p>
      )}
    </div>
  );
}
