import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature') ?? '';
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(body);
    const supabase = await createServiceClient();

    switch (event.event) {
      case 'payment.captured': {
        const payment = event.payload.payment.entity;
        await supabase
          .from('payments')
          .update({ status: 'paid', razorpay_payment_id: payment.id })
          .eq('razorpay_order_id', payment.order_id);
        break;
      }

      case 'payment.failed': {
        const payment = event.payload.payment.entity;
        await supabase
          .from('payments')
          .update({ status: 'failed' })
          .eq('razorpay_order_id', payment.order_id);
        await supabase
          .from('orders')
          .update({ payment_status: 'failed', status: 'cancelled' })
          .eq('razorpay_order_id', payment.order_id);
        break;
      }

      case 'refund.created': {
        const refund = event.payload.refund.entity;
        await supabase
          .from('payments')
          .update({
            status: 'refunded',
            refund_id: refund.id,
            refund_amount: refund.amount / 100,
            refunded_at: new Date().toISOString(),
          })
          .eq('razorpay_payment_id', refund.payment_id);
        await supabase
          .from('orders')
          .update({ payment_status: 'refunded', status: 'refunded' })
          .eq('razorpay_payment_id', refund.payment_id);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
