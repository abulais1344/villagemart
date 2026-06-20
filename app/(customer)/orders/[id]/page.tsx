'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Phone, RotateCcw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { OrderTracker } from '@/components/customer/OrderTracker';
import { useOrderRealtime } from '@/lib/hooks/useRealtime';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency, formatDateTime } from '@/lib/utils/format';
import { useCartStore } from '@/store/cartStore';
import type { Order } from '@/types';
import toast from 'react-hot-toast';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCartStore();
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from('orders')
      .select('*, order_items(*), merchant:merchants(store_name, phone)')
      .eq('id', id)
      .single()
      .then(({ data }) => { setOrder(data as Order); setLoading(false); });
  }, [id]);

  useOrderRealtime(id, (updated) => setOrder(prev => ({ ...prev, ...updated } as Order)));

  const handleReorder = () => {
    if (!order?.order_items) return;
    order.order_items.forEach(item => {
      if (item.product_snapshot) {
        addItem({ ...item.product_snapshot, id: item.product_id } as never);
      }
    });
    toast.success('Items added to cart!');
    router.push('/cart');
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!order) return <div className="p-8 text-center text-[#6B7280]">Order not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-[#E5E7EB] px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base font-bold text-[#1A1A1A]">{order.order_number}</h1>
          <p className="text-xs text-[#6B7280]">{formatDateTime(order.created_at)}</p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Tracker */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
          <h2 className="text-sm font-semibold text-[#1A1A1A] mb-4">Order Status</h2>
          <OrderTracker status={order.status} />
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
          <h2 className="text-sm font-semibold text-[#1A1A1A] mb-3">Order Items</h2>
          <div className="space-y-3">
            {order.order_items?.map(item => (
              <div key={item.id} className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-[#1A1A1A]">{item.product_snapshot.name}</p>
                  <p className="text-xs text-[#6B7280]">{item.quantity} × {formatCurrency(item.unit_price)}</p>
                </div>
                <span className="text-sm font-semibold">{formatCurrency(item.total_price)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bill */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 space-y-2">
          <h2 className="text-sm font-semibold text-[#1A1A1A] mb-2">Bill Details</h2>
          <div className="flex justify-between text-sm">
            <span className="text-[#6B7280]">Subtotal</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#6B7280]">Delivery</span>
            <span>{order.delivery_charge === 0 ? <span className="text-success">FREE</span> : formatCurrency(order.delivery_charge)}</span>
          </div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-[#6B7280]">Discount</span>
              <span className="text-success">-{formatCurrency(order.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold border-t border-[#E5E7EB] pt-2">
            <span>Total Paid</span>
            <span className="text-primary-600">{formatCurrency(order.total_amount)}</span>
          </div>
        </div>

        {/* Delivery address */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
          <h2 className="text-sm font-semibold text-[#1A1A1A] mb-2">Delivery Address</h2>
          <p className="text-sm text-[#6B7280]">{order.delivery_address?.full_address}</p>
          {order.delivery_address?.landmark && (
            <p className="text-xs text-[#6B7280]">Near: {order.delivery_address.landmark}</p>
          )}
        </div>

        {/* Actions */}
        {order.status === 'delivered' && (
          <Button fullWidth variant="outline" onClick={handleReorder}>
            <RotateCcw className="w-4 h-4" /> Reorder
          </Button>
        )}
      </div>
    </div>
  );
}
