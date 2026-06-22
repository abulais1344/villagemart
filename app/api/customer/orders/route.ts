import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const phone = request.nextUrl.searchParams.get('phone');

  if (!phone) {
    return NextResponse.json({ error: 'Missing phone param' }, { status: 400 });
  }

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_phone', phone)
    .order('created_at', { ascending: false });

  if (ordersError) {
    return NextResponse.json({ error: ordersError.message }, { status: 500 });
  }

  const orderList = orders ?? [];

  // Fetch order items, joining vm_products to get merchant_id
  let orderItems: any[] = [];
  if (orderList.length > 0) {
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*, vm_products(merchant_id)')
      .in('order_id', orderList.map((o: any) => o.id));

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    orderItems = items ?? [];
  }

  // Collect unique merchant_ids from items (join result, then snapshot fallback)
  const merchantIds = [
    ...new Set(
      orderItems
        .map((i: any) => i.vm_products?.merchant_id ?? i.product_snapshot?.merchant_id)
        .filter(Boolean)
    ),
  ] as string[];

  let merchantMap: Record<string, string> = {};
  if (merchantIds.length > 0) {
    const { data: merchants } = await supabase
      .from('merchants')
      .select('id, name')
      .in('id', merchantIds);
    merchantMap = Object.fromEntries(
      merchants?.map((m: any) => [m.id, m.name]) ?? []
    );
  }

  const result = orderList.map((o: any) => {
    const items = orderItems.filter((i: any) => i.order_id === o.id);
    // Derive merchant from the first item that has one
    const merchantId = items
      .map((i: any) => i.vm_products?.merchant_id ?? i.product_snapshot?.merchant_id)
      .find(Boolean);
    return {
      ...o,
      merchant_name: merchantId ? (merchantMap[merchantId] ?? null) : null,
      items,
    };
  });

  return NextResponse.json({ orders: result });
}
