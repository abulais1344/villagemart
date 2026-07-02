import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { sendWhatsAppNotification } from '@/lib/whatsapp';
import webpush from 'web-push';

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderData,
    } = await request.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing payment parameters' }, { status: 400 });
    }

    // Verify signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    console.log('[verify-payment] orderData:', JSON.stringify(orderData));

    // ── Resolve commission rate (priority: merchant rule → global rule → merchant record → 10%) ──
    let commissionRatePct = 10;
    const merchantId = orderData.merchantId || null;

    if (merchantId) {
      const { data: merchantRule } = await supabase
        .from('commissions')
        .select('rate')
        .eq('type', 'merchant')
        .eq('reference_id', merchantId)
        .eq('is_active', true)
        .limit(1)
        .single();

      if (merchantRule) {
        commissionRatePct = merchantRule.rate;
      } else {
        const { data: globalRule } = await supabase
          .from('commissions')
          .select('rate')
          .eq('type', 'global')
          .eq('is_active', true)
          .limit(1)
          .single();

        if (globalRule) {
          commissionRatePct = globalRule.rate;
        } else {
          const { data: merchantRecord } = await supabase
            .from('merchants')
            .select('commission_rate')
            .eq('id', merchantId)
            .single();

          if (merchantRecord?.commission_rate != null) {
            commissionRatePct = merchantRecord.commission_rate;
          }
        }
      }
    } else {
      // No merchant — check global rule only
      const { data: globalRule } = await supabase
        .from('commissions')
        .select('rate')
        .eq('type', 'global')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (globalRule) commissionRatePct = globalRule.rate;
    }

    const subtotalForCommission = orderData.subtotal ?? orderData.total;
    const commission_amount = subtotalForCommission * (commissionRatePct / 100);

    console.log('[verify-payment] commission rate:', commissionRatePct, 'on subtotal:', subtotalForCommission, '= commission:', commission_amount);

    const insertPayload = {
      order_number: `VM${Date.now()}`,
      customer_id: orderData.customerId || null,
      customer_name: orderData.customer.name,
      customer_phone: orderData.customer.phone,
      merchant_id: orderData.merchantId || null,
      delivery_address: {
        name: orderData.customer.name,
        phone: orderData.customer.phone,
        address: orderData.customer.address,
        landmark: orderData.customer.landmark || '',
        area: orderData.customer.area,
      },
      subtotal: orderData.subtotal,
      delivery_charge: orderData.deliveryCharge ?? 0,
      total_amount: orderData.total,
      tax_amount: 0,
      discount_amount: orderData.discountAmount ?? 0,
      commission_amount,
      payment_status: 'paid',
      razorpay_order_id,
      razorpay_payment_id,
      status: 'pending',
      delivery_type: 'delivery',
      notes: orderData.customer.landmark || '',
    };

    console.log('[verify-payment] inserting order:', JSON.stringify(insertPayload));

    // Save order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(insertPayload)
      .select()
      .single();

    if (orderError) {
      console.error('[verify-payment] order insert error:', orderError);
      return NextResponse.json({ error: orderError.message, details: orderError }, { status: 500 });
    }
    if (!order) {
      console.error('[verify-payment] order insert returned no data');
      return NextResponse.json({ error: 'Failed to save order' }, { status: 500 });
    }

    // Insert order items
    const orderItems = orderData.items.map((item: any) => ({
      order_id: order.id,
      product_id: item.id,
      product_snapshot: {
        name: item.name,
        price: item.selling_price,
        image: item.images?.[0] ?? null,
        unit: item.unit ?? 'piece',
      },
      quantity: item.quantity,
      unit_price: item.selling_price,
      total_price: item.selling_price * item.quantity,
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
    if (itemsError) {
      console.error('Order items insert error:', itemsError);
    }

    // Fire-and-forget admin WhatsApp notification
    ;(async () => {
      try {
        const adminPhone = process.env.ADMIN_WHATSAPP_NUMBER;
        if (!adminPhone) return;

        let storeName = 'Zupr';
        if (orderData.merchantId) {
          const { data: merchant } = await supabase
            .from('merchants')
            .select('store_name')
            .eq('id', orderData.merchantId)
            .single();
          if (merchant?.store_name) storeName = merchant.store_name;
        }

        const shortId = order.id.slice(-6).toUpperCase();
        const itemCount = (orderData.items as any[]).reduce((sum: number, item: any) => sum + item.quantity, 0);
        const addrParts = [
          orderData.customer.address,
          orderData.customer.landmark,
          orderData.customer.area,
        ].filter(Boolean).join(', ');

        const body = [
          '🛒 New Order Received!',
          `Order #${shortId}`,
          `Customer: ${orderData.customer.name} — ${orderData.customer.phone}`,
          `Merchant: ${storeName}`,
          `Items: ${itemCount}`,
          `Amount: ₹${orderData.total}`,
          `Address: ${addrParts}`,
          '',
          'View: https://zupr.in/admin-login',
        ].join('\n');

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken  = process.env.TWILIO_AUTH_TOKEN;
        const from       = process.env.TWILIO_WHATSAPP_FROM;

        await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: 'Basic ' + btoa(`${accountSid}:${authToken}`),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ From: from!, To: `whatsapp:+${adminPhone}`, Body: body }),
          }
        );
      } catch (err) {
        console.error('Admin WhatsApp notification failed:', err);
      }
    })();

    // Fire-and-forget merchant push notification
    ;(async () => {
      try {
        if (!orderData.merchantId) return;
        const { data: merchant } = await supabase
          .from('merchants')
          .select('push_subscription')
          .eq('id', orderData.merchantId)
          .single();
        if (!merchant?.push_subscription) return;

        const shortId = order.id.slice(-6).toUpperCase();
        const itemCount = (orderData.items as any[]).reduce((sum: number, item: any) => sum + item.quantity, 0);
        const payload = JSON.stringify({
          title: '🛍️ New Order!',
          body: `Order #${shortId} • ₹${orderData.total} • ${itemCount} item${itemCount !== 1 ? 's' : ''}`,
        });

        webpush.sendNotification(merchant.push_subscription as webpush.PushSubscription, payload)
          .catch((err: unknown) => console.error('Merchant push failed:', err));
      } catch (err) {
        console.error('Merchant push notification error:', err);
      }
    })();

    // Fire-and-forget WhatsApp notification on order placement
    if (order.customer_phone) {
      const shortId = order.id.slice(0, 8).toUpperCase();
      const message = `🛍️ Order received! Your Zupr order of ₹${order.total_amount} has been placed successfully. We'll notify you once it's confirmed. Order ID: #${shortId}`;
      (async () => {
        try {
          await sendWhatsAppNotification(order.customer_phone, message);
        } catch (err) {
          console.error('[whatsapp] order placement notification failed:', err);
        }
      })();
    }

    return NextResponse.json({ success: true, orderId: order.id });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
