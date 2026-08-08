import { createServiceClient } from '@/lib/supabase/server';
import { deliveryRange } from '@/lib/utils/delivery';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

export const revalidate = 60;


export default async function VegetablesPage() {
  const supabase = await createServiceClient();

  const { data: merchants } = await supabase
    .from('merchants')
    .select('id, store_name, cuisine_type, avg_delivery_time, cover_image_url, area')
    .eq('status', 'approved')
    .eq('merchant_type', 'vegetables')
    .order('store_name');

  const list = merchants ?? [];

  return (
    <div className="min-h-screen bg-white pb-24">
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="p-1.5 rounded-xl hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-800" />
        </Link>
        <div>
          <h1 className="text-base font-bold text-gray-900">Fresh Fruits &amp; Vegetables</h1>
          <p className="text-sm text-gray-500">
            {list.length} {list.length === 1 ? 'shop' : 'shops'} near Ardhapur
          </p>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <span className="text-5xl">🥦</span>
          <p className="text-sm text-gray-500">No fruit & vegetable shops listed yet</p>
          <Link href="/" className="text-sm font-medium text-purple-600">← Back to home</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4 pt-4">
          {list.map((merchant: any) => (
            <Link key={merchant.id} href={`/stores/${merchant.id}`} className="block">
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                {merchant.cover_image_url ? (
                  <div className="relative aspect-video bg-gray-100">
                    <Image
                      src={merchant.cover_image_url}
                      alt={merchant.store_name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 240px"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-green-300 to-emerald-200 flex items-center justify-center">
                    <span className="text-4xl">🥦</span>
                  </div>
                )}
                <div className="p-2.5">
                  <p className="font-semibold text-sm text-gray-900 truncate">{merchant.store_name}</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    🕐 {deliveryRange(merchant.avg_delivery_time)}
                    {merchant.area ? ` · ${merchant.area}` : ''}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
