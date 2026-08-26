import { createClient } from '@supabase/supabase-js';
import { sendWhatsAppNotification, sendAdminWhatsApp } from '@/lib/whatsapp';
import { sendAdminOrderEmail } from '@/lib/email';
import { generateOrderActionToken } from './orderActionToken';
import { getActiveDeliverySlabs } from '@/lib/utils/getActiveDeliverySlabs';
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
  lat?: number | null;
  lng?: number | null;
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
  const merchantTypeFetch = data.merchantId
    ? supabase.from('merchants').select('merchant_type').eq('id', data.merchantId).single()
    : Promise.resolve({ data: null as null });
  const [productsRes, sodaRes, merchantTypeRes] = await Promise.all([
    supabase.from('vm_products').select('id, selling_price, name, is_promo_item, merchant_id').in('id', itemIds),
    supabase.from('admin_settings').select('iday_soda_threshold_1, iday_soda_qty_1, iday_soda_threshold_2, iday_soda_qty_2, iday_soda_starts_at, iday_soda_ends_at, iday_soda_is_active').eq('id', 1).single(),
    merchantTypeFetch,
  ]);
  const { data: dbProducts, error: productsError } = productsRes;
  const sodaSettings = sodaRes.data;
  const merchantType = (merchantTypeRes.data as any)?.merchant_type ?? null;

  if (productsError || !dbProducts) {
    throw new Error(`[createOrderFromPayment] vm_products fetch failed: ${productsError?.message}`);
  }

  const dbPriceMap: Record<string, number> = Object.fromEntries(dbProducts.map((p: any) => [p.id, p.selling_price]));
  const dbNameMap:  Record<string, string> = Object.fromEntries(dbProducts.map((p: any) => [p.id, p.name]));
  const promoSet = new Set<string>(dbProducts.filter((p: any) => p.is_promo_item && p.merchant_id === data.merchantId).map((p: any) => p.id));

  // Soda promo: determine earned qty (fresh date check, allow-list by merchant_type)
  const sodaApplies = (merchantType === 'restaurant' || merchantType === 'bakery') && !!sodaSettings && sodaSettings.iday_soda_is_active !== false;
  let earnedPromoQty = 0;
  if (sodaApplies) {
    const now = new Date().toISOString();
    const s = sodaSettings!;
    const promoActive =
      (!s.iday_soda_starts_at || s.iday_soda_starts_at <= now) &&
      (!s.iday_soda_ends_at   || s.iday_soda_ends_at   >= now);
    if (promoActive) {
      const eligibleSubtotal = data.items
        .filter(i => !promoSet.has(i.id))
        .reduce((acc, i) => acc + (dbPriceMap[i.id] ?? 0) * i.quantity, 0);
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
  let serverSubtotal = 0;
  let remainingEarned = earnedPromoQty;
  for (const item of data.items) {
    if (promoSet.has(item.id)) {
      const freeUnits = Math.min(item.quantity, remainingEarned);
      remainingEarned -= freeUnits;
      serverSubtotal += (dbPriceMap[item.id] ?? 0) * (item.quantity - freeUnits);
    } else {
      serverSubtotal += (dbPriceMap[item.id] ?? 0) * item.quantity;
    }
  }

  // ── Delivery charge ────────────────────────────────────────────────────────
  const deliverySlabs = await getActiveDeliverySlabs(supabase, merchantType ?? null);

  let serverDeliveryCharge = 20;
  if (deliverySlabs.length) {
    const flatSlab = deliverySlabs.find(r => r.free_delivery_above === null);
    if (flatSlab) {
      // Category-specific flat charge — applies unconditionally regardless of subtotal
      serverDeliveryCharge = flatSlab.charge;
    } else {
      const threshold = Math.min(...deliverySlabs.map(r => r.free_delivery_above as number));
      serverDeliveryCharge = serverSubtotal >= threshold
        ? 0
        : (deliverySlabs.find(r => r.free_delivery_above === threshold)?.charge ?? 20);
    }
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
        lat: data.customer.lat ?? null,
        lng: data.customer.lng ?? null,
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
  let orderItemsEarned = earnedPromoQty;
  const orderItems = data.items.map(item => {
    const dbPrice = dbPriceMap[item.id] ?? 0;
    if (promoSet.has(item.id)) {
      const freeUnits = Math.min(item.quantity, orderItemsEarned);
      orderItemsEarned -= freeUnits;
      return {
        order_id: order.id,
        product_id: item.id,
        product_snapshot: { name: dbNameMap[item.id], price: dbPrice, image: null, unit: 'piece' },
        quantity: item.quantity,
        unit_price: 0,
        total_price: dbPrice * (item.quantity - freeUnits),
      };
    }
    return {
      order_id: order.id,
      product_id: item.id,
      product_snapshot: { name: dbNameMap[item.id], price: dbPrice, image: null, unit: 'piece' },
      quantity: item.quantity,
      unit_price: dbPrice,
      total_price: dbPrice * item.quantity,
    };
  });

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

  // Rider auto-assign + immediate full-detail notification to the assigned rider
  ;(async () => {
    try {
      const { data: rider } = await supabase
        .from('vm_riders')
        .select('id, fcm_token, push_subscription')
        .eq('is_active', true)
        .limit(1)
        .single();
      if (!rider) return;

      await supabase.from('orders').update({ rider_id: rider.id }).eq('id', order.id);

      const shortId    = order.id.slice(-6).toUpperCase();
      const itemCount  = data.items.reduce((s, i) => s + i.quantity, 0);
      let storeName    = 'Restaurant';
      if (merchantId) {
        const { data: m } = await supabase.from('merchants').select('store_name').eq('id', merchantId).single();
        if (m?.store_name) storeName = m.store_name;
      }

      // FCM — full-screen alert on the rider's Android app (data-only so
      // RiderMessagingService.onMessageReceived fires even when app is killed)
      if (rider.fcm_token) {
        const { getMessaging } = await import('@/lib/firebase/admin');
        getMessaging()
          .send({
            token: rider.fcm_token,
            data: {
              type:       'new_order_assigned',
              orderId:    order.id,
              shortId,
              storeName,
              itemCount:  String(itemCount),
            },
            android: { priority: 'high' },
          })
          .catch((err: unknown) => console.error('[createOrderFromPayment] rider FCM failed:', err));
      }

      // Web push fallback — for riders still on the PWA (no Android app installed)
      if (rider.push_subscription) {
        webpush.setVapidDetails(
          process.env.VAPID_EMAIL!,
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
          process.env.VAPID_PRIVATE_KEY!,
        );
        const subs: any[] = Array.isArray(rider.push_subscription)
          ? rider.push_subscription
          : [rider.push_subscription];
        await Promise.allSettled(
          subs.map(sub =>
            webpush
              .sendNotification(
                sub as webpush.PushSubscription,
                JSON.stringify({
                  title: '🛵 New order assigned!',
                  body:  `#${shortId} · ${storeName} · ${itemCount} item${itemCount !== 1 ? 's' : ''}`,
                  data:  { url: `/rider/delivery/${order.id}` },
                }),
              )
              .catch(err =>
                console.error('[createOrderFromPayment] rider web-push failed:', err?.statusCode ?? err),
              ),
          ),
        );
      }
    } catch (err) { console.error('[createOrderFromPayment] rider auto-assign failed:', err); }
  })();

  // Admin WhatsApp
  ;(async () => {
    try {
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
      await sendAdminWhatsApp(body);
    } catch (err) { console.error('[createOrderFromPayment] admin WhatsApp failed:', err); }
  })();

  // Admin email (backup channel, independent of WhatsApp)
  ;(async () => {
    try {
      let storeName = 'Zupr';
      if (merchantId) {
        const { data: m } = await supabase.from('merchants').select('store_name').eq('id', merchantId).single();
        if (m?.store_name) storeName = m.store_name;
      }
      const addrParts = [data.customer.address, data.customer.landmark, data.customer.area].filter(Boolean).join(', ');
      await sendAdminOrderEmail({
        orderId: order.id,
        storeName,
        customerName: data.customer.name,
        customerPhone: data.customer.phone,
        deliveryAddress: addrParts,
        items: data.items.map(i => ({
          name: dbNameMap[i.id] ?? i.id,
          quantity: i.quantity,
          unitPrice: dbPriceMap[i.id] ?? 0,
        })),
        subtotal: serverSubtotal,
        deliveryCharge: serverDeliveryCharge,
        discountAmount: serverDiscountAmount,
        total: serverTotal,
        source,
      });
    } catch (err) { console.error('[createOrderFromPayment] admin email failed:', err); }
  })();

  // Admin push notification
  ;(async () => {
    try {
      const { data: adminSettings } = await supabase
        .from('admin_settings')
        .select('push_subscription')
        .eq('id', 1)
        .single();
      if (!adminSettings?.push_subscription) return;

      let storeName = 'Zupr';
      if (merchantId) {
        const { data: m } = await supabase.from('merchants').select('store_name').eq('id', merchantId).single();
        if (m?.store_name) storeName = m.store_name;
      }

      const shortId = order.id.slice(-6).toUpperCase();
      const itemCount = data.items.reduce((s, i) => s + i.quantity, 0);

      webpush.setVapidDetails(process.env.VAPID_EMAIL!, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
      await webpush.sendNotification(
        adminSettings.push_subscription as webpush.PushSubscription,
        JSON.stringify({
          title: '🛒 New Order!',
          body: `#${shortId} · ${storeName} · ₹${serverTotal} · ${itemCount} item${itemCount !== 1 ? 's' : ''}`,
          data: { url: '/admin/orders' },
        }),
      );
    } catch (err) { console.error('[createOrderFromPayment] admin push failed:', err); }
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

  // Merchant push notification — Web Push (browser/PWA) + FCM (Capacitor Android)
  ;(async () => {
    try {
      if (!merchantId) return;
      const { data: merchant } = await supabase
        .from('merchants')
        .select('push_subscription, fcm_token')
        .eq('id', merchantId)
        .single();

      const shortId = order.id.slice(-6).toUpperCase();
      const itemCount = data.items.reduce((s, i) => s + i.quantity, 0);
      const payout = Math.round(serverSubtotal * (1 - commissionRatePct / 100));
      const title = '🛍️ New Order!';
      const body = `Order #${shortId} • Payout ₹${payout} • ${itemCount} item${itemCount !== 1 ? 's' : ''}`;

      // Web Push — browser and PWA users
      if (merchant?.push_subscription) {
        webpush.setVapidDetails(process.env.VAPID_EMAIL!, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
        webpush
          .sendNotification(
            merchant.push_subscription as webpush.PushSubscription,
            JSON.stringify({ title, body }),
            { urgency: 'high', TTL: 300 },
          )
          .catch((err: unknown) => console.error('[createOrderFromPayment] merchant web-push failed:', err));
      }

      // FCM — data-only so MerchantMessagingService.onMessageReceived always fires,
      // even when the app is killed (notification payloads bypass onMessageReceived).
      if (merchant?.fcm_token) {
        const { getMessaging } = await import('@/lib/firebase/admin');
        const itemsSummary = data.items
          .map(i => `${i.quantity}× ${dbNameMap[i.id] ?? i.id}`)
          .join(', ');
        getMessaging()
          .send({
            token: merchant.fcm_token,
            data: {
              type: 'new_order',
              orderId: order.id,
              shortId,
              customerName: data.customer.name,
              customerPhone: data.customer.phone ?? '',
              area: data.customer.area ?? '',
              address: data.customer.address ?? '',
              landmark: data.customer.landmark ?? '',
              itemsSummary,
              // toFixed(2): exact decimal payout matching the web dashboard's earn() formula.
              // String(payout) used above is Math.round() and loses the cents (e.g. 13.95 → "14").
              payout: (serverSubtotal * (1 - commissionRatePct / 100)).toFixed(2),
              acceptToken: generateOrderActionToken(order.id, 'accept'),
              rejectToken: generateOrderActionToken(order.id, 'reject'),
            },
            android: { priority: 'high' },
          })
          .catch((err: unknown) => console.error('[createOrderFromPayment] merchant FCM failed:', err));
      }
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
