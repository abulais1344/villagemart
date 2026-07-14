import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createOrderFromPayment } from '@/lib/orders/createOrderFromPayment';

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

    // Verify HMAC signature
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    const { orderId } = await createOrderFromPayment(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      {
        items: (orderData.items as any[]).map((i: any) => ({ id: i.id, quantity: i.quantity })),
        customer: {
          id: orderData.customerId ?? orderData.customer?.id ?? null,
          name: orderData.customer.name,
          phone: orderData.customer.phone,
          address: orderData.customer.address,
          landmark: orderData.customer.landmark,
          area: orderData.customer.area,
        },
        merchantId: orderData.merchantId ?? null,
        offerId: orderData.offerId ?? null,
      },
      'client',
    );

    return NextResponse.json({ success: true, orderId });
  } catch (error) {
    console.error('[verify-payment] error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
