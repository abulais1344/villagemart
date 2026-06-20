'use client';

import { useEffect, useState } from 'react';
import { IndianRupee, ShoppingBag, TrendingUp } from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { StatsGrid } from '@/components/admin/StatsGrid';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/utils/format';

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState({ week: 0, weekRev: 0, month: 0, monthRev: 0, total: 0, totalRev: 0, commission: 0 });
  const [topMerchants, setTopMerchants] = useState<{ store_name: string; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = async () => {
      const now = new Date();
      const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(now); monthAgo.setDate(1); monthAgo.setHours(0, 0, 0, 0);

      // Fetch all orders via service role API (bypasses RLS)
      const res = await fetch('/api/admin/orders');
      const json = await res.json();
      const allOrders: any[] = json.orders ?? [];

      const valid = allOrders.filter(o => o.status !== 'cancelled');
      const weekOrders = valid.filter(o => new Date(o.created_at) >= weekAgo);
      const monthOrders = valid.filter(o => new Date(o.created_at) >= monthAgo);

      const totalRev = valid.reduce((s, o) => s + (o.total_amount ?? 0), 0);
      // Use per-order commission_amount if available, otherwise assume 10%
      const commission = valid.reduce((s, o) => s + (o.commission_amount ?? (o.total_amount ?? 0) * 0.10), 0);

      setStats({
        week: weekOrders.length,
        weekRev: weekOrders.reduce((s, o) => s + (o.total_amount ?? 0), 0),
        month: monthOrders.length,
        monthRev: monthOrders.reduce((s, o) => s + (o.total_amount ?? 0), 0),
        total: valid.length,
        totalRev,
        commission,
      });
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <AdminHeader title="Analytics" />
      <main className="px-4 py-4 space-y-5">
        <section>
          <h2 className="text-sm font-semibold text-[#6B7280] mb-3">THIS WEEK</h2>
          <StatsGrid stats={[
            { label: 'Orders', value: stats.week, icon: <ShoppingBag className="w-4 h-4" /> },
            { label: 'Revenue', value: formatCurrency(stats.weekRev), icon: <IndianRupee className="w-4 h-4" />, color: 'bg-green-50 text-success' },
          ]} />
        </section>
        <section>
          <h2 className="text-sm font-semibold text-[#6B7280] mb-3">THIS MONTH</h2>
          <StatsGrid stats={[
            { label: 'Orders', value: stats.month, icon: <ShoppingBag className="w-4 h-4" /> },
            { label: 'Revenue', value: formatCurrency(stats.monthRev), icon: <IndianRupee className="w-4 h-4" />, color: 'bg-green-50 text-success' },
          ]} />
        </section>
        <section>
          <h2 className="text-sm font-semibold text-[#6B7280] mb-3">ALL TIME</h2>
          <StatsGrid stats={[
            { label: 'Total Orders', value: stats.total, icon: <TrendingUp className="w-4 h-4" /> },
            { label: 'Gross Revenue', value: formatCurrency(stats.totalRev), icon: <IndianRupee className="w-4 h-4" />, color: 'bg-green-50 text-success' },
            { label: 'Your Earnings (Commission)', value: formatCurrency(stats.commission), icon: <IndianRupee className="w-4 h-4" />, color: 'bg-purple-50 text-purple-600' },
          ]} />
        </section>
      </main>
    </>
  );
}
