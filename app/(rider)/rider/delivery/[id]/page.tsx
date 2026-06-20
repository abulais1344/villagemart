'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Phone, Navigation, Camera, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/utils/format';
import type { Order } from '@/types';
import toast from 'react-hot-toast';

export default function DeliveryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [delivery, setDelivery] = useState<{ id: string; picked_up_at: string | null; delivered_at: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const [{ data: o }, { data: d }] = await Promise.all([
        supabase.from('orders').select('*, order_items(*), merchant:merchants(store_name, phone, address)').eq('id', id).single(),
        supabase.from('deliveries').select('*').eq('order_id', id).single(),
      ]);
      setOrder(o as Order);
      setDelivery(d);
      setLoading(false);
    };
    load();
  }, [id]);

  const markPickedUp = async () => {
    setUpdating(true);
    await Promise.all([
      supabase.from('orders').update({ status: 'out_for_delivery', picked_up_at: new Date().toISOString() }).eq('id', id),
      supabase.from('deliveries').update({ picked_up_at: new Date().toISOString() }).eq('order_id', id),
    ]);
    toast.success('Marked as picked up!');
    setDelivery(prev => prev ? { ...prev, picked_up_at: new Date().toISOString() } : prev);
    setUpdating(false);
  };

  const markDelivered = async () => {
    setUpdating(true);
    await Promise.all([
      supabase.from('orders').update({ status: 'delivered', delivered_at: new Date().toISOString() }).eq('id', id),
      supabase.from('deliveries').update({ delivered_at: new Date().toISOString() }).eq('order_id', id),
    ]);
    toast.success('Order delivered! 🎉');
    router.push('/rider/dashboard');
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!order) return <div className="p-8 text-center text-[#6B7280]">Order not found</div>;

  const pickedUp = !!delivery?.picked_up_at;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E7EB] px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-[#1A1A1A]">Delivery — {order.order_number}</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Pickup */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-success" />
            <h3 className="text-sm font-semibold text-[#1A1A1A]">Pickup Location</h3>
          </div>
          <p className="text-sm text-[#6B7280] mb-3">{(order.merchant as never as { store_name: string; address: string })?.store_name} · {(order.merchant as never as { address: string })?.address}</p>
          <div className="flex gap-2">
            {(order.merchant as never as { phone: string })?.phone && (
              <a href={`tel:${(order.merchant as never as { phone: string })?.phone}`}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-primary-50 rounded-xl text-sm font-medium text-primary-600">
                <Phone className="w-4 h-4" /> Call Store
              </a>
            )}
          </div>
        </div>

        {/* Delivery */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-error" />
            <h3 className="text-sm font-semibold text-[#1A1A1A]">Delivery Location</h3>
          </div>
          <p className="text-sm text-[#6B7280] mb-3">{order.delivery_address?.full_address}</p>
          {order.delivery_address?.landmark && <p className="text-xs text-[#6B7280] mb-3">Near: {order.delivery_address.landmark}</p>}
          <a
            href={`https://maps.google.com/?q=${order.delivery_address?.latitude},${order.delivery_address?.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 py-2 bg-primary-600 rounded-xl text-sm font-medium text-white"
          >
            <Navigation className="w-4 h-4" /> Open in Maps
          </a>
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
          <h3 className="text-sm font-semibold text-[#1A1A1A] mb-3">Order Items</h3>
          {order.order_items?.map(item => (
            <div key={item.id} className="flex justify-between text-sm py-1">
              <span className="text-[#6B7280]">{item.product_snapshot.name} × {item.quantity}</span>
              <span className="font-medium">{formatCurrency(item.total_price)}</span>
            </div>
          ))}
          <div className="flex justify-between font-bold border-t border-[#E5E7EB] pt-2 mt-2">
            <span>Total</span>
            <span className="text-primary-600">{formatCurrency(order.total_amount)}</span>
          </div>
        </div>

        {/* Action buttons */}
        {!pickedUp ? (
          <Button fullWidth size="lg" onClick={markPickedUp} loading={updating}>
            <CheckCircle className="w-5 h-5" /> Mark as Picked Up
          </Button>
        ) : !delivery?.delivered_at ? (
          <Button fullWidth size="lg" onClick={markDelivered} loading={updating}>
            <CheckCircle className="w-5 h-5" /> Mark as Delivered
          </Button>
        ) : (
          <div className="flex items-center justify-center gap-2 p-4 bg-green-50 rounded-2xl">
            <CheckCircle className="w-5 h-5 text-success" />
            <p className="text-sm font-medium text-success">Delivered successfully!</p>
          </div>
        )}
      </div>
    </div>
  );
}
