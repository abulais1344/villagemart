'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency, formatDateTime } from '@/lib/utils/format';
import type { Order, OrderStatus } from '@/types';
import toast from 'react-hot-toast';

const STATUSES: OrderStatus[] = ['pending', 'accepted', 'packed', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled'];

const WA_MESSAGES: Record<string, (name: string, id: string, store: string) => string> = {
  pending:          (name, id)        => `Hi ${name}! Your order #${id} has been received and is being processed. Thank you for ordering from Zupr! 🛒`,
  accepted:         (name, id, store) => `Hi ${name}! Your order #${id} from ${store} has been accepted and is being prepared. 🎉`,
  packed:           (name, id, store) => `Hi ${name}! Your order #${id} from ${store} is packed and ready! 📦`,
  ready:            (name, id, store) => `Hi ${name}! Your order #${id} from ${store} is ready and will be picked up soon! 📦`,
  picked_up:        (name, id, store) => `Hi ${name}! Your order #${id} from ${store} has been picked up and is on its way! 🛵`,
  out_for_delivery: (name, id, store) => `Hi ${name}! Your order #${id} from ${store} is out for delivery and will reach you soon! 🛵`,
  delivered:        (name, id, store) => `Hi ${name}! Your order #${id} from ${store} has been delivered. Enjoy your meal! 😊 Please share feedback.`,
  cancelled:        (name, id)        => `Hi ${name}! We're sorry, your order #${id} has been cancelled. Please contact us for support.`,
};

function getRiderWhatsAppUrl(order: Order): string | null {
  const rider = (order as any).rider as { name: string; phone: string } | null;
  if (!rider?.phone) return null;

  const rawPhone = String(rider.phone).replace(/\D/g, '');
  const e164 = rawPhone.startsWith('91') ? rawPhone : `91${rawPhone}`;

  const storeName = (order.merchant as never as { store_name: string })?.store_name ?? 'Restaurant';
  const shortId = order.id.slice(-6).toUpperCase();
  const addr = order.delivery_address as any;
  const addressStr = [addr?.address, addr?.landmark, addr?.area].filter(Boolean).join(', ');
  const itemLines = (order.order_items ?? [])
    .map((i: any) => `• ${i.product_snapshot?.name ?? 'Item'} x${i.quantity}`)
    .join('\n');

  const message = [
    `🛵 Order Ready for Pickup — #${shortId}`,
    ``,
    `🍽️ Pickup: ${storeName}`,
    ``,
    `👤 Customer: ${order.customer_name}`,
    `📞 Phone: ${order.customer_phone}`,
    `🏠 Deliver to: ${addressStr}`,
    ``,
    `📋 Items:`,
    itemLines,
    ``,
    `Payment: PAID ONLINE ✅`,
  ].join('\n');

  return `https://wa.me/${e164}?text=${encodeURIComponent(message)}`;
}

function getWhatsAppUrl(order: Order): string | null {
  if (!order.customer_phone) return null;
  const phone = order.customer_phone.replace(/[\s\-]/g, '');
  const e164 = phone.startsWith('91') ? phone : `91${phone}`;
  const name = order.customer_name ?? 'Customer';
  const shortId = order.id.slice(-6).toUpperCase();
  const store = (order.merchant as never as { store_name: string })?.store_name ?? 'Zupr';
  const msgFn = WA_MESSAGES[order.status];
  if (!msgFn) return null;
  return `https://wa.me/${e164}?text=${encodeURIComponent(msgFn(name, shortId, store))}`;
}
const STATUS_VARIANT: Record<string, 'warning' | 'primary' | 'success' | 'error' | 'gray'> = {
  pending: 'warning', accepted: 'primary', packed: 'primary',
  picked_up: 'primary', out_for_delivery: 'primary', delivered: 'success', cancelled: 'error',
};

const ADMIN_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'ready', label: 'Ready' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
] as const;

type AdminStatus = typeof ADMIN_STATUSES[number]['value'];

