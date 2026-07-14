import { createClient } from '@supabase/supabase-js';
import { sendWhatsAppNotification } from '@/lib/whatsapp';
import webpush from 'web-push';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export interface OrderCustomer {
  id?: string | null;
  name: string;
  phone: string;
  address: string;
  landmark?: string | null;
  area?: string | null;
}

export interface OrderCreationData {
  items: Array<{ id: string; quantity: number }>;
  customer: OrderCustomer;
  merchantId: string | null;
  offerId: string | null;
}

export interface CreateOrderResult {
  orderId: string;
  /** false when the order already existed — safe to ignore, idempotency handled */
  created: boolean;
}

/**
 * Creates an order from a verified Razorpay payment.
 * Idempotent: checks for an existing order by razorpay_payment_id first.
 * Called by both verify-payment (client-initiated) and the webhook (server-initiated).
 *
 * @param razorpay_signature  Pass '' when called from the webhook (signature not available
 *                            server-side; webhook authenticity is already verified at route level).
 * @param source              'client' | 'webhook' | 'recovery' — logged only.
 */
export async function createOrderFromPayment(
  razorpay_order_id: string,
  razorpay_payment_id: string,
  razorpay_signature: string,
  data: OrderCreationData,
  source: 'client' | 'webhook' | 'recovery' = 'client',
): Promise<CreateOrderResult> {

  // ── Idempotency check ──────────────────────────────────────────────────────
  const { data: existing } = await supabase
    .from('orders')
    .select('id')
    .eq('razorpay_payment_id', razorpay_payment_id)
    .maybeSingle();

  if (existing) {
    console.log(`[createOrderFromPayment][${source}] order already exists for payment ${razorpay_payment_id} → ${existing.id}`);
    return { orderId: existing.id, created: false };
  }

  // ── Server-side price recompute ────────────────────────────────────────────
  const itemIds = data.items.map(i => i.id);
  const { data: dbProducts, error: productsError } = await supabase
    .from('vm_products')
    .select('id, selling_price, name')
    .in('id', itemIds);

  if (productsError || !dbProducts) {
    throw new Error(`[createOrderFromPayment] vm_products fetch failed: ${productsError?.message}`);
  }

  const dbPriceMap: Record<string, number> = Object.fromEntries(dbProducts.map((p: any) => [p.id, p.selling_price]));
  const dbNameMap:  Record<string, string> = Object.fromEntries(dbProducts.map((p: any) => [p.id, p.name]));

  let serverSubtotal = 0;
  for (const item of data.items) {
    serverSubtotal += (dbPriceMap[item.id] ?? 0) * item.quantity;
  }

  // ── Delivery charge ────────────────────────────────────────────────────────
  const { data: deliverySlabs } = await supabase
    .from('delivery_charges')
    .select('free_delivery_above, charge')
    .eq('is_active', true)
    .not('free_delivery_above', 'is', null);

  let serverDeliveryCharge = 20;
  if (deliverySlabs?.length) {
    const threshold = Math.min(...(deliverySlabs as any[]).map((r: any) => r.free_delivery_above as number));
    serverDeliveryCharge = serverSubtotal >= threshold
      ? 0
      : ((deliverySlabs as any[]).find((r: any) => r.free_delivery_above === threshold)?.charge ?? 20);
  }

  // ── Offer / discount ───────────────────────────────────────────────────────
  let serverDiscountAmount = 0;
  if (data.offerId) {
    const now = new Date().toISOString();
    const { data: offer } = await supabase
      .from('offers')
      .select('*')
      .eq('id', data.offerId)
      .eq('is_active', true)
      .eq('type', 'platform')
      .lte('starts_at', now)
      .gte('ends_at', now)
      .lte('min_order_amount', serverSubtotal)
      .single();

    if (offer) {
      const pct = offer.discount_type === 'flat'
        ? Number(offer.discount_value)
        : (serverSubtotal * Number(offer.discount_value)) / 100;
      serverDiscountAmount = Math.round(
        offer.max_discount ? Math.min(pct, Number(offer.max_discount)) : pct
      );
    }
  }

  const serverTotal = serverSubtotal + serverDeliveryCharge - serverDiscountAmount;

  // ── Commission ─────────────────────────────────────────────────────────────
  let commissionRatePct = 10;
  const { merchantId } = data;

  if (merchantId) {
    const { data: merchantRule } = await supabase
      .from('commissions').select('rate')
      .eq('type', 'merchant').eq('reference_id', merchantId).eq('is_active', true)
      .limit(1).single();

    if (merchantRule) {
      commissionRatePct = merchantRule.rate;
    } else {
      const { data: globalRule } = await supabase
        .from('commissions').select('rate')
        .eq('type', 'global').eq('is_active', true)
        .limit(1).single();

      if (globalRule) {
        commissionRatePct = globalRule.rate;
      } else {
        const { data: merchantRecord } = await supabase
          .from('merchants').select('commission_rate').eq('id', merchantId).single();
        if (merchantRecord?.commission_rate != null) commissionRatePct = merchantRecord.commission_rate;
      }
    }
  } else {
    const { data: globalRule } = await supabase
      .from('commissions').select('rate')
      .eq('type', 'global').eq('is_active', true)
      .limit(1).single();
    if (globalRule) commissionRatePct = globalRule.rate;
  }

  const commission_amount = serverSubtotal * (commissionRatePct / 100);

  // ── Insert order ───────────────────────────────────────────────────────────
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_number: `VM${Date.now()}`,
      customer_id: data.customer.id || null,
      customer_name: data.customer.name,
      customer_phone: data.customer.phone,
      merchant_id: merchantId || null,
      delivery_address: {
        name: data.customer.name,
        phone: data.customer.phone,
        address: data.customer.address,
        landmark: data.customer.landmark || '',
        area: data.customer.area,
      },
      subtotal: serverSubtotal,
      delivery_charge: serverDeliveryCharge,
      total_amount: serverTotal,
      tax_amount: 0,
      discount_amount: serverDiscountAmount,
      commission_amount,
      payment_status: 'paid',
      razorpay_order_id,
      razorpay_payment_id,
      status: 'pending',
      delivery_type: 'delivery',
      notes: data.customer.landmark || '',
    })
    .select()
    .single();

  if (orderError) {
    // Unique constraint violation: another concurrent call just created it
    if ((orderError as any).code === '23505') {
      const { data: raceWinner } = await supabase
        .from('orders').select('id')
        .eq('razorpay_payment_id', razorpay_payment_id).single();
      if (raceWinner) {
        console.log(`[createOrderFromPayment][${source}] race condition resolved — order ${raceWinner.id}`);
        return { orderId: raceWinner.id, created: false };
      }
    }
    throw new Error(`[createOrderFromPayment] order insert failed: ${orderError.message}`);
  }
  if (!order) throw new Error('[createOrderFromPayment] order insert returned no data');

  if (source === 'webhook') {
    console.log(`[createOrderFromPayment][webhook] ⚡ SAFETY NET FIRED — created order ${order.id} for payment ${razorpay_payment_id} that verify-payment apparently missed`);
  } else {
    console.log(`[createOrderFromPayment][${source}] created order ${order.id}`);
  }

  // ── Insert order items ─────────────────────────────────────────────────────
  const orderItems = data.items.map(item => ({
    order_id: order.id,
    product_id: item.id,
    product_snapshot: {
      name: dbNameMap[item.id],
      price: dbPriceMap[item.id],
      image: null,
      unit: 'piece',
    },
    quantity: item.quantity,
    unit_price: dbPriceMap[item.id],
    total_price: dbPriceMap[item.id] * item.quantity,
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
  if (itemsError) console.error('[createOrderFromPayment] order_items insert error:', itemsError);

  // ── Insert payments row ────────────────────────────────────────────────────
  const { error: paymentInsertError } = await supabase.from('payments').insert({
    order_id: order.id,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature, // '' when called from webhook
    amount: serverTotal,
    currency: 'INR',
    status: 'paid',
  });
  if (paymentInsertError) console.error('[createOrderFromPayment] payments insert error:', paymentInsertError);

  // ── Fire-and-forget side effects ───────────────────────────────────────────

  // Rider auto-assign
  ;(async () => {
    try {
      const { data: rider } = await supabase.from('vm_riders').select('id').eq('is_active', true).limit(1).single();
      if (rider) await supabase.from('orders').update({ rider_id: rider.id }).eq('id', order.id);
    } catch (err) { console.error('[createOrderFromPayment] rider auto-assign failed:', err); }
  })();

  // Admin WhatsApp
  ;(async () => {
    try {
      const adminPhone = process.env.ADMIN_WHATSAPP_NUMBER;
      if (!adminPhone) return;
      let storeName = 'Zupr';
      if (merchantId) {
        const { data: m } = await supabase.from('merchants').select('store_name').eq('id', merchantId).single();
        if (m?.store_name) storeName = m.store_name;
      }
      const shortId = order.id.slice(-6).toUpperCase();
      const itemCount = data.items.reduce((s, i) => s + i.quantity, 0);
      const addrParts = [data.customer.address, data.customer.landmark, data.customer.area].filter(Boolean).join(', ');
      const body = [
        `🛒 New Order Received! [via ${source}]`,
        `Order #${shortId}`,
        `Customer: ${data.customer.name} — ${data.customer.phone}`,
        `Merchant: ${storeName}`,
        `Items: ${itemCount}`, `Amount: ₹${serverTotal}`,
        `Address: ${addrParts}`,
        '', 'View: https://zupr.in/admin-login',
      ].join('\n');
      const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: tok, TWILIO_WHATSAPP_FROM: from } = process.env;
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: { Authorization: 'Basic ' + btoa(`${sid}:${tok}`), 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ From: from!, To: `whatsapp:+${adminPhone}`, Body: body }),
      });
    } catch (err) { console.error('[createOrderFromPayment] admin WhatsApp failed:', err); }
  })();

  // Merchant WhatsApp
  ;(async () => {
    try {
      if (!merchantId) return;
      const { data: merchantRecord } = await supabase.from('merchants').select('phone, store_name').eq('id', merchantId).single();
      if (!merchantRecord?.phone) return;
      const rawPhone = String(merchantRecord.phone).replace(/\D/g, '');
      const e164 = rawPhone.startsWith('91') ? rawPhone : `91${rawPhone}`;
      const shortId = order.id.slice(-6).toUpperCase();
      const itemsList = data.items.map(i => `  • ${dbNameMap[i.id]} x${i.quantity} — ₹${(dbPriceMap[i.id] ?? 0) * i.quantity}`).join('\n');
      const merchantPayout = Math.round(serverSubtotal * (1 - commissionRatePct / 100));
      const merchantBody = [
        '🛒 *New Order Received!*', '',
        `Order #${shortId}`,
        `👤 Customer: ${data.customer.name} — ${data.customer.phone}`,
        `📋 Items:\n${itemsList}`,
        `🏠 Address: ${data.customer.address}, ${data.customer.area}`,
        ...(data.customer.landmark ? [`📍 Landmark: ${data.customer.landmark}`] : []),
        '',
        `💰 Your Payout: ₹${merchantPayout} (after ${commissionRatePct}% platform fee)`,
        '', 'Open your portal to accept:', '🌐 zupr.in/merchant-login',
      ].join('\n');
      const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: tok, TWILIO_WHATSAPP_FROM: from } = process.env;
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: { Authorization: 'Basic ' + btoa(`${sid}:${tok}`), 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ From: from!, To: `whatsapp:+${e164}`, Body: merchantBody }),
      });
      if (!res.ok) console.error('[createOrderFromPayment] merchant WhatsApp failed', res.status, await res.text());
    } catch (err) { console.error('[createOrderFromPayment] merchant WhatsApp failed:', err); }
  })();

  // Merchant push notification
  ;(async () => {
    try {
      if (!merchantId) return;
      webpush.setVapidDetails(process.env.VAPID_EMAIL!, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
      const { data: merchant } = await supabase.from('merchants').select('push_subscription').eq('id', merchantId).single();
      if (!merchant?.push_subscription) return;
      const shortId = order.id.slice(-6).toUpperCase();
      const itemCount = data.items.reduce((s, i) => s + i.quantity, 0);
      const payout = Math.round(serverSubtotal * (1 - commissionRatePct / 100));
      webpush.sendNotification(
        merchant.push_subscription as webpush.PushSubscription,
        JSON.stringify({ title: '🛍️ New Order!', body: `Order #${shortId} • Payout ₹${payout} • ${itemCount} item${itemCount !== 1 ? 's' : ''}` })
      ).catch((err: unknown) => console.error('[createOrderFromPayment] merchant push failed:', err));
    } catch (err) { console.error('[createOrderFromPayment] merchant push error:', err); }
  })();

  // Customer WhatsApp
  if (order.customer_phone) {
    const shortId = order.id.slice(-6).toUpperCase();
    ;(async () => {
      try {
        await sendWhatsAppNotification(order.customer_phone, 'pending', data.customer.name, shortId, undefined, serverTotal);
      } catch (err) { console.error('[createOrderFromPayment] customer WhatsApp failed:', err); }
    })();
  }

  return { orderId: order.id, created: true };
}
