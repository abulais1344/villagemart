'use client';

import { useEffect, useState } from 'react';
import { IndianRupee, ShoppingBag, TrendingUp } from 'lucide-react';
import { MerchantHeader } from '@/components/merchant/MerchantHeader';
import { StatsCard } from '@/components/merchant/StatsCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/utils/format';

interface TopProduct { name: string; quantity: number; revenue: number; }

export default function MerchantAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalOrders: 0, totalRevenue: 0, monthOrders: 0, monthRevenue: 0 });
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);

  useEffect(() => {
    fetch('/api/merchant/analytics')
      .then(r => r.json())
      .then(data => {
        setStats({
          totalOrders: data.totalOrders ?? 0,
          totalRevenue: data.totalRevenue ?? 0,
          monthOrders: data.monthOrders ?? 0,
          monthRevenue: data.monthRevenue ?? 0,
        });
        setTopProducts(data.topProducts ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <>
      <MerchantHeader />
      <main className="px-4 py-4 space-y-5">
        <h1 className="text-xl font-bold text-[#1A1A1A]">Analytics</h1>

        <section>
          <h2 className="text-sm font-semibold text-[#6B7280] mb-3">THIS MONTH</h2>
          <div className="grid grid-cols-2 gap-3">
            <StatsCard label="Orders" value={stats.monthOrders} icon={<ShoppingBag className="w-5 h-5" />} />
            <StatsCard label="Revenue" value={formatCurrency(stats.monthRevenue)} icon={<IndianRupee className="w-5 h-5" />} color="bg-green-50 text-success" />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-[#6B7280] mb-3">ALL TIME</h2>
          <div className="grid grid-cols-2 gap-3">
            <StatsCard label="Total Orders" value={stats.totalOrders} icon={<TrendingUp className="w-5 h-5" />} />
            <StatsCard label="Total Revenue" value={formatCurrency(stats.totalRevenue)} icon={<IndianRupee className="w-5 h-5" />} color="bg-green-50 text-success" />
          </div>
        </section>

        {topProducts.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-[#1A1A1A] mb-3">Top Products</h2>
            {topProducts.map((p, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[#E5E7EB] last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#6B7280] w-5">{i + 1}</span>
                  <p className="text-sm text-[#1A1A1A]">{p.name}</p>
                </div>
                <p className="text-sm font-bold">{formatCurrency(p.revenue)}</p>
              </div>
            ))}
          </section>
        )}
      </main>
    </>
  );
}
