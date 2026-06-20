import Image from 'next/image';
import Link from 'next/link';
import { Clock, MapPin, ShoppingBag } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDistance } from '@/lib/utils/format';
import type { Merchant } from '@/types';

interface StoreCardProps {
  merchant: Merchant;
  distance?: number;
}

export function StoreCard({ merchant, distance }: StoreCardProps) {
  return (
    <Link href={`/stores/${merchant.id}`}>
      <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden hover:shadow-md transition-shadow min-w-[220px]">
        {/* Banner */}
        <div className="relative h-24 bg-primary-50">
          {merchant.banner_url ? (
            <Image src={merchant.banner_url} alt={merchant.store_name} fill className="object-cover" sizes="220px" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
              <ShoppingBag className="w-10 h-10 text-primary-400" />
            </div>
          )}
          <div className="absolute top-2 right-2">
            <Badge variant={merchant.is_open ? 'success' : 'gray'}>
              {merchant.is_open ? 'Open' : 'Closed'}
            </Badge>
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <div className="flex items-start gap-2">
            {merchant.logo_url && (
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-[#E5E7EB] shrink-0">
                <Image src={merchant.logo_url} alt={merchant.store_name} width={40} height={40} className="object-cover" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#1A1A1A] line-clamp-1">{merchant.store_name}</p>
              {merchant.category && (
                <p className="text-xs text-[#6B7280]">{merchant.category.name}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-2 text-xs text-[#6B7280]">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {merchant.avg_delivery_time} min
            </span>
            {distance !== undefined && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {formatDistance(distance)}
              </span>
            )}
            {merchant.min_order_amount > 0 && (
              <span>Min {formatCurrency(merchant.min_order_amount)}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
