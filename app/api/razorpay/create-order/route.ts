import { NextRequest } from 'next/server';
import Razorpay from 'razorpay';
import { createClient } from '@supabase/supabase-js';
import { isRestaurantOpen } from '@/lib/utils/restaurant';
import { getActiveDeliverySlabs } from '@/lib/utils/getActiveDeliverySlabs';

const MAX_ORDER_AMOUNT = 50_000;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { items, offerId, merchantId, customer } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'Invalid items' }, { status: 400 });
    }

    // Fetch product prices, soda promo settings, and merchant in parallel — never trust client prices
    const productIds = (items as Array<{ id: string; quantity: number }>).map(i => i.id);
    const merchantFetch = merchantId
      ? supabase.from('merchants').select('opening_time, closing_time, is_open, admin_override, merchant_type').eq('id', merchantId).single()
      : Promise.resolve({ data: null as null, error: null });
    const [productsRes, sodaRes, merchantRes] = await Promise.all([
      supabase.from('vm_products').select('id, selling_price, is_promo_item, merchant_id').in('id', productIds),
      supabase.from('admin_settings').select('iday_soda_threshold_1, iday_soda_qty_1, iday_soda_threshold_2, iday_soda_qty_2, iday_soda_starts_at, iday_soda_ends_at, iday_soda_is_active').eq('id', 1).single(),
      merchantFetch,
    ]);
    const { data: products, error: productError } = productsRes;
    const sodaSettings = sodaRes.data;
    const merchantData = merchantRes.data as any;

    if (productError) {
      console.error(
        '[create-order] vm_products fetch error:', productError,
        '| items received:', JSON.stringify(items),
        '| productIds queried:', JSON.stringify(productIds),
      );
      return Response.json({ error: 'Failed to fetch product prices' }, { status: 500 });
    }

    const priceMap: Record<string, number> = Object.fromEntries(
      (products as Array<{ id: string; selling_price: number }>).map(p => [p.id, p.selling_price])
    );
    const promoSet = new Set<string>(
      (products as Array<{ id: string; is_promo_item?: boolean; merchant_id?: string | null }>)
        .filter(p => p.is_promo_item && p.merchant_id === merchantId)
        .map(p => p.id)
    );

    const missingIds = productIds.filter(id => priceMap[id] == null);
    if (missingIds.length > 0) {
      console.error('[create-order] unknown product ids:', missingIds, '| productIds queried:', productIds);
      return Response.json({ error: `Unknown product ids: ${missingIds.join(', ')}` }, { status: 400 });
    }

    // Server-side restaurant open check — blocks closed-restaurant orders even if the
    // client UI was bypassed or the restaurant closed mid-session after items were added
    if (merchantId && merchantData && !isRestaurantOpen(
      merchantData.opening_time ?? null,
      merchantData.closing_time ?? null,
      merchantData.is_open,
      merchantData.admin_override,
    )) {
      return Response.json(
        { error: 'This restaurant is currently closed. Please try again later.' },
        { status: 409 },
      );
    }

    // Soda promo: determine earned qty (fresh date check, allow-list by merchant_type)
    const merchantType = merchantData?.merchant_type ?? null;
    const sodaApplies = (merchantType === 'restaurant' || merchantType === 'bakery') && !!sodaSettings && sodaSettings.iday_soda_is_active !== false;
    let earnedPromoQty = 0;
    if (sodaApplies) {
      const now = new Date().toISOString();
      const s = sodaSettings!;
      const promoActive =
        (!s.iday_soda_starts_at || s.iday_soda_starts_at <= now) &&
        (!s.iday_soda_ends_at   || s.iday_soda_ends_at   >= now);
      if (promoActive) {
        const eligibleSubtotal = (items as Array<{ id: string; quantity: number }>)
          .filter(i => !promoSet.has(i.id))
          .reduce((acc, i) => acc + priceMap[i.id] * i.quantity, 0);
        const sortedTiers = [
          { threshold: s.iday_soda_threshold_2 ?? 0, qty: s.iday_soda_qty_2 ?? 0 },
          { threshold: s.iday_soda_threshold_1 ?? 0, qty: s.iday_soda_qty_1 ?? 0 },
        ].sort((a, b) => b.threshold - a.threshold);
        for (const tier of sortedTiers) {
          if (eligibleSubtotal >= tier.threshold) { earnedPromoQty = tier.qty; break; }
        }
      }
    }

    // Subtotal: promo items priced at ₹0 for earned qty, full price for any overage
    let subtotal = 0;
    let remainingEarned = earnedPromoQty;
    for (const item of items as Array<{ id: string; quantity: number }>) {
      if (promoSet.has(item.id)) {
        const freeUnits = Math.min(item.quantity, remainingEarned);
        remainingEarned -= freeUnits;
        subtotal += priceMap[item.id] * (item.quantity - freeUnits);
      } else {
        subtotal += priceMap[item.id] * item.quantity;
      }
    }

    // Delivery charge from DB
    const deliverySlabs = await getActiveDeliverySlabs(supabase);

    let deliveryCharge = 20;
    if (deliverySlabs.length) {
      const threshold = Math.min(...deliverySlabs.map(r => r.free_delivery_above as number));
      if (subtotal >= threshold) {
        deliveryCharge = 0;
      } else {
        const row = deliverySlabs.find(r => r.free_delivery_above === threshold);
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

    // Encode items as "id:qty|id:qty" — truncate at item boundaries to stay within Razorpay's 256-char note value limit
    const itemParts = (items as Array<{ id: string; quantity: number }>).map(i => `${i.id}:${i.quantity}`);
    let itemsNote = '';
    for (const part of itemParts) {
      const next = itemsNote ? `${itemsNote}|${part}` : part;
      if (next.length > 256) break;
      itemsNote = next;
    }

    const notes: Record<string, string> = {
      merchant_id:       String(merchantId ?? ''),
      customer_id:       String(customer?.id ?? ''),
      customer_name:     String(customer?.name ?? '').slice(0, 256),
      customer_phone:    String(customer?.phone ?? '').slice(0, 20),
      customer_address:  String(customer?.address ?? '').slice(0, 256),
      customer_landmark: String(customer?.landmark ?? '').slice(0, 256),
      customer_area:     String(customer?.area ?? '').slice(0, 256),
      offer_id:          String(offerId ?? ''),
      items:             itemsNote,
    };

    const order = await razorpay.orders.create({
      amount: Math.round(total * 100),
      currency: 'INR',
      receipt: `vm_${Date.now()}`,
      notes,
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
