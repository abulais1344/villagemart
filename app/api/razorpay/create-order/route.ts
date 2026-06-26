import { NextRequest } from 'next/server';
import Razorpay from 'razorpay';

const MAX_ORDER_AMOUNT = 50_000; // ₹50,000 sanity cap

export async function POST(request: NextRequest) {
  try {
    const { amount } = await request.json();

    if (!amount || typeof amount !== 'number' || amount < 1 || amount > MAX_ORDER_AMOUNT) {
      return Response.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // rupees → paise
      currency: 'INR',
      receipt: `vm_${Date.now()}`,
    });

    return Response.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (err) {
    console.error('Razorpay error:', err);
    return Response.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