function toAdminStatus(status: string): AdminStatus {
  const allowed: AdminStatus[] = ['pending', 'ready', 'out_for_delivery', 'delivered'];
  return allowed.includes(status as AdminStatus) ? (status as AdminStatus) : 'pending';
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [selected, setSelected] = useState<Order | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<AdminStatus>('pending');
  const [riders, setRiders] = useState<{ id: string; name: string }[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [updating, setUpdating] = useState(false);
  const supabase = createClient();

  const loadOrders = async () => {
    const res = await fetch(`/api/admin/orders?status=${statusFilter}&limit=100`);
    const json = await res.json();
    setOrders(json.orders ?? []);
    setLoading(false);
  };

  useEffect(() => { loadOrders(); }, [statusFilter]);

  useEffect(() => {
    supabase.from('riders').select('id, name').eq('is_available', true).then(({ data }) => setRiders(data ?? []));
  }, []);

  const assignRider = async (orderId: string, riderId: string, order: Order) => {
    setAssigning(true);
    await supabase.from('deliveries').insert({
      order_id: orderId,
      rider_id: riderId,
      delivery_latitude: (order.delivery_address as any)?.latitude,
      delivery_longitude: (order.delivery_address as any)?.longitude,
    });
    toast.success('Rider assigned');
    setSelected(null);
    setAssigning(false);
  };

  const initiateRefund = async (order: Order) => {
    await supabase.from('orders').update({ status: 'refunded', payment_status: 'refunded' }).eq('id', order.id);
    toast.success('Refund initiated');
    setSelected(null);
    loadOrders();
  };

  const patchStatus = async (order: Order, status: string) => {
    setUpdating(true);
    const res = await fetch('/api/admin/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: order.id, status }),
    });
    setUpdating(false);
    if (res.ok) {
      toast.success(`Status updated to ${status.replace('_', ' ')}`);
      const updatedOrder = { ...order, status: status as OrderStatus };
      setOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o));
      setSelected(updatedOrder);
      setSelectedStatus(toAdminStatus(status));
    } else {
      toast.error('Failed to update status');
    }
  };

  const openModal = (order: Order) => {
    setSelected(order);
    setSelectedStatus(toAdminStatus(order.status));
  };

  return (
    <>
      <AdminHeader title="Orders" />
      <main className="pb-4">
        <div className="flex overflow-x-auto no-scrollbar bg-white border-b border-[#E5E7EB]">
          {(['all', ...STATUSES] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`flex-shrink-0 px-3 py-3 text-xs font-medium border-b-2 transition-colors ${statusFilter === s ? 'border-primary-600 text-primary-600' : 'border-transparent text-[#6B7280]'}`}>
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="px-4 py-4 space-y-3">
          {loading ? (
            [...Array(5)].map((_, i) => <Skeleton key={i} className="h-28" />)
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-[#6B7280]">No orders on Zupr yet</div>
          ) : (
            orders.map(order => (
              <button key={order.id} onClick={() => openModal(order)} className="w-full bg-white rounded-2xl border border-[#E5E7EB] p-4 text-left hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm font-bold text-[#1A1A1A]">{order.order_number}</p>
                    <p className="text-xs text-[#6B7280]">{formatDateTime(order.created_at)}</p>
                    {(order.merchant as never as { store_name: string })?.store_name && (
                      <p className="text-xs text-primary-600">{(order.merchant as never as { store_name: string }).store_name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_VARIANT[order.status] ?? 'gray'}>{order.status.replace('_', ' ')}</Badge>
                    {(() => {
                      const url = getWhatsAppUrl(order);
                      return url ? (
                        <span
                          role="link"
                          onClick={e => { e.stopPropagation(); window.open(url, '_blank', 'noopener,noreferrer'); }}
                          className="inline-flex items-center px-2 py-1 rounded-lg text-white text-xs font-medium cursor-pointer select-none"
                          style={{ backgroundColor: '#25D366' }}
                          title="Send WhatsApp update"
                        >
                          💬
                        </span>
                      ) : null;
                    })()}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-[#6B7280]">{order.order_items?.length} items</span>
                  <span className="text-sm font-bold text-primary-600">{formatCurrency(order.total_amount)}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </main>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Order ${selected?.order_number}`}>
        {selected && (
          <div className="space-y-4">
            {/* Customer info */}
            <div className="bg-[#F9FAFB] rounded-xl px-3 py-2.5 space-y-1">
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Customer</p>
              <p className="text-sm font-medium text-[#1A1A1A]">{selected.customer_name}</p>
              {selected.customer_phone && (
                <div className="flex items-center gap-2">
                  <a href={`tel:${selected.customer_phone}`} className="text-sm text-primary-600 font-medium">
                    {selected.customer_phone}
                  </a>
                  {getWhatsAppUrl(selected) && (
                    <a
                      href={getWhatsAppUrl(selected)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-white text-xs font-medium"
                      style={{ backgroundColor: '#25D366' }}
                    >
                      💬 WhatsApp
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Delivery address */}
            {selected.delivery_address && (() => {
              const addr = selected.delivery_address as { name?: string; phone?: string; address?: string; landmark?: string; area?: string };
              return (
                <div className="bg-[#F9FAFB] rounded-xl px-3 py-2.5 space-y-1">
                  <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Delivery Address</p>
                  {addr.address && <p className="text-sm text-[#1A1A1A]">{addr.address}</p>}
                  {addr.landmark && <p className="text-sm text-[#6B7280]">Near: {addr.landmark}</p>}
                  {addr.area && <p className="text-sm text-[#6B7280]">{addr.area}</p>}
                </div>
              );
            })()}

            {/* Rider */}
            <div className="bg-[#F9FAFB] rounded-xl px-3 py-2.5 space-y-1">
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Rider</p>
              {(selected as any).rider ? (
                <>
                  <p className="text-sm font-medium text-[#1A1A1A]">{(selected as any).rider.name}</p>
                  <div className="flex items-center gap-2">
                    <a href={`tel:${(selected as any).rider.phone}`} className="text-sm text-primary-600 font-medium">
                      {(selected as any).rider.phone}
                    </a>
                    {getRiderWhatsAppUrl(selected) && (
                      <a
                        href={getRiderWhatsAppUrl(selected)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-white text-xs font-medium"
                        style={{ backgroundColor: '#25D366' }}
                      >
                        💬 WhatsApp
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-[#6B7280]">No rider assigned</p>
              )}
            </div>

            {/* Items */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Items</p>
              {selected.order_items?.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-[#6B7280]">{item.product_snapshot?.name ?? 'Item'} × {item.quantity}</span>
                  <span>{formatCurrency(item.total_price)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold border-t pt-2">
                <span>Total</span>
                <span>{formatCurrency(selected.total_amount)}</span>
              </div>
            </div>

            {/* Status update row */}
            <div className="space-y-2 pt-1">
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Update Status</p>
              <div className="flex gap-2">
                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value as AdminStatus)}
                  className="flex-1 border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-[#1A1A1A] bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {ADMIN_STATUSES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => patchStatus(selected, selectedStatus)}
                  disabled={updating || selectedStatus === toAdminStatus(selected.status)}
                  className="px-4 py-2 bg-[#7C3AED] text-white rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {updating ? 'Saving…' : 'Update'}
                </button>
              </div>

              {/* Cancel order */}
              {!['delivered', 'cancelled'].includes(selected.status) && (
                <button
                  onClick={() => patchStatus(selected, 'cancelled')}
                  disabled={updating}
                  className="w-full px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Cancel Order
                </button>
              )}
            </div>

            {/* Assign rider */}
            {['accepted', 'packed'].includes(selected.status) && riders.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">Assign Rider</p>
                <div className="space-y-2">
                  {riders.map(r => (
                    <button key={r.id} onClick={() => assignRider(selected.id, r.id, selected)}
                      disabled={assigning}
                      className="w-full text-left px-3 py-2 rounded-xl border border-[#E5E7EB] text-sm hover:border-primary-600 hover:bg-primary-50 transition-colors">
                      {r.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Refund */}
            {['delivered', 'cancelled'].includes(selected.status) && selected.payment_status === 'paid' && (
              <Button fullWidth variant="danger" onClick={() => initiateRefund(selected)}>
                Initiate Refund
              </Button>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
