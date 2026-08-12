import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const INDIAN_PHONE_RE = /^[6-9]\d{9}$/;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const phone = request.nextUrl.searchParams.get('phone');

  if (!phone || !INDIAN_PHONE_RE.test(phone)) {
    return NextResponse.json({ error: 'Invalid phone' }, { status: 400 });
  }

  // customer_phone check is the ownership gate — only the ordering customer's
  // phone can retrieve this order.
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .eq('customer_phone', phone)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const [{ data: items }, { data: merchant }] = await Promise.all([
    supabase.from('order_items').select('*').eq('order_id', id),
    supabase.from('merchants').select('store_name, phone, latitude, longitude').eq('id', order.merchant_id).single(),
  ]);

  return NextResponse.json({ order: { ...order, order_items: items ?? [], merchant: merchant ?? null } });
}
