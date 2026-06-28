import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Image from 'next/image';
import { Header } from '@/components/customer/Header';

export const revalidate = 60;

// Pastel colour palette — cycles by index
const COLORS = [
  '#FEF9C3','#FEE2E2','#DCFCE7','#EDE9FE',
  '#FEF3C7','#F3F4F6','#FCE7F3','#DBEAFE',
  '#D1FAE5','#FFF7ED','#E0F2FE','#F0FDF4',
];

export default async function CategoriesPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('categories')
    .select('id, name, slug, emoji, image_url, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  const categories = data ?? [];

  return (
    <div className="min-h-screen bg-white pb-24">
      <Header />

      <h2 className="text-base font-bold text-gray-900 px-4 pt-3 pb-1">All Categories</h2>

      <div className="grid grid-cols-2 gap-3 px-4 py-3">
        {categories.map((cat, index) => (
          <Link
            key={cat.id}
            href={`/category/${cat.slug}`}
            className="rounded-xl bg-gray-50 border border-gray-100 p-3 flex flex-col items-center gap-2"
          >
            {cat.image_url ? (
              <div className="w-16 h-16 relative">
                <Image
                  src={cat.image_url}
                  alt={cat.name}
                  fill
                  className="object-contain"
                  sizes="64px"
                />
              </div>
            ) : (
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              >
                {cat.emoji ?? '📦'}
              </div>
            )}
            <p className="text-sm font-medium text-center text-gray-800 leading-tight">{cat.name}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
