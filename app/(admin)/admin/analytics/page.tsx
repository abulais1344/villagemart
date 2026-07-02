'use client';

import { useEffect, useState, useMemo } from 'react';
import { IndianRupee, ShoppingBag, TrendingUp, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { StatsGrid } from '@/components/admin/StatsGrid';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/utils/format';

// ── types ──────────────────────────────────────────────────────────────────
interface AdminOrder {
  id: string;
  created_at: string;
  status: string;
  subtotal: number;
  discount_amount: number;
  commission_amount: number;
  total_amount: number;
  customer_name: string;
  customer_phone: string;
  merchant_id: string | null;
  merchant?: { store_name: string | null } | null;
  order_number?: string;
}

interface DailyRow {
  date: string;
  orders: number;
  customerPaid: number;
  discount: number;
  commission: number;
  zuprPnl: number;
  merchantPayout: number;
}

interface MerchantRow {
  merchantId: string;
  storeName: string;
  orders: number;
  grossSales: number;
  discount: number;
  commission: number;
  netPayable: number;
}

interface DailyOrderDetail {
  id: string;
  order_number: string | null;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  merchant_name: string | null;
  item_count: number;
  subtotal: number;
  discount_amount: number;
  commission_amount: number;
  total_amount: number;
}

// ── helpers ────────────────────────────────────────────────────────────────
function toIST(iso: string) {
  const d = new Date(iso);
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

function fmtDate(ymd: string) {
  const [y, m, d] = ymd.split('-');
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// ── shared table primitives ────────────────────────────────────────────────
function ScrollTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
      <table className="min-w-full text-xs">{children}</table>
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`px-3 py-2.5 font-semibold text-[#6B7280] bg-gray-50 whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  );
}

function Td({ children, right, green, red, purple }: {
  children: React.ReactNode; right?: boolean;
  green?: boolean; red?: boolean; purple?: boolean;
}) {
  const color = green ? 'text-green-600' : red ? 'text-red-500' : purple ? 'text-purple-600 font-semibold' : 'text-[#1A1A1A]';
  return (
    <td className={`px-3 py-2.5 whitespace-nowrap border-t border-gray-50 ${right ? 'text-right' : ''} ${color}`}>
      {children}
    </td>
  );
}

// ── section toggle ─────────────────────────────────────────────────────────
function SectionHeader({ title, open, onToggle }: { title: string; open: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="w-full flex items-center justify-between py-2">
      <h2 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wide">{title}</h2>
      {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
    </button>
  );
}

// ── day drill-down table ───────────────────────────────────────────────────
function DayOrdersTable({ orders }: { orders: DailyOrderDetail[] }) {
  const totals = orders.reduce(
    (acc, o) => ({
      subtotal: acc.subtotal + o.subtotal,
      discount: acc.discount + o.discount_amount,
      commission: acc.commission + o.commission_amount,
      paid: acc.paid + o.total_amount,
      merchantGets: acc.merchantGets + (o.subtotal - o.commission_amount),
      zuprEarns: acc.zuprEarns + (o.commission_amount - o.discount_amount),
    }),
    { subtotal: 0, discount: 0, commission: 0, paid: 0, merchantGets: 0, zuprEarns: 0 }
  );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-[11px]">
        <thead>
          <tr className="bg-purple-50">
            <th className="px-3 py-2 text-left font-semibold text-purple-700 whitespace-nowrap">Order #</th>
            <th className="px-3 py-2 text-left font-semibold text-purple-700 whitespace-nowrap">Merchant</th>
            <th className="px-3 py-2 text-left font-semibold text-purple-700 whitespace-nowrap">Customer</th>
            <th className="px-3 py-2 text-center font-semibold text-purple-700 whitespace-nowrap">Items</th>
            <th className="px-3 py-2 text-right font-semibold text-purple-700 whitespace-nowrap">Subtotal</th>
            <th className="px-3 py-2 text-right font-semibold text-purple-700 whitespace-nowrap">Discount</th>
            <th className="px-3 py-2 text-right font-semibold text-purple-700 whitespace-nowrap">Commission</th>
            <th className="px-3 py-2 text-right font-semibold text-purple-700 whitespace-nowrap">Customer Paid</th>
            <th className="px-3 py-2 text-right font-semibold text-purple-700 whitespace-nowrap">Merchant Gets</th>
            <th className="px-3 py-2 text-right font-semibold text-purple-700 whitespace-nowrap">Zupr Earns</th>
            <th className="px-3 py-2 text-left font-semibold text-purple-700 whitespace-nowrap">Time</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(o => {
            const disc = o.discount_amount;
            const comm = o.commission_amount;
            const merchantGets = o.subtotal - comm;
            const zuprEarns = comm - disc;
            return (
              <tr key={o.id} className="border-t border-purple-50 hover:bg-purple-50/40">
                <td className="px-3 py-2 font-mono text-[10px] text-gray-400">
                  #{(o.order_number ?? o.id).slice(-6).toUpperCase()}
                </td>
                <td className="px-3 py-2 text-[#1A1A1A] max-w-[100px] truncate">{o.merchant_name ?? '—'}</td>
                <td className="px-3 py-2">
                  <p className="text-[#1A1A1A]">{o.customer_name}</p>
                  <p className="text-gray-400">{o.customer_phone}</p>
                </td>
                <td className="px-3 py-2 text-center text-[#6B7280]">{o.item_count || '—'}</td>
                <td className="px-3 py-2 text-right text-[#1A1A1A]">{formatCurrency(o.subtotal)}</td>
                <td className={`px-3 py-2 text-right ${disc > 0 ? 'text-red-500' : 'text-gray-300'}`}>
                  {disc > 0 ? `−${formatCurrency(disc)}` : '—'}
                </td>
                <td className="px-3 py-2 text-right text-green-600">{formatCurrency(comm)}</td>
                <td className="px-3 py-2 text-right text-[#1A1A1A]">{formatCurrency(o.total_amount)}</td>
                <td className="px-3 py-2 text-right text-purple-600 font-semibold">{formatCurrency(merchantGets)}</td>
                <td className={`px-3 py-2 text-right font-semibold ${zuprEarns >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {zuprEarns >= 0 ? formatCurrency(zuprEarns) : `−${formatCurrency(Math.abs(zuprEarns))}`}
                </td>
                <td className="px-3 py-2 text-gray-400">{fmtTime(o.created_at)}</td>
              </tr>
            );
          })}
          {/* Day total row */}
          <tr className="border-t-2 border-purple-200 bg-purple-100/60 font-bold text-[11px]">
            <td className="px-3 py-2 text-purple-700" colSpan={4}>Day Total</td>
            <td className="px-3 py-2 text-right text-purple-700">{formatCurrency(totals.subtotal)}</td>
            <td className={`px-3 py-2 text-right ${totals.discount > 0 ? 'text-red-500' : 'text-gray-300'}`}>
              {totals.discount > 0 ? `−${formatCurrency(totals.discount)}` : '—'}
            </td>
            <td className="px-3 py-2 text-right text-green-600">{formatCurrency(totals.commission)}</td>
            <td className="px-3 py-2 text-right text-purple-700">{formatCurrency(totals.paid)}</td>
            <td className="px-3 py-2 text-right text-purple-700">{formatCurrency(totals.merchantGets)}</td>
            <td className={`px-3 py-2 text-right ${totals.zuprEarns >= 0 ? 'text-green-700' : 'text-red-500'}`}>
              {totals.zuprEarns >= 0 ? formatCurrency(totals.zuprEarns) : `−${formatCurrency(Math.abs(totals.zuprEarns))}`}
            </td>
            <td className="px-3 py-2" />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── main page ──────────────────────────────────────────────────────────────
