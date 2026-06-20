import { createClient } from '@/lib/supabase/server';

export const revalidate = 60;
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Clock, Phone, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { ProductGrid } from '@/components/customer/ProductGrid';
import { BottomNav } from '@/components/customer/BottomNav';
import { FloatingCartPill } from '@/components/customer/FloatingCartPill';
import { formatCurrency } from '@/lib/utils/format';
import type { Product } from '@/types';

export default async function StoreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: merchant } = await supabase
    .from('merchants')
    .select('*')
    .eq('id', id)
    .single();

  if (!merchant) notFound();

  const { data: products } = await supabase
    .from('vm_products')
    .select('*, category:categories(*)')
    .eq('merchant_id', id)
    .eq('is_active', true)
    .order('sort_order');

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Back button */}
      <Link href="/" className="absolute top-4 left-4 z-10 bg-white rounded-xl p-2 shadow-md">
        <ArrowLeft className="w-5 h-5 text-[#1A1A1A]" />
      </Link>

      {/* Banner */}
      <div className="relative h-48 bg-primary-100">
        {(merchant as any).cover_image_url ? (
          <Image src={(merchant as any).cover_image_url} alt={merchant.store_name} fill className="object-cover" sizes="100vw" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#7C3AED] to-[#6D28D9] flex items-center justify-center">
            <span className="text-7xl font-bold text-white/30">{merchant.store_name.charAt(0).toUpperCase()}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute bottom-4 right-4">
          <Badge variant={merchant.is_open ? 'success' : 'gray'}>
            {merchant.is_open ? '● Open' : '● Closed'}
          </Badge>
        </div>
      </div>

      {/* Store info */}
      <div className="bg-white px-4 pt-4 pb-4">
        <div className="flex items-start gap-3">
          {merchant.logo_url && (
            <div className="-mt-8 w-16 h-16 rounded-2xl border-2 border-white overflow-hidden shadow-md shrink-0">
              <Image src={merchant.logo_url} alt={merchant.store_name} width={64} height={64} className="object-cover" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-[#1A1A1A]">{merchant.store_name}</h1>
            {merchant.category && <p className="text-sm text-[#6B7280]">{(merchant.category as never as { name: string }).name}</p>}
          </div>
        </div>

        {merchant.description && (
          <p className="text-sm text-[#6B7280] mt-3">{merchant.description}</p>
        )}

        <div className="flex items-center gap-4 mt-3 text-sm text-[#6B7280]">
          <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {merchant.avg_delivery_time} min</span>
          <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {merchant.city}</span>
          {merchant.min_order_amount > 0 && (
            <span>Min {formatCurrency(merchant.min_order_amount)}</span>
          )}
        </div>

        {merchant.phone && (
          <a href={`tel:${merchant.phone}`} className="flex items-center gap-1 text-sm text-primary-600 font-medium mt-2">
            <Phone className="w-4 h-4" /> {merchant.phone}
          </a>
        )}
      </div>

      {/* Products */}
      <main className="px-4 py-4">
        <h2 className="text-base font-bold text-[#1A1A1A] mb-3">Products</h2>
        <ProductGrid products={(products ?? []) as Product[]} />
      </main>

      <FloatingCartPill />
      <BottomNav />
    </div>
  );
}
