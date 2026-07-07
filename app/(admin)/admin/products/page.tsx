'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import {
  Plus, Search, Edit2, Trash2, ToggleLeft, ToggleRight,
  ChevronDown, Check, Package, X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency } from '@/lib/utils/format';
import {
  deleteProduct,
  updateStock,
  toggleProductActive,
  bulkUpdateProducts,
  bulkDeleteProducts,
} from '@/lib/actions/products';
import type { Product } from '@/types';
import toast from 'react-hot-toast';
import { ProductImage } from '@/components/shared/ProductImage';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

// ─── Stock Popover ────────────────────────────────────────────────────────────
function StockPopover({
  product,
  onClose,
  onUpdated,
}: {
  product: Product;
  onClose: () => void;
  onUpdated: (id: string, newQty: number) => void;
}) {
  const [addVal, setAddVal] = useState('');
  const [setVal, setSetVal] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (type: 'add' | 'set') => {
    const raw = type === 'add' ? addVal : setVal;
    const qty = parseInt(raw, 10);
    if (isNaN(qty) || qty < 0) { toast.error('Enter a valid quantity'); return; }
    setSaving(true);
    try {
      const newQty = await updateStock(product.id, qty, type);
      toast.success('Stock updated');
      onUpdated(product.id, newQty);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update stock');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="absolute z-30 top-8 right-0 bg-white border border-[#E5E7EB] rounded-2xl shadow-xl p-4 w-56">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-[#1A1A1A]">Update Stock</p>
        <button onClick={onClose} className="text-[#6B7280] hover:text-[#1A1A1A]">
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-[#6B7280] mb-3">Current: <span className="font-bold text-[#1A1A1A]">{product.stock_quantity}</span></p>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1">+ Add stock</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              value={addVal}
              onChange={e => setAddVal(e.target.value)}
              placeholder="0"
              className="flex-1 rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <Button size="sm" onClick={() => handleSave('add')} loading={saving} disabled={!addVal}>
              Add
            </Button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1">Set stock to</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              value={setVal}
              onChange={e => setSetVal(e.target.value)}
              placeholder="0"
              className="flex-1 rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <Button size="sm" onClick={() => handleSave('set')} loading={saving} disabled={!setVal}>
              Set
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Product Row ──────────────────────────────────────────────────────────────
function ProductRow({
  product,
  selected,
  onSelect,
  onToggleActive,
  onToggleBestseller,
  onDelete,
  onStockUpdate,
  highlight,
}: {
  product: Product;
  selected: boolean;
  onSelect: (id: string) => void;
  onToggleActive: (p: Product) => void;
  onToggleBestseller: (p: Product) => void;
  onDelete: (id: string) => void;
  onStockUpdate: (id: string, qty: number) => void;
  highlight: boolean;
}) {
  const [showStock, setShowStock] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlight && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setShowStock(true);
    }
  }, [highlight]);

  const stockBadge = () => {
    if (product.stock_status === 'out_of_stock') return <Badge variant="error">Out of Stock</Badge>;
    if (product.stock_status === 'low_stock') return <Badge variant="warning">Low Stock</Badge>;
    return <Badge variant="success">In Stock</Badge>;
  };

  return (
    <div
      ref={rowRef}
      className={`bg-white rounded-2xl border p-3 transition-all ${highlight ? 'border-primary-400 ring-2 ring-primary-200' : 'border-[#E5E7EB]'}`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={() => onSelect(product.id)}
          className={`mt-1 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors
            ${selected ? 'bg-primary-600 border-primary-600' : 'border-[#D1D5DB] hover:border-primary-400'}`}
        >
          {selected && <Check className="w-3 h-3 text-white" />}
        </button>

        {/* Image */}
        <div className="w-14 h-14 rounded-xl bg-gray-50 overflow-hidden shrink-0 border border-[#E5E7EB]">
          <ProductImage images={product.images} categorySlug={(product.category as any)?.slug ?? null} alt={product.name} width={56} height={56} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-[#1A1A1A] truncate">{product.name}</p>
            {(product as any).is_bestseller && <span className="text-sm shrink-0">🔥</span>}
          </div>
          <p className="text-xs text-[#6B7280]">
            {(product.category as { name: string } | undefined)?.name ?? '—'} · {product.unit}
          </p>

          {/* Pricing row */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
            <span className="text-sm font-bold text-primary-600">{formatCurrency(product.selling_price)}</span>
            {product.mrp > product.selling_price && (
              <span className="text-xs text-[#6B7280] line-through">{formatCurrency(product.mrp)}</span>
            )}
            {product.offer_percentage > 0 && (
              <span className="text-xs font-medium text-green-600">{Math.round(product.offer_percentage)}% off</span>
            )}
          </div>

          {/* Stock + status row */}
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {/* Clickable stock number */}
            <div className="relative">
              <button
                onClick={() => setShowStock(v => !v)}
                className="text-xs font-medium bg-gray-100 hover:bg-primary-50 px-2 py-0.5 rounded-lg text-[#1A1A1A] flex items-center gap-1"
              >
                <Package className="w-3 h-3" />
                {product.stock_quantity}
                <ChevronDown className="w-3 h-3" />
              </button>
              {showStock && (
                <StockPopover
                  product={product}
                  onClose={() => setShowStock(false)}
                  onUpdated={(id, qty) => { onStockUpdate(id, qty); setShowStock(false); }}
                />
              )}
            </div>
            {stockBadge()}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 shrink-0">
          <button
            onClick={() => onToggleActive(product)}
            className={product.is_active ? 'text-success' : 'text-[#6B7280]'}
            title={product.is_active ? 'Deactivate' : 'Activate'}
          >
            {product.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
          </button>
          <button
            onClick={() => onToggleBestseller(product)}
            title={(product as any).is_bestseller ? 'Remove bestseller' : 'Mark as bestseller'}
            className={(product as any).is_bestseller ? 'text-orange-400' : 'text-gray-300'}
          >
            <span className="text-base leading-none">⭐</span>
          </button>
          <Link href={`/admin/products/${product.id}/edit`} className="text-primary-600 hover:text-primary-700" title="Edit">
            <Edit2 className="w-4 h-4" />
          </Link>
          <button onClick={() => onDelete(product.id)} className="text-error hover:text-red-700" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function AdminProductsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const merchantId   = searchParams.get('merchant_id');
  const merchantName = searchParams.get('merchant_name');

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [stockFilter, setStockFilter] = useState(searchParams.get('filter') ?? '');
  const [activeFilter, setActiveFilter] = useState('');

  const highlightId = searchParams.get('highlight') ?? '';

  const supabase = createClient();

  const load = useCallback(async () => {
    let q = supabase
      .from('vm_products')
      .select('*, category:categories(id, name, slug)')
      .order('created_at', { ascending: false })
      .limit(200);

    if (merchantId) {
      q = q.eq('merchant_id', merchantId);
    } else {
      q = q.is('merchant_id', null);
    }

    const [{ data: prods }, { data: cats }] = await Promise.all([
      q,
      supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
    ]);
    setProducts((prods as Product[]) ?? []);
    setCategories(cats ?? []);
    setLoading(false);
  }, [merchantId]);

  useEffect(() => { load(); }, [load]);

  // Filter logic
  const filtered = products.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (catFilter && p.category_id !== catFilter) return false;
    if (stockFilter && p.stock_status !== stockFilter) return false;
    if (activeFilter === 'active' && !p.is_active) return false;
    if (activeFilter === 'inactive' && p.is_active) return false;
    return true;
  });

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(p => p.id)));
    }
  };

  const handleToggleActive = async (p: Product) => {
    const next = !p.is_active;
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, is_active: next } : x));
    try {
      await toggleProductActive(p.id, next);
    } catch {
      setProducts(prev => prev.map(x => x.id === p.id ? { ...x, is_active: p.is_active } : x));
      toast.error('Failed to update status');
    }
  };

  const handleToggleBestseller = async (p: Product) => {
    const next = !(p as any).is_bestseller;
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, is_bestseller: next } : x));
    const { error } = await supabase
      .from('vm_products')
      .update({ is_bestseller: next })
      .eq('id', p.id);
    if (error) {
      setProducts(prev => prev.map(x => x.id === p.id ? { ...x, is_bestseller: (p as any).is_bestseller } : x));
      toast.error('Failed to update bestseller');
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmDelete(null);
    try {
      await deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
      toast.success('Product deleted');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const handleStockUpdate = (id: string, newQty: number) => {
    setProducts(prev => prev.map(p => {
      if (p.id !== id) return p;
      const stock_status = newQty === 0 ? 'out_of_stock' : newQty <= p.low_stock_threshold ? 'low_stock' : 'in_stock';
      return { ...p, stock_quantity: newQty, stock_status: stock_status as Product['stock_status'] };
    }));
  };

  const handleBulkActivate = async (is_active: boolean) => {
    const ids = Array.from(selected);
    try {
      await bulkUpdateProducts(ids, { is_active });
      setProducts(prev => prev.map(p => selected.has(p.id) ? { ...p, is_active } : p));
      setSelected(new Set());
      toast.success(`${ids.length} product(s) ${is_active ? 'activated' : 'deactivated'}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Bulk update failed');
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    try {
      await bulkDeleteProducts(ids);
      setProducts(prev => prev.filter(p => !selected.has(p.id)));
      setSelected(new Set());
      toast.success(`${ids.length} product(s) deleted`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Bulk delete failed');
    }
  };

  const selectClass = 'rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <>
      <AdminHeader title="Products" />
      <main className="px-4 py-4 space-y-4">

        {/* Merchant filter banner */}
        {merchantId && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-purple-700">
              Showing products for <strong>{merchantName ?? merchantId}</strong>
            </p>
            <a href="/admin/products" className="text-xs text-purple-500 underline">
              Clear filter
            </a>
          </div>
        )}

        {/* Top bar */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#6B7280]">
            {loading ? '…' : `${filtered.length} of ${products.length}`}
          </p>
          <Link href={`/admin/products/new${merchantId ? `?merchant_id=${merchantId}&merchant_name=${encodeURIComponent(merchantName ?? '')}` : ''}`}>
            <Button size="sm">
              <Plus className="w-4 h-4" /> Add Product
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Filter bar */}
        <div className="grid grid-cols-3 gap-2">
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className={selectClass}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={stockFilter} onChange={e => setStockFilter(e.target.value)} className={selectClass}>
            <option value="">All Stock</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
          <select value={activeFilter} onChange={e => setActiveFilter(e.target.value)} className={selectClass}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Bulk actions bar */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2 bg-primary-50 border border-primary-200 rounded-2xl px-4 py-3">
            <span className="text-sm font-medium text-primary-700 flex-1">{selected.size} selected</span>
            <Button size="sm" variant="secondary" onClick={() => handleBulkActivate(true)}>Activate</Button>
            <Button size="sm" variant="secondary" onClick={() => handleBulkActivate(false)}>Deactivate</Button>
            <Button size="sm" variant="danger" onClick={handleBulkDelete}>Delete</Button>
            <button onClick={() => setSelected(new Set())} className="text-primary-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Select all row */}
        {!loading && filtered.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSelectAll}
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors
                ${selected.size === filtered.length && filtered.length > 0 ? 'bg-primary-600 border-primary-600' : 'border-[#D1D5DB] hover:border-primary-400'}`}
            >
              {selected.size === filtered.length && filtered.length > 0 && <Check className="w-3 h-3 text-white" />}
            </button>
            <span className="text-xs text-[#6B7280]">
              {selected.size === filtered.length && filtered.length > 0 ? 'Deselect all' : 'Select all'}
            </span>
          </div>
        )}

        {/* Product list */}
        {loading ? (
          <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#6B7280]">No products found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(p => (
              <ProductRow
                key={p.id}
                product={p}
                selected={selected.has(p.id)}
                onSelect={toggleSelect}
                onToggleActive={handleToggleActive}
                onToggleBestseller={handleToggleBestseller}
                onDelete={id => setConfirmDelete(id)}
                onStockUpdate={handleStockUpdate}
                highlight={p.id === highlightId}
              />
            ))}
          </div>
        )}
      </main>

      {/* Delete confirm modal */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Product" size="sm">
        <p className="text-sm text-[#6B7280] mb-4">This will permanently delete the product. Are you sure?</p>
        <div className="flex gap-3">
          <Button variant="outline" fullWidth onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button variant="danger" fullWidth onClick={() => confirmDelete && handleDelete(confirmDelete)}>
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading...</div>}>
      <AdminProductsPageInner />
    </Suspense>
  );
}
