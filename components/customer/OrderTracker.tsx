import { CheckCircle, Circle } from 'lucide-react';
import type { OrderStatus } from '@/types';

const STEPS: { status: OrderStatus; label: string; icon: string }[] = [
  { status: 'pending', label: 'Order Placed', icon: '📋' },
  { status: 'accepted', label: 'Accepted', icon: '✅' },
  { status: 'packed', label: 'Packed', icon: '📦' },
  { status: 'picked_up', label: 'Picked Up', icon: '🛵' },
  { status: 'out_for_delivery', label: 'On the Way', icon: '🚀' },
  { status: 'delivered', label: 'Delivered', icon: '🎉' },
];

const STATUS_ORDER: OrderStatus[] = [
  'pending', 'accepted', 'packed', 'picked_up', 'out_for_delivery', 'delivered',
];

interface OrderTrackerProps {
  status: OrderStatus;
}

export function OrderTracker({ status }: OrderTrackerProps) {
  if (status === 'cancelled' || status === 'refunded') {
    return (
      <div className="flex items-center gap-3 bg-red-50 rounded-2xl p-4">
        <span className="text-3xl">❌</span>
        <div>
          <p className="font-semibold text-error">Order {status === 'cancelled' ? 'Cancelled' : 'Refunded'}</p>
          <p className="text-sm text-[#6B7280]">
            {status === 'refunded' ? 'Refund will be credited in 3-5 business days.' : ''}
          </p>
        </div>
      </div>
    );
  }

  const currentIndex = STATUS_ORDER.indexOf(status);

  return (
    <div className="relative">
      {/* Connector line */}
      <div className="absolute left-4 top-5 bottom-5 w-0.5 bg-[#E5E7EB]" />
      <div
        className="absolute left-4 top-5 w-0.5 bg-primary-600 transition-all duration-500"
        style={{ height: `${(currentIndex / (STEPS.length - 1)) * 100}%` }}
      />

      <div className="space-y-6">
        {STEPS.map((step, i) => {
          const done = i <= currentIndex;
          const current = i === currentIndex;

          return (
            <div key={step.status} className="flex items-start gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all duration-300 shrink-0 ${done ? 'bg-primary-600' : 'bg-white border-2 border-[#E5E7EB]'} ${current ? 'ring-4 ring-primary-100' : ''}`}>
                {done ? (
                  <CheckCircle className="w-5 h-5 text-white" />
                ) : (
                  <Circle className="w-4 h-4 text-[#E5E7EB]" />
                )}
              </div>
              <div className="pt-1">
                <p className={`text-sm font-medium ${done ? 'text-[#1A1A1A]' : 'text-[#6B7280]'}`}>
                  {step.icon} {step.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
