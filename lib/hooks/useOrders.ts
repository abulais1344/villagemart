'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Order } from '@/types';

export function useOrders(customerId?: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchOrders = useCallback(async () => {
    if (!customerId) { setLoading(false); return; }
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          product:products(*)
        ),
        merchant:merchants(store_name, logo_url)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (err) {
      setError(err.message);
    } else {
      setOrders(data ?? []);
    }
    setLoading(false);
  }, [customerId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return { orders, loading, error, refetch: fetchOrders };
}

export function useOrder(orderId: string) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*),
        merchant:merchants(store_name, logo_url, phone)
      `)
      .eq('id', orderId)
      .single();

    setOrder(data ?? null);
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  return { order, loading, refetch: fetchOrder };
}
