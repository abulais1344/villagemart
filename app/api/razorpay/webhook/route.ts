import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { createOrderFromPayment } from '@/lib/orders/createOrderFromPayment';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature') ?? '';

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(body);

    switch (event.event) {
      case 'payment.captured': {
        const payment = event.payload.payment.entity;
        const razorpay_payment_id: string = payment.id;
        const razorpay_order_id: string   = payment.order_id;
        const notes: Record<string, string> = payment.notes ?? {};

        // Parse notes attached by /api/razorpay/create-order
        if (!notes.items || !notes.customer_phone) {
          // Order predates the notes feature — nothing to reconstruct, log and skip
          console.warn(`[webhook] payment.captured for ${razorpay_payment_id}: no order notes found — skipping safety-net creation`);
          break;
        }

        const items = notes.items.split('|').filter(Boolean).map((s: string) => {
          const [id, q] = s.split(':');
          return { id, quantity: parseInt(q, 10) };
        });

        const orderData = {
          items,
          customer: {
            id:       notes.customer_id || null,
            name:     notes.customer_name,
            phone:    notes.customer_phone,
            address:  notes.customer_address,
            landmark: notes.customer_landmark || null,
            area:     notes.customer_area || null,
          },
          merchantId: notes.merchant_id || null,
          offerId:    notes.offer_id    || null,
        };

        // createOrderFromPayment is idempotent — if verify-payment already ran, this is a no-op
        await createOrderFromPayment(razorpay_order_id, razorpay_payment_id, '', orderData, 'webhook');
        break;
      }

      case 'payment.failed': {
        const payment = event.payload.payment.entity;
        const razorpay_payment_id: string = payment.id;
        const razorpay_order_id: string   = payment.order_id;

        // Update only the row for this specific payment attempt — not every payment on the order
        await supabase
          .from('payments')
          .update({ status: 'failed' })
          .eq('razorpay_payment_id', razorpay_payment_id);

        // Only downgrade to cancelled if the order is still pending AND payment not already
        // confirmed as paid. Guards two independent race conditions:
        //   1. order.status: a merchant/admin action already moved the order forward
        //   2. payment_status: a payment.captured webhook already marked this order paid —
        //      a late-arriving payment.failed (for a duplicate/abandoned attempt on the same
        //      Razorpay order) must never overwrite a correctly-set 'paid' status.
        const { data: order } = await supabase
          .from('orders')
          .select('id, status, payment_status')
          .eq('razorpay_order_id', razorpay_order_id)
          .single();

        if (!order) break;

        if (order.status !== 'pending' || order.payment_status === 'paid') {
          console.warn(
            `[webhook] payment.failed for ${razorpay_payment_id} ignored — order ${order.id} has status '${order.status}', payment_status '${order.payment_status}'`,
          );
          break;
        }

        await supabase
          .from('orders')
          .update({ payment_status: 'failed', status: 'cancelled' })
          .eq('id', order.id);

        break;
      }

      case 'refund.created': {
        const refund = event.payload.refund.entity;
        await supabase.from('payments').update({
          status: 'refunded',
          refund_id: refund.id,
          refund_amount: refund.amount / 100,
          refunded_at: new Date().toISOString(),
        }).eq('razorpay_payment_id', refund.payment_id);
        await supabase.from('orders').update({ payment_status: 'refunded', status: 'refunded' }).eq('razorpay_payment_id', refund.payment_id);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[webhook] error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
