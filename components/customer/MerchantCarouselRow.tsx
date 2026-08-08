import Image from 'next/image';
import Link from 'next/link';
import { isRestaurantOpen } from '@/lib/utils/restaurant';
import type { Merchant } from '@/types';

function getCuisineTags(cuisineType: string | null): string[] {
  if (!cuisineType) return ['🍽️ Meals'];
  const tags = cuisineType.split(',').map(t => t.trim()).filter(Boolean);
  return tags.length > 0 ? tags.slice(0, 2) : ['🍽️ Meals'];
}

function deliveryRange(avg: number): string {
  return `${Math.max(avg - 5, 5)}-${avg} min`;
}

function MerchantCarouselCard({ merchant, mounted }: { merchant: Merchant; mounted: boolean }) {
  const m = merchant as any;
  const comingSoon = !!m.coming_soon;
  const open = comingSoon ? false : (!mounted || isRestaurantOpen(
    m.opening_time, m.closing_time, m.is_open, m.admin_override,
  ));

  const statusPill = comingSoon
    ? <span className="text-[10px] font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">● Coming Soon</span>
    : open
    ? <span className="text-[10px] font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">● Open</span>
    : <span className="text-[10px] font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">● Closed</span>;

  const overlay = comingSoon ? (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
      <span className="text-white font-semibold text-xs bg-orange-500/90 px-2.5 py-0.5 rounded-full">Coming Soon</span>
    </div>
  ) : (!open && mounted) ? (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
      <span className="text-white font-semibold text-xs bg-black/60 px-2.5 py-0.5 rounded-full">Closed</span>
    </div>
  ) : null;

  const cardContent = (
    <>
      {m.cover_image_url ? (
        <div className="relative w-full h-36 bg-gray-100">
          <Image src={m.cover_image_url} alt={merchant.store_name} fill className="object-cover" sizes="288px" />
          {overlay}
        </div>
      ) : (
        <div className="relative w-full h-36 bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] flex items-center justify-center">
          <span className="text-4xl font-bold text-white/30">{merchant.store_name.charAt(0).toUpperCase()}</span>
          {overlay}
        </div>
      )}
      <div className="p-2.5">
        <p className="font-semibold text-sm text-gray-900 truncate mb-1">{merchant.store_name}</p>
        <div className="flex flex-wrap gap-1 mb-2">
          {m.merchant_type === 'vegetables' ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700">🥬 Fresh Produce</span>
          ) : (
            getCuisineTags(m.cuisine_type).map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700">{tag}</span>
            ))
          )}
        </div>
        <div className="flex items-center gap-2">
          {statusPill}
          {merchant.merchant_type !== 'vegetables' && (
            <span className="text-[10px] text-gray-500">🕐 {deliveryRange(merchant.avg_delivery_time)}</span>
          )}
        </div>
      </div>
    </>
  );

  if (comingSoon) {
    return (
      <div className="w-72 shrink-0 bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm opacity-80 cursor-default select-none">
        {cardContent}
      </div>
    );
  }
  return (
    <Link href={`/stores/${merchant.id}`} className="w-72 shrink-0 bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
      {cardContent}
    </Link>
  );
}

export interface MerchantCarouselRowProps {
  title: string;
  subtitle: string;
  merchants: Merchant[];
  seeAllHref: string;
  mounted: boolean;
}

export function MerchantCarouselRow({ title, subtitle, merchants, seeAllHref, mounted }: MerchantCarouselRowProps) {
  if (merchants.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        <Link href={seeAllHref} className="text-xs font-medium text-purple-600 shrink-0 ml-2">See all →</Link>
      </div>
      {/* overscroll-x-contain prevents horizontal swipes from triggering vertical page scroll on mobile */}
      <div
        className="flex gap-3 overflow-x-auto overscroll-x-contain -mx-4 px-4 pb-2"
        style={{ scrollbarWidth: 'none' }}
      >
        {merchants.map(merchant => (
          <MerchantCarouselCard key={merchant.id} merchant={merchant} mounted={mounted} />
        ))}
      </div>
    </section>
  );
}
