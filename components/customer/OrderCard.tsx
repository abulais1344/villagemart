import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import type { Order } from '@/types';

const STATUS_VARIANTS: Record<string, 'primary' | 'success' | 'error' | 'warning' | 'gray'> = {
  pending: 'warning',
  accepted: 'primary',
  packed: 'primary',
  picked_up: 'primary',
  out_for_delivery: 'primary',
  delivered: 'success',
  cancelled: 'error',
  refunded: 'gray',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Order Placed',
  accepted: 'Accepted',
  packed: 'Packed',
  picked_up: 'Picked Up',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

interface OrderCardProps {
  order: Order;
}

export function OrderCard({ order }: OrderCardProps) {
  const itemCount = order.order_items?.length ?? 0;
  const firstItem = order.order_items?.[0];

  return (
    <Link href={`/orders/${order.id}`}>
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-sm font-semibold text-[#1A1A1A]">{order.order_number}</p>
            <p className="text-xs text-[#6B7280] mt-0.5">{formatDate(order.created_at)}</p>
          </div>
          <Badge variant={STATUS_VARIANTS[order.status]}>
            {STATUS_LABELS[order.status]}
          </Badge>
        </div>

        {firstItem && (
          <p className="text-sm text-[#6B7280] mb-2">
            {firstItem.product_snapshot.name}
            {itemCount > 1 && ` +${itemCount - 1} more`}
          </p>
        )}

        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-[#1A1A1A]">{formatCurrency(order.total_amount)}</p>
          <ChevronRight className="w-4 h-4 text-[#6B7280]" />
        </div>
      </div>
    </Link>
  );
}
