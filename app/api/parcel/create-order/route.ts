import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function getISTHoursMinutes(): { h: number; m: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const h = parseInt(parts.find(p => p.type === 'hour')!.value);
  const m = parseInt(parts.find(p => p.type === 'minute')!.value);
  return { h, m };
}

function getISTDateString(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { merchantId, customer_name, customer_phone, destination_area, delivery_address, items } = body;

  // Basic input validation
  if (!merchantId || !customer_name?.trim() || !customer_phone?.trim() ||
      !destination_area?.trim() || !delivery_address?.trim() || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!/^[6-9]\d{9}$/.test(customer_phone.replace(/\s/g, ''))) {
    return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
  }

  // Fetch merchant — validate parcel feature enabled
  const { data: merchant, error: merchantErr } = await supabase
    .from('merchants')
    .select('id, store_name, phone, parcel_service_enabled, parcel_delivery_charge, parcel_order_cutoff_time, commission_rate')
    .eq('id', merchantId)
    .single();

  if (merchantErr || !merchant || !merchant.parcel_service_enabled) {
    return NextResponse.json({ error: 'Parcel orders not available for this merchant' }, { status: 403 });
  }

  // Server-side cutoff check (IST)
  const cutoffStr: string = merchant.parcel_order_cutoff_time ?? '17:30:00';
  const [cutH, cutM] = cutoffStr.slice(0, 5).split(':').map(Number);
  const { h: nowH, m: nowM } = getISTHoursMinutes();
  const pastCutoff = nowH > cutH || (nowH === cutH && nowM >= cutM);
  if (pastCutoff) {
    return NextResponse.json({ error: `Ordering closed for today. Reopens tomorrow at ${cutoffStr.slice(0, 5)}.` }, { status: 400 });
  }

  // Fetch current prices server-side — never trust client-submitted prices
  const productIds: string[] = items.map((i: any) => i.id);
  const { data: dbProducts } = await supabase
    .from('vm_products')
    .select('id, name, selling_price, is_active')
    .in('id', productIds)
    .eq('merchant_id', merchantId)
    .eq('is_active', true);

  const priceMap = Object.fromEntries((dbProducts ?? []).map((p: any) => [p.id, p]));

  // Build verified items snapshot and compute subtotal
  const verifiedItems: Array<{ id: string; name: string; quantity: number; unit_price: number }> = [];
  let subtotal = 0;

  for (const item of items) {
    const dbProduct = priceMap[item.id];
    if (!dbProduct) continue; // skip unknown / inactive products
    const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
    const unit_price = dbProduct.selling_price;
    verifiedItems.push({ id: item.id, name: dbProduct.name, quantity, unit_price });
    subtotal += unit_price * quantity;
  }

  if (verifiedItems.length === 0) {
    return NextResponse.json({ error: 'No valid items found' }, { status: 400 });
  }

  const PARCEL_MIN_SUBTOTAL = 1000;
  if (subtotal < PARCEL_MIN_SUBTOTAL) {
    return NextResponse.json(
      { error: `Parcel orders require a minimum of ₹${PARCEL_MIN_SUBTOTAL}. Your subtotal is ₹${subtotal}.` },
      { status: 400 },
    );
  }

  const commissionRate = merchant.commission_rate ?? 7;
  const commission_amount = Math.round(subtotal * commissionRate / 100 * 100) / 100;
  const delivery_charge = merchant.parcel_delivery_charge ?? 150;
  const order_date = getISTDateString();

  // Insert into parcel_orders
  const { data: order, error: insertErr } = await supabase
    .from('parcel_orders')
    .insert({
      merchant_id: merchantId,
      destination_area: destination_area.trim(),
      customer_name: customer_name.trim(),
      customer_phone: customer_phone.replace(/\s/g, ''),
      delivery_address: delivery_address.trim(),
      items: verifiedItems,
      subtotal,
      delivery_charge,
      commission_amount,
      status: 'pending',
      order_date,
    })
    .select('id, subtotal, delivery_charge, commission_amount, customer_name, destination_area')
    .single();

  if (insertErr || !order) {
    console.error('[parcel/create-order] insert failed:', insertErr?.message);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }

  // Fire-and-forget: WhatsApp notification to admin
  ;(async () => {
    try {
      const adminPhone = process.env.ADMIN_WHATSAPP_NUMBER;
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken  = process.env.TWILIO_AUTH_TOKEN;
      const from       = process.env.TWILIO_WHATSAPP_FROM;
      if (!adminPhone || !accountSid || !authToken || !from) return;

      const shortId = order.id.slice(-6).toUpperCase();
      const itemLines = verifiedItems
        .map(i => `  • ${i.name} ×${i.quantity} — ₹${i.unit_price * i.quantity}`)
        .join('\n');

      const msgBody = [
        `🚚 PARCEL ORDER — ${destination_area.trim()} — ${merchant.store_name}`,
        `Order #${shortId}`,
        ``,
        `👤 Customer: ${customer_name.trim()} (${customer_phone.replace(/\s/g, '')})`,
        `📦 Address: ${delivery_address.trim()}`,
        ``,
        `📋 Items:\n${itemLines}`,
        ``,
        `💰 Subtotal: ₹${subtotal} | Delivery: ₹${delivery_charge} | Platform commission: ₹${commission_amount.toFixed(2)}`,
        `📅 Order date: ${order_date} (cutoff was ${cutoffStr.slice(0, 5)})`,
        ``,
        `Admin: https://zupr.in/admin/parcel-orders`,
      ].join('\n');

      await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: 'Basic ' + btoa(`${accountSid}:${authToken}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ From: from, To: `whatsapp:+${adminPhone}`, Body: msgBody }),
        }
      );
    } catch (err) {
      console.error('[parcel/create-order] admin WhatsApp failed:', err);
    }
  })();

  return NextResponse.json({ success: true, order });
}