export default function AdminAnalyticsPage() {
  const [allOrders, setAllOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDaily, setShowDaily] = useState(true);
  const [showMerchant, setShowMerchant] = useState(true);
  const [showOrderList, setShowOrderList] = useState(false);
  const [discountedOnly, setDiscountedOnly] = useState(false);

  // Daily row expansion
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<DailyOrderDetail[]>([]);
  const [loadingDate, setLoadingDate] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/orders')
      .then(r => r.json())
      .then(json => {
        setAllOrders(json.orders ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleDayClick(date: string) {
    if (expandedDate === date) {
      setExpandedDate(null);
      setExpandedOrders([]);
      return;
    }
    setExpandedDate(date);
    setExpandedOrders([]);
    setLoadingDate(date);
    try {
      const res = await fetch(`/api/admin/analytics/daily-orders?date=${date}`);
      const json = await res.json();
      setExpandedOrders(json.orders ?? []);
    } catch {
      setExpandedOrders([]);
    } finally {
      setLoadingDate(null);
    }
  }

  // ── top-level stats ────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
    const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const valid = allOrders.filter(o => o.status !== 'cancelled');
    const weekOrders = valid.filter(o => new Date(o.created_at) >= weekAgo);
    const monthOrders = valid.filter(o => new Date(o.created_at) >= monthStart);
    const commission = valid.reduce((s, o) => s + (o.commission_amount ?? (o.total_amount ?? 0) * 0.10), 0);
    return {
      week: weekOrders.length,
      weekRev: weekOrders.reduce((s, o) => s + (o.total_amount ?? 0), 0),
      month: monthOrders.length,
      monthRev: monthOrders.reduce((s, o) => s + (o.total_amount ?? 0), 0),
      total: valid.length,
      totalRev: valid.reduce((s, o) => s + (o.total_amount ?? 0), 0),
      commission,
    };
  }, [allOrders]);

  // ── daily rows ─────────────────────────────────────────────────────────
  const dailyRows = useMemo<DailyRow[]>(() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
    const valid = allOrders.filter(o => o.status !== 'cancelled' && new Date(o.created_at) >= cutoff);
    const byDate: Record<string, DailyRow> = {};
    for (const o of valid) {
      const date = toIST(o.created_at);
      if (!byDate[date]) byDate[date] = { date, orders: 0, customerPaid: 0, discount: 0, commission: 0, zuprPnl: 0, merchantPayout: 0 };
      const row = byDate[date];
      const sub = o.subtotal ?? o.total_amount ?? 0;
      const disc = o.discount_amount ?? 0;
      const comm = o.commission_amount ?? sub * 0.10;
      row.orders++;
      row.customerPaid += o.total_amount ?? 0;
      row.discount += disc;
      row.commission += comm;
      row.zuprPnl += comm - disc;
      row.merchantPayout += sub - comm;
    }
    return Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date));
  }, [allOrders]);

  // ── merchant settlements ───────────────────────────────────────────────
  const merchantRows = useMemo<MerchantRow[]>(() => {
    const valid = allOrders.filter(o => o.status !== 'cancelled' && o.merchant_id);
    const byMerchant: Record<string, MerchantRow> = {};
    for (const o of valid) {
      const mid = o.merchant_id!;
      if (!byMerchant[mid]) {
        byMerchant[mid] = {
          merchantId: mid,
          storeName: o.merchant?.store_name ?? mid.slice(0, 8),
          orders: 0, grossSales: 0, discount: 0, commission: 0, netPayable: 0,
        };
      }
      const row = byMerchant[mid];
      const sub = o.subtotal ?? o.total_amount ?? 0;
      const disc = o.discount_amount ?? 0;
      const comm = o.commission_amount ?? sub * 0.10;
      row.orders++;
      row.grossSales += sub;
      row.discount += disc;
      row.commission += comm;
      row.netPayable += sub - comm;
    }
    return Object.values(byMerchant).sort((a, b) => b.netPayable - a.netPayable);
  }, [allOrders]);

  // ── orders list ────────────────────────────────────────────────────────
  const orderListRows = useMemo(() => {
    const valid = allOrders.filter(o => o.status !== 'cancelled');
    const filtered = discountedOnly ? valid.filter(o => (o.discount_amount ?? 0) > 0) : valid;
    return filtered.slice(0, 100);
  }, [allOrders, discountedOnly]);

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
      <main className="px-4 py-4 space-y-6 pb-16">

        {/* ── Top stats ───────────────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-[#6B7280] mb-3 uppercase tracking-wide">This Week</h2>
          <StatsGrid stats={[
            { label: 'Orders', value: stats.week, icon: <ShoppingBag className="w-4 h-4" /> },
            { label: 'Revenue', value: formatCurrency(stats.weekRev), icon: <IndianRupee className="w-4 h-4" />, color: 'bg-green-50 text-success' },
          ]} />
        </section>
        <section>
          <h2 className="text-sm font-semibold text-[#6B7280] mb-3 uppercase tracking-wide">This Month</h2>
          <StatsGrid stats={[
            { label: 'Orders', value: stats.month, icon: <ShoppingBag className="w-4 h-4" /> },
            { label: 'Revenue', value: formatCurrency(stats.monthRev), icon: <IndianRupee className="w-4 h-4" />, color: 'bg-green-50 text-success' },
          ]} />
        </section>
        <section>
          <h2 className="text-sm font-semibold text-[#6B7280] mb-3 uppercase tracking-wide">All Time</h2>
          <StatsGrid stats={[
            { label: 'Total Orders', value: stats.total, icon: <TrendingUp className="w-4 h-4" /> },
            { label: 'Gross Revenue', value: formatCurrency(stats.totalRev), icon: <IndianRupee className="w-4 h-4" />, color: 'bg-green-50 text-success' },
            { label: 'Platform Earnings', value: formatCurrency(stats.commission), icon: <IndianRupee className="w-4 h-4" />, color: 'bg-purple-50 text-purple-600' },
          ]} />
        </section>

        {/* ── Daily breakdown with expandable rows ─────────────────────── */}
        <section>
          <SectionHeader title="Daily Orders — Last 30 Days" open={showDaily} onToggle={() => setShowDaily(v => !v)} />
          {showDaily && (
            dailyRows.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No orders in the last 30 days</p>
            ) : (
              <ScrollTable>
                <thead>
                  <tr>
                    <Th>Date</Th>
                    <Th right>Orders</Th>
                    <Th right>Customer Paid</Th>
                    <Th right>Discount</Th>
                    <Th right>
                      <span>Commission</span>
                      <span className="block text-[9px] font-normal text-gray-400 normal-case">▼ click row to expand</span>
                    </Th>
                    <Th right>Zupr P&L</Th>
                    <Th right>Merchant Payout</Th>
                  </tr>
                </thead>
                <tbody>
                  {dailyRows.map(row => {
                    const isExpanded = expandedDate === row.date;
                    const isLoading = loadingDate === row.date;
                    return (
                      <>
                        <tr
                          key={row.date}
                          onClick={() => handleDayClick(row.date)}
                          className={`cursor-pointer transition-colors ${isExpanded ? 'bg-purple-50' : 'hover:bg-gray-50'}`}
                        >
                          <Td>
                            <span className={`font-medium ${isExpanded ? 'text-purple-700' : ''}`}>
                              {fmtDate(row.date)}
                            </span>
                          </Td>
                          <Td right>{row.orders}</Td>
                          <Td right>{formatCurrency(row.customerPaid)}</Td>
                          <Td right red={row.discount > 0}>{row.discount > 0 ? `−${formatCurrency(row.discount)}` : '—'}</Td>
                          <Td right green>
                            <span className="flex items-center justify-end gap-1">
                              {isLoading
                                ? <Loader2 className="w-3 h-3 animate-spin text-purple-500" />
                                : <span className="text-[9px] text-purple-400">{isExpanded ? '▲' : '▼'}</span>
                              }
                              {formatCurrency(row.commission)}
                            </span>
                          </Td>
                          <Td right green={row.zuprPnl >= 0} red={row.zuprPnl < 0}>
                            {row.zuprPnl >= 0 ? formatCurrency(row.zuprPnl) : `−${formatCurrency(Math.abs(row.zuprPnl))}`}
                          </Td>
                          <Td right>{formatCurrency(row.merchantPayout)}</Td>
                        </tr>

                        {/* Expansion row */}
                        {isExpanded && (
                          <tr key={`${row.date}-detail`}>
                            <td colSpan={7} className="p-0 border-t border-purple-200">
                              <div className="bg-purple-50/30 border-b border-purple-100">
                                {isLoading ? (
                                  <div className="flex items-center justify-center py-6 gap-2 text-purple-500">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="text-xs">Loading orders for {fmtDate(row.date)}…</span>
                                  </div>
                                ) : expandedOrders.length === 0 ? (
                                  <p className="text-xs text-gray-400 text-center py-4">No paid orders found for this date</p>
                                ) : (
                                  <DayOrdersTable orders={expandedOrders} />
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}

                  {/* Totals row */}
                  <tr className="bg-purple-50 font-semibold">
                    <Td><span className="font-bold text-purple-700">Total</span></Td>
                    <Td right purple>{dailyRows.reduce((s, r) => s + r.orders, 0)}</Td>
                    <Td right purple>{formatCurrency(dailyRows.reduce((s, r) => s + r.customerPaid, 0))}</Td>
                    <Td right red>{dailyRows.some(r => r.discount > 0) ? `−${formatCurrency(dailyRows.reduce((s, r) => s + r.discount, 0))}` : '—'}</Td>
                    <Td right green>{formatCurrency(dailyRows.reduce((s, r) => s + r.commission, 0))}</Td>
                    <Td right green={dailyRows.reduce((s, r) => s + r.zuprPnl, 0) >= 0} red={dailyRows.reduce((s, r) => s + r.zuprPnl, 0) < 0}>
                      {(() => {
                        const v = dailyRows.reduce((s, r) => s + r.zuprPnl, 0);
                        return v >= 0 ? formatCurrency(v) : `−${formatCurrency(Math.abs(v))}`;
                      })()}
                    </Td>
                    <Td right purple>{formatCurrency(dailyRows.reduce((s, r) => s + r.merchantPayout, 0))}</Td>
                  </tr>
                </tbody>
              </ScrollTable>
            )
          )}
          {showDaily && (
            <p className="text-[11px] text-gray-400 mt-2 leading-snug">
              <span className="font-semibold">Zupr P&L</span> = Commission − Discount absorbed.
              {' '}<span className="font-semibold">Merchant Payout</span> = Subtotal − Commission.
              {' '}Click any row to see individual orders for that day.
            </p>
          )}
        </section>

        {/* ── Merchant settlements ─────────────────────────────────────── */}
        <section>
          <SectionHeader title="Merchant Settlements" open={showMerchant} onToggle={() => setShowMerchant(v => !v)} />
          {showMerchant && (
            merchantRows.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No merchant orders yet</p>
            ) : (
              <ScrollTable>
                <thead>
                  <tr>
                    <Th>Merchant</Th>
                    <Th right>Orders</Th>
                    <Th right>Gross Sales</Th>
                    <Th right>Discount</Th>
                    <Th right>Commission</Th>
                    <Th right>Net Payable</Th>
                  </tr>
                </thead>
                <tbody>
                  {merchantRows.map(row => (
                    <tr key={row.merchantId} className="hover:bg-gray-50">
                      <Td><span className="font-medium">{row.storeName}</span></Td>
                      <Td right>{row.orders}</Td>
                      <Td right>{formatCurrency(row.grossSales)}</Td>
                      <Td right red={row.discount > 0}>{row.discount > 0 ? `−${formatCurrency(row.discount)}` : '—'}</Td>
                      <Td right green>{formatCurrency(row.commission)}</Td>
                      <Td right purple>{formatCurrency(row.netPayable)}</Td>
                    </tr>
                  ))}
                </tbody>
              </ScrollTable>
            )
          )}
          {showMerchant && (
            <p className="text-[11px] text-gray-400 mt-2 leading-snug">
              <span className="font-semibold">Net Payable</span> = Gross Sales − Commission.
              Discount is absorbed by Zupr, not deducted from merchant payout.
            </p>
          )}
        </section>

        {/* ── Orders list ──────────────────────────────────────────────── */}
        <section>
          <SectionHeader title="Orders Detail" open={showOrderList} onToggle={() => setShowOrderList(v => !v)} />
          {showOrderList && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => setDiscountedOnly(false)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${!discountedOnly ? 'bg-[#7C3AED] text-white border-[#7C3AED]' : 'bg-white text-gray-500 border-gray-200'}`}
                >
                  All Orders
                </button>
                <button
                  onClick={() => setDiscountedOnly(true)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${discountedOnly ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-500 border-gray-200'}`}
                >
                  🎁 Discounted Only
                </button>
                <span className="text-xs text-gray-400 ml-auto">{orderListRows.length} orders</span>
              </div>

              {orderListRows.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No orders found</p>
              ) : (
                <ScrollTable>
                  <thead>
                    <tr>
                      <Th>Order #</Th>
                      <Th>Customer</Th>
                      <Th>Merchant</Th>
                      <Th right>Subtotal</Th>
                      <Th right>Discount</Th>
                      <Th right>Total Paid</Th>
                      <Th right>Commission</Th>
                      <Th right>Merchant Payout</Th>
                      <Th>Date</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderListRows.map(o => {
                      const sub = o.subtotal ?? o.total_amount ?? 0;
                      const disc = o.discount_amount ?? 0;
                      const comm = o.commission_amount ?? sub * 0.10;
                      const payout = sub - comm;
                      return (
                        <tr key={o.id} className="hover:bg-gray-50">
                          <Td><span className="font-mono text-[10px] text-gray-400">#{o.id.slice(-6).toUpperCase()}</span></Td>
                          <Td>
                            <div>
                              <p className="font-medium">{o.customer_name}</p>
                              <p className="text-gray-400">{o.customer_phone}</p>
                            </div>
                          </Td>
                          <Td>{o.merchant?.store_name ?? '—'}</Td>
                          <Td right>{formatCurrency(sub)}</Td>
                          <Td right red={disc > 0}>{disc > 0 ? `−${formatCurrency(disc)}` : '—'}</Td>
                          <Td right>{formatCurrency(o.total_amount ?? 0)}</Td>
                          <Td right green>{formatCurrency(comm)}</Td>
                          <Td right purple>{formatCurrency(payout)}</Td>
                          <Td>{fmtDate(toIST(o.created_at))}</Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </ScrollTable>
              )}
            </>
          )}
        </section>

      </main>
    </>
  );
}
