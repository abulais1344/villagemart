import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

export const revalidate = 60;

const EMOJI: Record<string, string> = {
  dairy: '🥛', 'bread-bakery': '🍞', eggs: '🥚',
  'fruits-vegetables': '🥬', groceries: '🛒', snacks: '🍪',
  household: '🏠', 'personal-care': '🧴', 'baby-care': '👶',
  medicine: '💊', medicines: '💊', restaurants: '🍛',
  beverages: '🧃', 'frozen-foods': '🧊', meat: '🍗',
};

const COLOR: Record<string, string> = {
  dairy: '#FEF9C3', 'bread-bakery': '#FEE2E2', eggs: '#DCFCE7',
  'fruits-vegetables': '#DCFCE7', groceries: '#EDE9FE', snacks: '#FEF3C7',
  household: '#F3F4F6', 'personal-care': '#FCE7F3', 'baby-care': '#DBEAFE',
  medicine: '#D1FAE5', medicines: '#D1FAE5', restaurants: '#FEF3C7',
};

const MARATHI: Record<string, string> = {
  dairy: 'दूध', 'bread-bakery': 'ब्रेड', eggs: 'अंडी',
  'fruits-vegetables': 'भाज्या', groceries: 'किराणा', snacks: 'नाश्ता',
  household: 'घरगुती', 'personal-care': 'सौंदर्य', 'baby-care': 'बाळ',
  medicine: 'औषध', medicines: 'औषध', restaurants: 'हॉटेल',
};

export default async function CategoriesPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('categories')
    .select('id, name, slug, image_url, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  const categories = data ?? [];

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="p-1.5 rounded-xl hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-800" />
        </Link>
        <h1 className="text-base font-bold text-gray-900">Categories</h1>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 px-4 py-3">
        {categories.map(cat => (
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
                style={{ backgroundColor: COLOR[cat.slug] ?? '#F3F4F6' }}
              >
                {EMOJI[cat.slug] ?? '📦'}
              </div>
            )}
            <p className="text-sm font-medium text-center text-gray-800 leading-tight">{cat.name}</p>
            {MARATHI[cat.slug] && (
              <p className="text-[10px] text-gray-400 -mt-1">{MARATHI[cat.slug]}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
