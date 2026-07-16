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

interface DayRow {
  date: string; // YYYY-MM-DD in IST
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

function fmtDate(ymd: string): string {
  const [y, m, d] = ymd.split('-');
  return new Date(Number(y), Number(m) - 1, Number(d))
    .toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
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

function DailyTable({ rows, loading }: { rows: DayRow[]; loading: boolean }) {
  if (loading) return <Skeleton className="h-48 rounded-2xl" />;
  if (rows.length === 0) return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-10 text-center">
      <p className="text-sm text-gray-400">No orders in the last 30 days</p>
    </div>
  );

  const totals = rows.reduce(
    (acc, r) => ({
      orders: acc.orders + r.orders,
      grossSales: acc.grossSales + r.grossSales,
      commission: acc.commission + r.commission,
      netPayable: acc.netPayable + r.netPayable,
    }),
    { orders: 0, grossSales: 0, commission: 0, netPayable: 0 },
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-3 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">Date</th>
              <th className="px-3 py-2.5 text-right font-semibold text-gray-500">Orders</th>
              <th className="px-3 py-2.5 text-right font-semibold text-gray-500 whitespace-nowrap">Gross Sales</th>
              <th className="px-3 py-2.5 text-right font-semibold text-gray-500 whitespace-nowrap">Commission</th>
              <th className="px-3 py-2.5 text-right font-semibold text-gray-500 whitespace-nowrap">Net Payable</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.date} className="border-t border-gray-50 hover:bg-gray-50/60">
                <td className="px-3 py-2.5 text-gray-700 font-medium whitespace-nowrap">{fmtDate(r.date)}</td>
                <td className="px-3 py-2.5 text-right text-gray-600">{r.orders}</td>
                <td className="px-3 py-2.5 text-right text-gray-800">{formatCurrency(r.grossSales)}</td>
                <td className="px-3 py-2.5 text-right text-red-500">−{formatCurrency(r.commission)}</td>
                <td className="px-3 py-2.5 text-right text-purple-700 font-semibold">{formatCurrency(r.netPayable)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
              <td className="px-3 py-2.5 text-gray-700 text-xs">Total</td>
              <td className="px-3 py-2.5 text-right text-gray-800">{totals.orders}</td>
              <td className="px-3 py-2.5 text-right text-gray-800">{formatCurrency(totals.grossSales)}</td>
              <td className="px-3 py-2.5 text-right text-red-500">−{formatCurrency(totals.commission)}</td>
              <td className="px-3 py-2.5 text-right text-purple-700">{formatCurrency(totals.netPayable)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default function MerchantPayoutsPage() {
  const merchant = useMerchant();
  const [loading, setLoading] = useState(true);
  const [todayStats, setTodayStats] = useState<PeriodStats>({ ...ZERO });
  const [weekStats, setWeekStats] = useState<PeriodStats>({ ...ZERO });
  const [monthStats, setMonthStats] = useState<PeriodStats>({ ...ZERO });
  const [dailyRows, setDailyRows] = useState<DayRow[]>([]);

  useEffect(() => {
    fetch('/api/merchant/payouts')
      .then(r => r.json())
      .then(data => {
        const orders: any[] = data.orders ?? [];
        const now = new Date();
        const todayIST = toISTDateStr(now.toISOString());
        const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
        const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
        const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        setTodayStats(calc(orders.filter(o => toISTDateStr(o.created_at) === todayIST)));
        setWeekStats(calc(orders.filter(o => new Date(o.created_at) >= weekAgo)));
        setMonthStats(calc(orders.filter(o => new Date(o.created_at) >= monthStart)));

        // Daily breakdown — last 30 days, most recent first, only days with orders
        const byDate: Record<string, DayRow> = {};
        for (const o of orders) {
          if (new Date(o.created_at) < thirtyDaysAgo) continue;
          const date = toISTDateStr(o.created_at);
          if (!byDate[date]) byDate[date] = { date, orders: 0, grossSales: 0, commission: 0, netPayable: 0 };
          const sub = o.subtotal ?? 0;
          const comm = o.commission_amount ?? sub * 0.10;
          byDate[date].orders++;
          byDate[date].grossSales += sub;
          byDate[date].commission += comm;
          byDate[date].netPayable += sub - comm;
        }
        setDailyRows(Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date)));
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
            Net Payable = Gross Sales − Commission. Discounts are absorbed by Zupr and are not deducted from your payout.
          </p>
        </div>
        <PeriodCard title="Today" stats={todayStats} loading={loading} />
        <PeriodCard title="This Week" stats={weekStats} loading={loading} />
        <PeriodCard title="This Month" stats={monthStats} loading={loading} />

        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Last 30 Days — Day by Day</h2>
          <DailyTable rows={dailyRows} loading={loading} />
        </div>
      </main>
    </>
  );
}
