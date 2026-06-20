'use client';

import { useEffect, useState } from 'react';
import { MapPin, Phone, Navigation, ToggleLeft, ToggleRight, Package } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency, formatDateTime } from '@/lib/utils/format';
import type { Order, Rider } from '@/types';
import toast from 'react-hot-toast';

export default function RiderDashboard() {
  const { user, signOut } = useAuth();
  const [rider, setRider] = useState<Rider | null>(null);
  const [deliveries, setDeliveries] = useState<(Order & { delivery: { id: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: r } = await supabase.from('riders').select('*').eq('user_id', user.id).single();
      if (!r) { setLoading(false); return; }
      setRider(r);

      const { data: dels } = await supabase
        .from('deliveries')
        .select('*, order:orders(*, order_items(*))')
        .eq('rider_id', r.id)
        .is('delivered_at', null)
        .order('assigned_at', { ascending: false });

      setDeliveries((dels ?? []).map(d => ({ ...d.order, delivery: { id: d.id } })));
      setLoading(false);
    };
    load();
  }, [user]);

  const toggleAvailability = async () => {
    if (!rider) return;
    setToggling(true);
    const { error } = await supabase
      .from('riders')
      .update({ is_available: !rider.is_available })
      .eq('id', rider.id);
    if (!error) {
      setRider(prev => prev ? { ...prev, is_available: !prev.is_available } : prev);
      toast.success(rider.is_available ? 'You are now offline' : 'You are now available!');
    }
    setToggling(false);
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!rider) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center">
        <div>
          <p className="text-5xl mb-4">🛵</p>
          <h2 className="text-lg font-bold">Rider account not found</h2>
          <p className="text-sm text-[#6B7280] mt-1">Contact support to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E7EB] px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[#1A1A1A]">Rider Dashboard</h1>
            <p className="text-sm text-[#6B7280]">{rider.name} · {rider.vehicle_type}</p>
          </div>
          <button
            onClick={toggleAvailability}
            disabled={toggling}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${rider.is_available ? 'bg-success text-white' : 'bg-gray-200 text-[#6B7280]'}`}
          >
            {rider.is_available ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
            {rider.is_available ? 'Online' : 'Offline'}
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {!rider.is_available && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
            <p className="text-sm font-medium text-amber-700">You are offline. Toggle to receive deliveries.</p>
          </div>
        )}

        <h2 className="text-base font-bold text-[#1A1A1A]">Active Deliveries ({deliveries.length})</h2>

        {deliveries.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-[#6B7280]">No active deliveries</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deliveries.map(order => (
              <Link key={order.id} href={`/rider/delivery/${order.id}`}>
                <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-sm font-bold text-[#1A1A1A]">{order.order_number}</p>
                      <p className="text-xs text-[#6B7280]">{formatDateTime(order.created_at)}</p>
                    </div>
                    <Badge variant={order.status === 'picked_up' ? 'primary' : 'warning'}>
                      {order.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-success mt-1.5 shrink-0" />
                      <p className="text-[#6B7280]">Pickup: {order.merchant?.address ?? 'Store'}</p>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-error mt-1.5 shrink-0" />
                      <p className="text-[#6B7280]">{order.delivery_address?.full_address}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#E5E7EB]">
                    <span className="text-sm font-bold text-primary-600">{formatCurrency(order.total_amount)}</span>
                    <a
                      href={`https://maps.google.com/?q=${order.delivery_address?.latitude},${order.delivery_address?.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1 text-xs text-primary-600 font-semibold"
                    >
                      <Navigation className="w-3.5 h-3.5" /> Navigate
                    </a>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
