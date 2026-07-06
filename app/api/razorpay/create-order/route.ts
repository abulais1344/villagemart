import { NextRequest } from 'next/server';
import Razorpay from 'razorpay';
import { createClient } from '@supabase/supabase-js';

const MAX_ORDER_AMOUNT = 50_000;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { items, offerId } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'Invalid items' }, { status: 400 });
    }

    // Fetch actual product prices from DB — never trust client prices
    const productIds = (items as Array<{ id: string; quantity: number }>).map(i => i.id);
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('id, selling_price')
      .in('id', productIds);

    if (productError || !products?.length) {
      console.error(
        '[create-order] product fetch failed — supabaseError:', productError,
        '| items received:', JSON.stringify(items),
        '| productIds queried:', JSON.stringify(productIds),
        '| rows returned:', products?.length ?? 0,
      );
      return Response.json({ error: 'Failed to fetch product prices' }, { status: 500 });
    }

    const priceMap: Record<string, number> = Object.fromEntries(
      (products as Array<{ id: string; selling_price: number }>).map(p => [p.id, p.selling_price])
    );

    let subtotal = 0;
    for (const item of items as Array<{ id: string; quantity: number }>) {
      const price = priceMap[item.id];
      if (price == null) return Response.json({ error: `Product not found: ${item.id}` }, { status: 400 });
      subtotal += price * item.quantity;
    }

    // Delivery charge from DB
    const { data: deliverySlabs } = await supabase
      .from('delivery_charges')
      .select('free_delivery_above, charge')
      .eq('is_active', true)
      .not('free_delivery_above', 'is', null);

    let deliveryCharge = 20;
    if (deliverySlabs?.length) {
      const threshold = Math.min(...(deliverySlabs as any[]).map(r => r.free_delivery_above as number));
      if (subtotal >= threshold) {
        deliveryCharge = 0;
      } else {
        const row = (deliverySlabs as any[]).find(r => r.free_delivery_above === threshold);
        deliveryCharge = row?.charge ?? 20;
      }
    }

    // Validate and apply offer from DB
    let discountAmount = 0;
    if (offerId) {
      const now = new Date().toISOString();
      const { data: offer } = await supabase
        .from('offers')
        .select('*')
        .eq('id', offerId)
        .eq('is_active', true)
        .eq('type', 'platform')
        .lte('starts_at', now)
        .gte('ends_at', now)
        .lte('min_order_amount', subtotal)
        .single();

      if (offer) {
        if (offer.discount_type === 'flat') {
          discountAmount = Number(offer.discount_value);
        } else {
          const pct = (subtotal * Number(offer.discount_value)) / 100;
          discountAmount = offer.max_discount ? Math.min(pct, Number(offer.max_discount)) : pct;
        }
        discountAmount = Math.round(discountAmount);
      }
    }

    const total = subtotal + deliveryCharge - discountAmount;

    if (total < 1 || total > MAX_ORDER_AMOUNT) {
      return Response.json({ error: 'Invalid order amount' }, { status: 400 });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const order = await razorpay.orders.create({
      amount: Math.round(total * 100),
      currency: 'INR',
      receipt: `vm_${Date.now()}`,
    });

    return Response.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      breakdown: { subtotal, deliveryCharge, discountAmount, total },
    });
  } catch (err) {
    console.error('Razorpay error:', err);
    return Response.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
