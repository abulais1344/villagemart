import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import { ParcelOrderClient } from '@/components/parcel/ParcelOrderClient';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function getISTHoursMinutes(): { h: number; m: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const h = parseInt(parts.find(p => p.type === 'hour')!.value);
  const m = parseInt(parts.find(p => p.type === 'minute')!.value);
  return { h, m };
}

export default async function ParcelPage({ params }: { params: Promise<{ merchantId: string }> }) {
  const { merchantId } = await params;

  const { data: merchant } = await supabase
    .from('merchants')
    .select('id, store_name, logo_url, cover_image_url, parcel_service_enabled, parcel_delivery_charge, parcel_order_cutoff_time, commission_rate')
    .eq('id', merchantId)
    .single();

  if (!merchant || !merchant.parcel_service_enabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <p className="text-4xl mb-4">📦</p>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Parcel orders not available</h1>
        <p className="text-sm text-gray-500">This restaurant has not enabled parcel delivery.</p>
      </div>
    );
  }

  // IST cutoff check
  const cutoffStr: string = merchant.parcel_order_cutoff_time ?? '17:30:00';
  const [cutH, cutM] = cutoffStr.slice(0, 5).split(':').map(Number);
  const { h: nowH, m: nowM } = getISTHoursMinutes();
  const pastCutoff = nowH > cutH || (nowH === cutH && nowM >= cutM);

  if (pastCutoff) {
    const display = cutoffStr.slice(0, 5);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <p className="text-4xl mb-4">🕔</p>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Ordering closed for today</h1>
        <p className="text-sm text-gray-500">
          Reopens tomorrow at {display}. Please come back then to place your parcel order.
        </p>
      </div>
    );
  }

  const { data: products } = await supabase
    .from('vm_products')
    .select('id, name, selling_price, mrp, unit, images, description, is_active, is_bestseller')
    .eq('merchant_id', merchantId)
    .eq('is_active', true)
    .order('is_bestseller', { ascending: false });

  return (
    <ParcelOrderClient
      merchant={merchant}
      products={products ?? []}
      cutoffDisplay={cutoffStr.slice(0, 5)}
    />
  );
}
