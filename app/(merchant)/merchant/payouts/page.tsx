'use client';

import { useEffect, useState } from 'react';
import { useMerchant } from '../MerchantProvider';
import { MerchantHeader } from '@/components/merchant/MerchantHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/utils/format';

interface PeriodStats {
  orders: number;
  grossSales: number;
  commission: number;
  netPayable: number;
}

const ZERO: PeriodStats = { orders: 0, grossSales: 0, commission: 0, netPayable: 0 };

function toISTDateStr(isoString: string): string {
  const d = new Date(isoString);
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

function calc(orders: any[]): PeriodStats {
  return orders.reduce(
    (acc, o) => {
      const sub = o.subtotal ?? 0;
      const comm = o.commission_amount ?? sub * 0.10;
      return {
        orders: acc.orders + 1,
        grossSales: acc.grossSales + sub,
        commission: acc.commission + comm,
        netPayable: acc.netPayable + (sub - comm),
      };
    },
    { ...ZERO },
  );
}

function PeriodCard({ title, stats, loading }: { title: string; stats: PeriodStats; loading: boolean }) {
  if (loading) return <Skeleton className="h-44 rounded-2xl" />;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</h2>
      </div>
      <div className="px-4 divide-y divide-gray-100">
        <Row label="Orders" value={String(stats.orders)} />
        <Row label="Gross Sales" value={formatCurrency(stats.grossSales)} />
        <Row label="Commission (deducted)" value={`−${formatCurrency(stats.commission)}`} valueClass="text-red-500" />
        <Row label="Net Payable to you" value={formatCurrency(stats.netPayable)} valueClass="text-purple-700 font-bold" />
      </div>
    </div>
  );
}

function Row({ label, value, valueClass = 'text-gray-900 font-semibold' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-sm ${valueClass}`}>{value}</span>
    </div>
  );
}

export default function MerchantPayoutsPage() {
  const merchant = useMerchant();
  const [loading, setLoading] = useState(true);
  const [todayStats, setTodayStats] = useState<PeriodStats>({ ...ZERO });
  const [weekStats, setWeekStats] = useState<PeriodStats>({ ...ZERO });
  const [monthStats, setMonthStats] = useState<PeriodStats>({ ...ZERO });

  useEffect(() => {
    fetch('/api/merchant/payouts')
      .then(r => r.json())
      .then(data => {
        const orders: any[] = data.orders ?? [];
        const now = new Date();
        const todayIST = toISTDateStr(now.toISOString());
        const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
        const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

        setTodayStats(calc(orders.filter(o => toISTDateStr(o.created_at) === todayIST)));
        setWeekStats(calc(orders.filter(o => new Date(o.created_at) >= weekAgo)));
        setMonthStats(calc(orders.filter(o => new Date(o.created_at) >= monthStart)));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <>
      <MerchantHeader storeName={merchant.store_name} />
      <main className="px-4 py-4 space-y-4 pb-24">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Payouts</h1>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">
            Net Payable = Gross Sales − Commission. Discounts are absorbed by VillageMart and are not deducted from your payout.
          </p>
        </div>
        <PeriodCard title="Today" stats={todayStats} loading={loading} />
        <PeriodCard title="This Week" stats={weekStats} loading={loading} />
        <PeriodCard title="This Month" stats={monthStats} loading={loading} />
      </main>
    </>
  );
}
