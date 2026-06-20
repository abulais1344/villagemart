'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Order } from '@/types';

// Subscribe to order status changes for a customer
export function useOrderRealtime(orderId: string, onUpdate: (order: Order) => void) {
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload) => onUpdate(payload.new as Order)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId]);
}

// Merchant: listen for new orders
export function useMerchantOrders(merchantId: string, onNewOrder: (order: Order) => void) {
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`merchant-orders-${merchantId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `merchant_id=eq.${merchantId}` },
        (payload) => onNewOrder(payload.new as Order)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [merchantId]);
}

// Rider: listen for new deliveries assigned
export function useRiderDeliveries(riderId: string, onAssigned: (delivery: unknown) => void) {
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`rider-deliveries-${riderId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'deliveries', filter: `rider_id=eq.${riderId}` },
        (payload) => onAssigned(payload.new)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [riderId]);
}

// Admin: live order count
export function useAdminOrderRealtime(onUpdate: () => void) {
  const supabase = createClient();
  const callbackRef = useRef(onUpdate);
  callbackRef.current = onUpdate;

  useEffect(() => {
    const channel = supabase
      .channel('admin-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => callbackRef.current()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);
}
