'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { MerchantHeader } from '@/components/merchant/MerchantHeader';
import { ProductForm } from '@/components/merchant/ProductForm';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/utils/format';
import type { Product } from '@/types';
import type { ProductFormData } from '@/lib/utils/validators';
import toast from 'react-hot-toast';
import { ProductImage } from '@/components/shared/ProductImage';

export default function MerchantProductsPage() {
  const { user } = useAuth();
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: m }, { data: cats }] = await Promise.all([
        supabase.from('merchants').select('id').eq('user_id', user.id).single(),
        supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
      ]);
      if (!m) { setLoading(false); return; }
      setMerchantId(m.id);
      setCategories(cats ?? []);
      loadProducts(m.id);
    };
    load();
  }, [user]);

  const loadProducts = async (mid: string) => {
    const { data } = await supabase
      .from('vm_products')
      .select('*, category:categories(*)')
      .eq('merchant_id', mid)
      .order('sort_order');
    setProducts(data as Product[] ?? []);
    setLoading(false);
  };

  const handleSave = async (data: ProductFormData & { images: string[]; is_veg: boolean }) => {
    if (!merchantId) return;
    setSaving(true);
    const offerPct = data.mrp > 0 ? ((data.mrp - data.selling_price) / data.mrp) * 100 : 0;
    const stockStatus = data.stock_quantity === 0 ? 'out_of_stock' : data.stock_quantity <= (data.low_stock_threshold ?? 10) ? 'low_stock' : 'in_stock';

    if (editing) {
      await supabase.from('vm_products').update({ ...data, merchant_id: merchantId, offer_percentage: offerPct, stock_status: stockStatus }).eq('id', editing.id);
      toast.success('Product updated');
    } else {
      await supabase.from('vm_products').insert({ ...data, merchant_id: merchantId, offer_percentage: offerPct, stock_status: stockStatus });
      toast.success('Product added');
    }
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    if (merchantId) loadProducts(merchantId);
  };

  const toggleActive = async (product: Product) => {
    await supabase.from('vm_products').update({ is_active: !product.is_active }).eq('id', product.id);
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_active: !p.is_active } : p));
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    await supabase.from('vm_products').delete().eq('id', id);
    setProducts(prev => prev.filter(p => p.id !== id));
    toast.success('Product deleted');
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <MerchantHeader />
      <main className="px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-[#1A1A1A]">Products</h1>
          <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">📦</p>
            <p className="text-[#6B7280] text-sm">No products yet. Add your first product!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(p => (
              <div key={p.id} className="bg-white rounded-2xl border border-[#E5E7EB] p-3 flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-gray-50 overflow-hidden shrink-0 border border-[#E5E7EB]">
                  <ProductImage images={p.images} categorySlug={p.category?.slug ?? null} alt={p.name} width={56} height={56} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1A1A1A] truncate">{p.name}</p>
                  <p className="text-xs text-[#6B7280]">{p.unit} · Stock: {p.stock_quantity}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-bold text-primary-600">{formatCurrency(p.selling_price)}</span>
                    <Badge variant={p.stock_status === 'out_of_stock' ? 'error' : p.stock_status === 'low_stock' ? 'warning' : 'success'}>
                      {p.stock_status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => toggleActive(p)} className={p.is_active ? 'text-success' : 'text-[#6B7280]'}>
                    {p.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button onClick={() => { setEditing(p); setShowForm(true); }} className="text-primary-600">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteProduct(p.id)} className="text-error">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditing(null); }} title={editing ? 'Edit Product' : 'Add Product'} size="lg">
        <ProductForm
          initial={editing ?? undefined}
          categories={categories}
          onSubmit={handleSave}
          loading={saving}
        />
      </Modal>
    </>
  );
}
