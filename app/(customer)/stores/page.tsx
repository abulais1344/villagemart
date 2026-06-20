import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

export const revalidate = 60;

const CUISINE_RULES: [RegExp, string][] = [
  [/chicken|non.?veg|arabian|tandoori|kebab|mutton/i, '🍗 Non Veg'],
  [/\bveg\b|north.?indian|\bindian\b|dal|thali|paneer/i, '🥬 Veg'],
  [/chinese|noodles|fried.?rice|manchurian/i, '🥡 Chinese'],
  [/pizza|burger|sandwich|fast.?food/i, '🍕 Fast Food'],
  [/biryani/i, '🍚 Biryani'],
  [/dosa|idli|south.?indian/i, '🫓 South Indian'],
  [/sweet|dessert|bakery/i, '🍮 Sweets'],
];

function getCuisineTags(cuisineType: string | null): string[] {
  if (!cuisineType) return ['🍽️ Meals'];
  const tags: string[] = [];
  for (const [pattern, tag] of CUISINE_RULES) {
    if (pattern.test(cuisineType) && !tags.includes(tag)) tags.push(tag);
    if (tags.length === 3) break;
  }
  return tags.length > 0 ? tags : ['🍽️ Meals'];
}

function deliveryRange(avg: number | null): string {
  if (!avg) return '30-40 min';
  return `${Math.max(avg - 5, 5)}-${avg} min`;
}

export default async function StoresPage() {
  const supabase = await createClient();

  const { data: merchants } = await supabase
    .from('merchants')
    .select('id, store_name, cuisine_type, avg_delivery_time, cover_image_url, logo_url, area')
    .eq('status', 'approved')
    .order('store_name');

  const list = merchants ?? [];

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="p-1.5 rounded-xl hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-800" />
        </Link>
        <div>
          <h1 className="text-base font-bold text-gray-900">Restaurants &amp; Dhabas</h1>
          <p className="text-sm text-gray-500">Food near Ardhapur</p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 px-4 pt-4">
        {list.map((merchant: any, index: number) => (
          <Link key={merchant.id} href={`/stores/${merchant.id}`} className="block">
            {/* Cover image */}
            {merchant.cover_image_url ? (
              <div className="relative w-full h-36 rounded-lg overflow-hidden bg-gray-100">
                <Image
                  src={merchant.cover_image_url}
                  alt={merchant.store_name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 25vw"
                  priority={index === 0}
                />
              </div>
            ) : (
              <div className="w-full h-36 rounded-lg bg-purple-600 flex items-center justify-center">
                <span className="text-4xl font-bold text-white/40">
                  {merchant.store_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            {/* Info */}
            <p className="font-semibold text-sm text-gray-900 mt-1 truncate">{merchant.store_name}</p>

            <div className="flex flex-wrap gap-1 mt-1">
              {getCuisineTags(merchant.cuisine_type).map((tag: string) => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                  {tag}
                </span>
              ))}
            </div>

            <p className="text-xs text-gray-500 mt-1">{deliveryRange(merchant.avg_delivery_time)}</p>
          </Link>
        ))}

        {list.length === 0 && (
          <div className="col-span-2 text-center py-20">
            <p className="text-4xl mb-3">🍽️</p>
            <p className="text-sm font-medium text-gray-700">No restaurants available</p>
            <p className="text-xs text-gray-400 mt-1">Check back soon</p>
          </div>
        )}
      </div>
    </div>
  );
}
