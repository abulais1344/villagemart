'use client';

import { useEffect, useState } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { formatCurrency } from '@/lib/utils/format';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface Dish { name: string; times_ordered: number; total_qty: number }
interface Customer { phone: string; name: string; order_count: number; lifetime_value: number }
interface CartAdd { name: string; count: number }

type DishSortCol = 'times_ordered' | 'total_qty';
type CustomerSortCol = 'order_count' | 'lifetime_value';
type Dir = 'desc' | 'asc';

function SortHeader({ label, col, active, dir, onSort }: {
  label: string;
  col: string;
  active: boolean;
  dir: Dir;
  onSort: (col: string) => void;
}) {
  return (
    <button
      onClick={() => onSort(col)}
      className={`flex items-center gap-0.5 font-semibold text-xs uppercase tracking-wide whitespace-nowrap ${active ? 'text-[#7C3AED]' : 'text-gray-400 hover:text-gray-600'}`}
    >
      {label}
      {active ? (dir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />) : null}
    </button>
  );
}

export default function InsightsPage() {
  const [loading, setLoading] = useState(true);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cartAdds, setCartAdds] = useState<CartAdd[]>([]);

  const [dishSort, setDishSort] = useState<{ col: DishSortCol; dir: Dir }>({ col: 'times_ordered', dir: 'desc' });
  const [custSort, setCustSort] = useState<{ col: CustomerSortCol; dir: Dir }>({ col: 'order_count', dir: 'desc' });

  useEffect(() => {
    fetch('/api/admin/insights')
      .then(r => r.json())
      .then(d => {
        setDishes(d.topDishes ?? []);
        setCustomers(d.frequentCustomers ?? []);
        setCartAdds(d.cartAdds ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  function toggleDishSort(col: string) {
    setDishSort(prev =>
      prev.col === col
        ? { col: col as DishSortCol, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
        : { col: col as DishSortCol, dir: 'desc' }
    );
  }

  function toggleCustSort(col: string) {
    setCustSort(prev =>
      prev.col === col
        ? { col: col as CustomerSortCol, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
        : { col: col as CustomerSortCol, dir: 'desc' }
    );
  }

  const sortedDishes = [...dishes].sort((a, b) =>
    dishSort.dir === 'desc' ? b[dishSort.col] - a[dishSort.col] : a[dishSort.col] - b[dishSort.col]
  );

  const sortedCustomers = [...customers].sort((a, b) =>
    custSort.dir === 'desc' ? b[custSort.col] - a[custSort.col] : a[custSort.col] - b[custSort.col]
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <AdminHeader title="Insights" />

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-8">

        {loading && (
          <p className="text-center text-gray-400 text-sm py-12">Loading…</p>
        )}

        {/* ── Top dishes ─────────────────────────────────────────────────── */}
        {!loading && (
          <section>
            <h2 className="text-sm font-bold text-gray-900 mb-3">Top Dishes <span className="text-gray-400 font-normal">(delivered, last 180 days)</span></h2>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-full">Product</th>
                      <th className="px-4 py-3 text-right">
                        <SortHeader label="Orders" col="times_ordered" active={dishSort.col === 'times_ordered'} dir={dishSort.dir} onSort={toggleDishSort} />
                      </th>
                      <th className="px-4 py-3 text-right">
                        <SortHeader label="Qty" col="total_qty" active={dishSort.col === 'total_qty'} dir={dishSort.dir} onSort={toggleDishSort} />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDishes.length === 0 && (
                      <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400 text-xs">No delivered orders yet</td></tr>
                    )}
                    {sortedDishes.map((d, i) => (
                      <tr key={d.name} className={i % 2 === 0 ? '' : 'bg-gray-50/50'}>
                        <td className="px-4 py-2.5 text-gray-900 font-medium">{d.name}</td>
                        <td className="px-4 py-2.5 text-right font-tabular-nums text-gray-700">{d.times_ordered}</td>
                        <td className="px-4 py-2.5 text-right font-tabular-nums text-gray-700">{d.total_qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ── Frequent customers ─────────────────────────────────────────── */}
        {!loading && (
          <section>
            <h2 className="text-sm font-bold text-gray-900 mb-3">Frequent Customers <span className="text-gray-400 font-normal">(delivered, last 180 days)</span></h2>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Customer</th>
                      <th className="px-4 py-3 text-right">
                        <SortHeader label="Orders" col="order_count" active={custSort.col === 'order_count'} dir={custSort.dir} onSort={toggleCustSort} />
                      </th>
                      <th className="px-4 py-3 text-right">
                        <SortHeader label="LTV" col="lifetime_value" active={custSort.col === 'lifetime_value'} dir={custSort.dir} onSort={toggleCustSort} />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCustomers.length === 0 && (
                      <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400 text-xs">No delivered orders yet</td></tr>
                    )}
                    {sortedCustomers.map((c, i) => (
                      <tr key={c.phone} className={i % 2 === 0 ? '' : 'bg-gray-50/50'}>
                        <td className="px-4 py-2.5">
                          <p className="text-gray-900 font-medium">{c.name || '—'}</p>
                          <p className="text-xs text-gray-400 font-tabular-nums">{c.phone}</p>
                        </td>
                        <td className="px-4 py-2.5 text-right font-tabular-nums text-gray-700">{c.order_count}</td>
                        <td className="px-4 py-2.5 text-right font-tabular-nums text-gray-700">{formatCurrency(c.lifetime_value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ── Cart adds ──────────────────────────────────────────────────── */}
        {!loading && (
          <section>
            <h2 className="text-sm font-bold text-gray-900 mb-1">Cart Adds <span className="text-gray-400 font-normal">(last 180 days)</span></h2>
            <p className="text-xs text-gray-400 mb-3">
              Products added to cart most often. Purchase-correlation requires customer_id — now logged going forward; historical data had null.
            </p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-full">Product</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Cart Adds</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cartAdds.length === 0 && (
                      <tr><td colSpan={2} className="px-4 py-6 text-center text-gray-400 text-xs">No add_to_cart events yet</td></tr>
                    )}
                    {cartAdds.map((c, i) => (
                      <tr key={c.name} className={i % 2 === 0 ? '' : 'bg-gray-50/50'}>
                        <td className="px-4 py-2.5 text-gray-900 font-medium">{c.name}</td>
                        <td className="px-4 py-2.5 text-right font-tabular-nums text-gray-700">{c.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ── Store-visit patterns (placeholder) ────────────────────────── */}
        {!loading && (
          <section>
            <h2 className="text-sm font-bold text-gray-900 mb-1">Store-Visit Patterns</h2>
            <p className="text-xs text-gray-400 mb-3">Which stores get the most visits, browse-to-order conversion rate.</p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
              <p className="text-sm text-gray-500 font-medium">Coming soon</p>
              <p className="text-xs text-gray-400 mt-1">
                store_visit events had null customer_id and metadata until today — data starts accumulating now that the bug is fixed.
              </p>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
