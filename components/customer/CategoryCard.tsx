import Image from 'next/image';
import Link from 'next/link';
import type { Category } from '@/types';

interface CategoryCardProps {
  category: Category;
  compact?: boolean;
}

export function CategoryCard({ category, compact }: CategoryCardProps) {
  return (
    <Link href={`/category/${category.slug}`}>
      {compact ? (
        // Chip style for horizontal scroll
        <div className="flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-full px-4 py-2 hover:border-primary-400 hover:bg-primary-50 transition-colors whitespace-nowrap">
          {category.icon_url && (
            <Image src={category.icon_url} alt={category.name} width={20} height={20} className="object-contain" />
          )}
          <span className="text-sm font-medium text-[#1A1A1A]">{category.name}</span>
        </div>
      ) : (
        // Card style
        <div className="flex flex-col items-center gap-2 p-3 bg-white rounded-2xl border border-[#E5E7EB] hover:shadow-md transition-shadow">
          <div className="w-16 h-16 rounded-xl bg-primary-50 flex items-center justify-center overflow-hidden">
            {category.image_url ? (
              <Image src={category.image_url} alt={category.name} width={48} height={48} className="object-contain" />
            ) : (
              <span className="text-2xl">🛍️</span>
            )}
          </div>
          <span className="text-xs font-medium text-[#1A1A1A] text-center leading-tight">{category.name}</span>
        </div>
      )}
    </Link>
  );
}
