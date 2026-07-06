'use client';

import { useEffect, useState } from 'react';
import { Users, Store, ShoppingBag, IndianRupee, Percent, Clock, Bike, Sprout } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAdminOrderRealtime } from '@/lib/hooks/useRealtime';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { StatsGrid } from '@/components/admin/StatsGrid';
import { LowStockAlert } from '@/components/admin/LowStockAlert';
import { OrderCard } from '@/components/customer/OrderCard';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/utils/format';
import { seedInitialProducts } from '@/lib/actions/seed';
import type { Order, AdminStats } from '@/types';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({
    total_users: 0, total_merchants: 0, total_riders: 0,
    total_orders: 0, total_revenue: 0, commission_earned: 0,
    pending_orders: 0, today_orders: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const supabase = createClient();

  const loadData = async () => {
    const today = new Date(); today.setHours(0, 0, 0, 0);

    // Non-order counts (still from anon client — small tables)
    const [users, merchants, riders] = await Promise.all([
      supabase.from('vm_users').select('id', { count: 'exact', head: true }),
      supabase.from('merchants').select('id', { count: 'exact', head: true }),
      supabase.from('vm_riders').select('id', { count: 'exact', head: true }),
    ]);

    // All orders via service role API (bypasses RLS)
    const res = await fetch('/api/admin/orders');
    const json = await res.json();
    const allOrders: any[] = json.orders ?? [];

    const validOrders = allOrders.filter(o => o.status !== 'cancelled');
    const todayOrders = allOrders.filter(o => new Date(o.created_at) >= today);
    const pendingOrders = allOrders.filter(o => o.status === 'pending');
    const totalRev = validOrders.reduce((s, o) => s + (o.total_amount ?? 0), 0);
    const commission = validOrders.reduce((s, o) => s + (o.commission_amount ?? 0), 0);

    setStats({
      total_users: users.count ?? 0,
      total_merchants: merchants.count ?? 0,
      total_riders: riders.count ?? 0,
      total_orders: allOrders.length,
      total_revenue: totalRev,
      commission_earned: commission,
      pending_orders: pendingOrders.length,
      today_orders: todayOrders.length,
    });

    setRecentOrders(allOrders.slice(0, 10) as Order[]);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);
  useAdminOrderRealtime(loadData);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const result = await seedInitialProducts();
      if (result.errors.length > 0) {
        toast.error(result.errors[0]);
      } else if (result.inserted === 0) {
        toast.success(`All products already seeded (${result.skipped} skipped)`);
      } else {
        toast.success(`Seeded ${result.inserted} product(s)! ${result.skipped > 0 ? `${result.skipped} already existed.` : ''}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Seeding failed');
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Skeleton className="h-16 w-full rounded-none" />
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <AdminHeader title="Dashboard" />
      <main className="px-4 py-4 space-y-5">
        <StatsGrid stats={[
          { label: 'Total Users', value: stats.total_users, icon: <Users className="w-4 h-4" /> },
          { label: 'Merchants', value: stats.total_merchants, icon: <Store className="w-4 h-4" /> },
          { label: 'Riders', value: stats.total_riders, icon: <Bike className="w-4 h-4" /> },
          { label: "Today's Orders", value: stats.today_orders, icon: <ShoppingBag className="w-4 h-4" /> },
          { label: 'Total Revenue', value: formatCurrency(stats.total_revenue), icon: <IndianRupee className="w-4 h-4" />, color: 'bg-green-50 text-success' },
          { label: 'Commission Earned', value: formatCurrency(stats.commission_earned), icon: <Percent className="w-4 h-4" />, color: 'bg-primary-50 text-primary-600' },
          { label: 'Pending Orders', value: stats.pending_orders, icon: <Clock className="w-4 h-4" />, color: 'bg-amber-50 text-amber-600' },
          { label: 'Total Orders', value: stats.total_orders, icon: <ShoppingBag className="w-4 h-4" />, color: 'bg-purple-50 text-purple-600' },
        ]} />

        {/* Low Stock Alert */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-[#1A1A1A]">Stock Alerts</h2>
          </div>
          <LowStockAlert />
        </section>

        {/* Seed Products */}
        <section className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
              <Sprout className="w-5 h-5 text-primary-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#1A1A1A]">Seed Sample Products</p>
              <p className="text-xs text-[#6B7280]">Add 15 common grocery products to get started quickly</p>
            </div>
            <Button size="sm" variant="secondary" onClick={handleSeed} loading={seeding}>
              Seed Products
            </Button>
          </div>
        </section>

        {/* Recent Orders */}
        <section>
          <h2 className="text-base font-bold text-[#1A1A1A] mb-3">Recent Orders</h2>
          <div className="space-y-3">
            {recentOrders.map(order => <OrderCard key={order.id} order={order} />)}
          </div>
        </section>
      </main>
    </>
  );
}
