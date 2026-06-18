'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, CreditCard } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useAuth } from '@/lib/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { AddressSelector } from '@/components/customer/AddressSelector';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { formatCurrency } from '@/lib/utils/format';
import type { Address } from '@/types';
import type { RazorpayResponse } from '@/types';
import toast from 'react-hot-toast';

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: RazorpayResponse) => void) => void;
    };
  }
}

export default function CheckoutPage() {
  const [mounted, setMounted] = useState(false);
  const { items, getSubtotal, clearCart } = useCartStore();
  const { user } = useAuth();
  const router = useRouter();
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [paying, setPaying] = useState(false);
  const supabase = createClient();
  const subtotal = getSubtotal();
  const deliveryCharge = subtotal >= 299 ? 0 : 20;
  const total = subtotal + deliveryCharge;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  useEffect(() => {
    if (items.length === 0) router.push('/cart');
  }, [items, router]);

  const handlePayment = async () => {
    if (!selectedAddress || !user) {
      toast.error('Please select a delivery address');
      return;
    }

    setPaying(true);

    try {
      // 1. Create Razorpay order
      const res = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.round(total * 100) }), // paise
      });
      const { order } = await res.json();
      if (!order?.id) throw new Error('Failed to create payment order');

      // 2. Open Razorpay checkout
      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: 'INR',
        name: 'VillageMart',
        description: 'Order Payment',
        order_id: order.id,
        prefill: {
          contact: `+91${user.phone}`,
          name: user.name ?? '',
        },
        theme: { color: '#7C3AED' },
        modal: { ondismiss: () => setPaying(false) },
        handler: async (response: RazorpayResponse) => {
          // 3. Verify payment
          const verifyRes = await fetch('/api/razorpay/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          const { verified } = await verifyRes.json();

          if (!verified) {
            toast.error('Payment verification failed. Contact support.');
            setPaying(false);
            return;
          }

          // 4. Create order in Supabase
          const orderItems = items.map(item => ({
            product_id: item.product.id,
            product_snapshot: {
              name: item.product.name,
              selling_price: item.product.selling_price,
              mrp: item.product.mrp,
              images: item.product.images,
              unit: item.product.unit,
            },
            quantity: item.quantity,
            unit_price: item.product.selling_price,
            total_price: item.product.selling_price * item.quantity,
          }));

          const merchantId = items[0]?.product.merchant_id ?? null;

          const { data: newOrder, error } = await supabase
            .from('orders')
            .insert({
              customer_id: user.id,
              merchant_id: merchantId,
              delivery_type: merchantId ? 'marketplace' : 'own_store',
              status: 'pending',
              address_id: selectedAddress.id,
              delivery_address: selectedAddress,
              subtotal,
              delivery_charge: deliveryCharge,
              discount_amount: 0,
              commission_amount: 0,
              tax_amount: 0,
              total_amount: total,
              payment_status: 'paid',
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
            })
            .select()
            .single();

          if (error || !newOrder) {
            toast.error('Order creation failed. Contact support.');
            setPaying(false);
            return;
          }

          // 5. Insert order items
          await supabase.from('order_items').insert(
            orderItems.map(item => ({ ...item, order_id: newOrder.id }))
          );

          // 6. Deduct stock
          for (const item of items) {
            await supabase.rpc('decrement_stock', {
              p_product_id: item.product.id,
              p_qty: item.quantity,
            });
          }

          clearCart();
          toast.success('Order placed successfully! 🎉');
          router.push(`/orders/${newOrder.id}`);
        },
      });

      rzp.open();
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
      setPaying(false);
    }
  };

  if (!mounted || items.length === 0) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="sticky top-0 z-40 bg-white border-b border-[#E5E7EB] px-4 py-3">
        <h1 className="text-lg font-bold text-[#1A1A1A]">Checkout</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Address */}
        <div>
          <h3 className="text-sm font-semibold text-[#1A1A1A] mb-2">Delivery Address</h3>
          <AddressSelector selected={selectedAddress} onSelect={setSelectedAddress} />
        </div>

        {/* Order summary */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
          <h3 className="text-sm font-semibold text-[#1A1A1A] mb-3">Order Summary</h3>
          <div className="space-y-2">
            {items.map(({ product, quantity }) => (
              <div key={product.id} className="flex justify-between text-sm">
                <span className="text-[#6B7280] flex-1 truncate">{product.name} × {quantity}</span>
                <span className="font-medium ml-2">{formatCurrency(product.selling_price * quantity)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bill */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 space-y-2">
          <h3 className="text-sm font-semibold text-[#1A1A1A] mb-2">Bill Details</h3>
          <div className="flex justify-between text-sm">
            <span className="text-[#6B7280]">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#6B7280]">Delivery</span>
            {deliveryCharge === 0
              ? <span className="text-success font-medium">FREE</span>
              : <span>{formatCurrency(deliveryCharge)}</span>
            }
          </div>
          <div className="flex justify-between font-bold border-t border-[#E5E7EB] pt-2 text-base">
            <span>Total</span>
            <span className="text-primary-600">{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Security note */}
        <div className="flex items-center gap-2 text-xs text-[#6B7280]">
          <ShieldCheck className="w-4 h-4 text-success" />
          <span>100% secure payment via Razorpay. No COD available.</span>
        </div>

        {/* Pay button */}
        <Button
          fullWidth size="lg"
          onClick={handlePayment}
          loading={paying}
          disabled={!selectedAddress || paying}
        >
          <CreditCard className="w-5 h-5" />
          Pay {formatCurrency(total)} via UPI
        </Button>
      </div>
    </div>
  );
}
