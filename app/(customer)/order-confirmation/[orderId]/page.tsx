import { createServiceClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';

export const dynamic = 'force-dynamic';

type OrderItem = {
  product_snapshot: { name: string; price: number };
  quantity: number;
  unit_price: number;
  total_price: number;
};

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const supabase = await createServiceClient();

  // Query 1: order only (no join — foreign key not in schema cache)
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  console.log('[order-confirmation] orderId received:', orderId);
  console.log('[order-confirmation] query result — order:', order ? 'found' : null, 'error:', orderError?.message, 'code:', orderError?.code);

  // Query 2: order items separately
  const { data: rawItems, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId);

  console.log('[order-confirmation] items count:', rawItems?.length, 'error:', itemsError?.message);

  const orderItems = (rawItems ?? []) as OrderItem[];

  // Order not found — show a recoverable fallback
  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-10 text-center">
        <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mb-5">
          <span className="text-4xl">⏳</span>
        </div>
        <h1 className="text-xl font-bold text-[#1A1A1A] mb-2">Order processing…</h1>
        <p className="text-sm text-[#6B7280] mb-1">
          Your payment was received. The order is being confirmed.
        </p>
        <p className="text-xs text-[#9CA3AF] mb-8 font-mono break-all">ref: {orderId}</p>
        <Link
          href="/orders"
          className="block w-full max-w-xs text-center bg-[#7C3AED] text-white rounded-2xl py-3.5 font-semibold text-sm mb-3"
        >
          Check Orders
        </Link>
        <Link
          href="/"
          className="block w-full max-w-xs text-center border-2 border-[#7C3AED] text-[#7C3AED] rounded-2xl py-3.5 font-semibold text-sm"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  const addr = order.delivery_address as {
    name?: string;
    address?: string;
    landmark?: string;
    area?: string;
  } | null;

  const shortId = orderId.slice(0, 8).toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-10">
      {/* Success icon */}
      <CheckCircle2 size={64} className="text-green-500 mb-5" />

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Order Placed!</h1>
      <p className="text-sm text-[#6B7280] mb-1">Your order has been received and is being processed.</p>
      <p className="text-xs text-[#9CA3AF] mb-1">Order #{shortId}</p>
      <p className="text-sm font-semibold text-[#7C3AED] mb-8">{formatCurrency(order.total_amount)}</p>

      <div className="w-full max-w-sm space-y-4">
        {/* Items */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-[#1A1A1A] mb-3">Items ordered</h2>
          <div className="space-y-2">
            {orderItems.length > 0 ? orderItems.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-[#6B7280] flex-1 truncate pr-2">
                  {item.quantity}× {item.product_snapshot?.name ?? 'Item'}
                </span>
                <span className="font-medium text-[#1A1A1A] shrink-0">
                  {formatCurrency(item.total_price)}
                </span>
              </div>
            )) : (
              <p className="text-sm text-[#9CA3AF]">Items will appear shortly</p>
            )}
            <div className="flex justify-between font-bold text-sm border-t border-gray-100 pt-2">
              <span>Total paid</span>
              <span className="text-[#7C3AED]">{formatCurrency(order.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* Delivery address */}
        {addr && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <h2 className="text-sm font-semibold text-[#1A1A1A] mb-2">Delivering to</h2>
            {addr.name && <p className="text-sm font-medium text-[#1A1A1A]">{addr.name}</p>}
            {addr.address && <p className="text-sm text-[#6B7280] mt-0.5">{addr.address}</p>}
            {(addr.landmark || addr.area) && (
              <p className="text-sm text-[#9CA3AF] mt-0.5">
                {[addr.landmark, addr.area].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        )}

        {/* WhatsApp note */}
        <p className="text-xs text-center text-[#6B7280]">
          You'll receive a WhatsApp update when your order is confirmed 📱
        </p>

        {/* Buttons */}
        <Link
          href="/orders"
          className="block w-full text-center bg-[#7C3AED] text-white rounded-2xl py-3.5 font-semibold text-sm"
        >
          Track Orders
        </Link>
        <Link
          href="/"
          className="block w-full text-center border border-gray-300 text-gray-700 rounded-2xl py-3.5 font-semibold text-sm"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
