'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, PackageX, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import Link from 'next/link';
import Image from 'next/image';

interface LowStockProduct {
  id: string;
  name: string;
  stock_quantity: number;
  low_stock_threshold: number;
  stock_status: string;
  images: string[];
  category: { name: string }[] | null;
}

export function LowStockAlert() {
  const [lowCount, setLowCount] = useState(0);
  const [outCount, setOutCount] = useState(0);
  const [urgent, setUrgent] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const [low, out, top5] = await Promise.all([
        supabase
          .from('vm_products')
          .select('id', { count: 'exact', head: true })
          .eq('stock_status', 'low_stock')
          .eq('is_active', true),
        supabase
          .from('vm_products')
          .select('id', { count: 'exact', head: true })
          .eq('stock_status', 'out_of_stock')
          .eq('is_active', true),
        supabase
          .from('vm_products')
          .select('id, name, stock_quantity, low_stock_threshold, stock_status, images, category:categories(name)')
          .in('stock_status', ['low_stock', 'out_of_stock'])
          .eq('is_active', true)
          .order('stock_quantity', { ascending: true })
          .limit(5),
      ]);

      setLowCount(low.count ?? 0);
      setOutCount(out.count ?? 0);
      setUrgent((top5.data as LowStockProduct[]) ?? []);
      setLoading(false);
    };

    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    );
  }

  if (lowCount === 0 && outCount === 0) {
    return (
      <div className="bg-green-50 rounded-2xl p-4 text-center">
        <p className="text-sm font-medium text-green-700">All products are well stocked!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary chips */}
      <div className="flex gap-2">
        {outCount > 0 && (
          <div className="flex items-center gap-2 bg-red-50 rounded-xl px-3 py-2 flex-1">
            <PackageX className="w-4 h-4 text-error shrink-0" />
            <div>
              <p className="text-xs text-[#6B7280]">Out of Stock</p>
              <p className="text-lg font-bold text-error">{outCount}</p>
            </div>
          </div>
        )}
        {lowCount > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 rounded-xl px-3 py-2 flex-1">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <p className="text-xs text-[#6B7280]">Low Stock</p>
              <p className="text-lg font-bold text-amber-600">{lowCount}</p>
            </div>
          </div>
        )}
      </div>

      {/* Top 5 most urgent */}
      <div className="space-y-2">
        {urgent.map(p => (
          <div key={p.id} className="bg-white rounded-2xl border border-[#E5E7EB] p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-50 overflow-hidden shrink-0 border border-[#E5E7EB]">
              {p.images?.[0] ? (
                <Image src={p.images[0]} alt={p.name} width={40} height={40} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-base">🛒</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#1A1A1A] truncate">{p.name}</p>
              <p className="text-xs text-[#6B7280]">{p.category?.[0]?.name ?? '—'}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={p.stock_status === 'out_of_stock' ? 'error' : 'warning'}>
                {p.stock_status === 'out_of_stock' ? '0' : p.stock_quantity} left
              </Badge>
              <Link
                href={`/admin/products?highlight=${p.id}`}
                className="text-primary-600 hover:text-primary-700"
                title="Update stock"
              >
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      <Link
        href="/admin/products?filter=low_stock"
        className="flex items-center justify-center gap-1 text-sm text-primary-600 font-medium py-1"
      >
        View all stock alerts <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
