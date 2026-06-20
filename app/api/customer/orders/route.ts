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

  let orderItems: any[] = [];
  if (orderList.length > 0) {
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .in('order_id', orderList.map((o: any) => o.id));

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    orderItems = items ?? [];
  }

  const result = orderList.map((o: any) => ({
    ...o,
    items: orderItems.filter((i: any) => i.order_id === o.id),
  }));

  return NextResponse.json({ orders: result });
}
