'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useMerchant } from '../MerchantProvider';
import { MerchantHeader } from '@/components/merchant/MerchantHeader';
import { Plus, X, Camera } from 'lucide-react';
import toast from 'react-hot-toast';

function getFoodEmoji(name: string): string {
  if (name.includes('Dal'))                              return '🍲';
  if (name.includes('Roti'))                             return '🫓';
  if (name.includes('Rice') || name.includes('Jeera'))   return '🍚';
  if (name.includes('Sabzi'))                            return '🥘';
  if (name.includes('Chai'))                             return '☕';
  if (name.includes('Lassi'))                            return '🥛';
  if (name.includes('Poha'))                             return '🍽️';
  if (name.includes('Combo') || name.includes('Thali'))  return '🍱';
  if (name.includes('Biryani'))                          return '🍛';
  if (name.includes('Paneer'))                           return '🧀';
  if (name.includes('Mandi'))                            return '🍖';
  return '🍴';
}

function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const img = new Image();
    img.onload = () => {
      const MAX = 800;
      let w = img.width, h = img.height;
      if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
      else { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.8);
    };
    img.src = URL.createObjectURL(file);
  });
}

const UNITS = ['plate', 'piece', 'kg', 'half', 'full', 'bottle', 'bowl', 'glass'];
const EMPTY_FORM = {
  name: '',
  description: '',
  selling_price: '',
  mrp: '',
  unit: 'plate',
  is_veg: false,
  is_bestseller: false,
  is_active: true,
};
const TOGGLES: { label: string; key: 'is_veg' | 'is_bestseller' | 'is_active' }[] = [
  { label: '🟢 Veg item', key: 'is_veg' },
  { label: '🔥 Bestseller', key: 'is_bestseller' },
  { label: '✅ Available (in stock)', key: 'is_active' },
];

export default function MerchantMenuPage() {
  const merchant = useMerchant();
  const supabase = createClient();

  const [menu, setMenu] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<any | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);
  const touchHandled = useRef(false);

  useEffect(() => { loadMenu(); }, []);

  async function loadMenu() {
    const { data } = await supabase
      .from('vm_products')
      .select('*')
      .eq('merchant_id', merchant.id)
      .order('name', { ascending: true });
    setMenu(data ?? []);
    setLoading(false);
  }

  async function toggleAvailable(productId: string, currentState: boolean) {
    await supabase.from('vm_products').update({ is_active: !currentState }).eq('id', productId);
    setMenu(prev => prev.map(p => p.id === productId ? { ...p, is_active: !currentState } : p));
  }

  async function toggleBestseller(productId: string, currentState: boolean) {
    setMenu(prev => prev.map(p => p.id === productId ? { ...p, is_bestseller: !currentState } : p));
    const res = await fetch('/api/merchant/products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: productId, is_bestseller: !currentState }),
    });
    if (!res.ok) {
      setMenu(prev => prev.map(p => p.id === productId ? { ...p, is_bestseller: currentState } : p));
    }
  }

  function handleTouchStart(product: any) {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setDeleteProduct(product);
    }, 600);
  }

  function handleTouchEnd(product: any) {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (!isLongPress.current) {
      touchHandled.current = true;
      openForm(product);
      setTimeout(() => { touchHandled.current = false; }, 400);
    }
    isLongPress.current = false;
  }

  function handleTouchMove() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    isLongPress.current = false;
  }

  function openForm(product: any | null) {
    if (product) {
      setEditProduct(product);
      setForm({
        name: product.name ?? '',
        description: product.description ?? '',
        selling_price: String(product.selling_price ?? ''),
        mrp: String(product.mrp ?? ''),
        unit: product.unit ?? 'plate',
        is_veg: !!product.is_veg,
        is_bestseller: !!product.is_bestseller,
        is_active: product.is_active !== false,
      });
      setImagePreview(product.images?.[0] ?? '');
    } else {
      setEditProduct(null);
      setForm({ ...EMPTY_FORM });
      setImagePreview('');
    }
    setImageFile(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditProduct(null);
    setImageFile(null);
    setImagePreview('');
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0];
    if (!raw) return;
    const compressed = await compressImage(raw);
    const compressedFile = new File([compressed], raw.name, { type: 'image/jpeg' });
    setImageFile(compressedFile);
    setImagePreview(URL.createObjectURL(compressed));
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Product name is required'); return; }
    if (!form.selling_price) { toast.error('Selling price is required'); return; }

    setSaving(true);
    let imageUrl: string | undefined;

    try {
      if (imageFile) {
        setUploading(true);
        const fd = new FormData();
        fd.append('file', imageFile);
        const uploadRes = await fetch('/api/merchant/products/upload', { method: 'POST', body: fd });
        setUploading(false);
        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          toast.error(err.error ?? 'Image upload failed');
          setSaving(false);
          return;
        }
        const { url } = await uploadRes.json();
        imageUrl = url;
      }

      const sellingPrice = Number(form.selling_price);
      const mrpValue = Number(form.mrp) || sellingPrice;
      const images = imageUrl ? [imageUrl] : (editProduct?.images ?? []);

      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        selling_price: sellingPrice,
        mrp: mrpValue,
        unit: form.unit,
        is_veg: form.is_veg,
        is_bestseller: form.is_bestseller,
        is_active: form.is_active,
        images,
      };

      let res: Response;
      if (editProduct) {
        res = await fetch(`/api/merchant/products/${editProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/merchant/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? 'Failed to save product');
        setSaving(false);
        return;
      }

      const { product } = await res.json();
      if (editProduct) {
        setMenu(prev => prev.map(p => p.id === editProduct.id ? product : p));
        toast.success('Item updated');
      } else {
        setMenu(prev => [...prev, product].sort((a, b) => a.name.localeCompare(b.name)));
        toast.success('Item added');
      }
      closeForm();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!deleteProduct) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/merchant/products/${deleteProduct.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? 'Delete failed');
        return;
      }
      setMenu(prev => prev.filter(p => p.id !== deleteProduct.id));
      toast.success('Item deleted');
      setDeleteProduct(null);
    } catch {
      toast.error('Something went wrong');
    } finally {
      setDeleting(false);
    }
  }

  const uniqueCategories = Array.from(new Set(menu.map(p => p.description).filter(Boolean)));

  return (
    <>
      <MerchantHeader storeName={merchant.store_name} />
      <main className="px-4 py-4 pb-32">
        <p className="text-sm text-gray-500 mb-4">{menu.length} items · Tap to edit · Hold to delete</p>

        {loading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : menu.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-2">🍽️</p>
            <p className="text-sm text-gray-500">No menu items yet</p>
            <p className="text-xs text-gray-400 mt-1">Tap + to add your first item</p>
          </div>
        ) : (
          menu.map(product => {
            const discount =
              Number(product.mrp) > Number(product.selling_price)
                ? Math.round((1 - Number(product.selling_price) / Number(product.mrp)) * 100)
                : 0;
            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl p-4 border border-gray-100 mb-3 flex items-center justify-between gap-3 select-none cursor-pointer"
                onTouchStart={() => handleTouchStart(product)}
                onTouchEnd={() => handleTouchEnd(product)}
                onTouchMove={handleTouchMove}
                onClick={() => { if (!touchHandled.current) openForm(product); }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-2xl overflow-hidden shrink-0 relative">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <span>{getFoodEmoji(product.name)}</span>
                    )}
                    {discount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[8px] font-bold px-1 rounded-full leading-4">
                        {discount}%
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-gray-900 truncate">{product.name}</p>
                      {product.is_bestseller && (
                        <span className="text-[10px] text-orange-600 font-semibold whitespace-nowrap">🔥 Bestseller</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm text-gray-900 font-semibold">₹{product.selling_price}</p>
                      {discount > 0 && (
                        <p className="text-xs text-gray-400 line-through">₹{product.mrp}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className="flex items-center gap-3 shrink-0"
                  onTouchStart={e => e.stopPropagation()}
                  onTouchEnd={e => e.stopPropagation()}
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={() => toggleBestseller(product.id, !!product.is_bestseller)}
                    title={product.is_bestseller ? 'Remove bestseller' : 'Mark as bestseller'}
                    className="flex flex-col items-center"
                  >
                    <span className={`text-xl leading-none ${product.is_bestseller ? 'text-orange-400' : 'text-gray-200'}`}>⭐</span>
                  </button>

                  <button
                    onClick={() => toggleAvailable(product.id, product.is_active)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      product.is_active ? 'bg-[#7C3AED]' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      product.is_active ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </main>

      <button
        onClick={() => openForm(null)}
        className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-[#7C3AED] text-white shadow-xl flex items-center justify-center"
      >
        <Plus className="w-7 h-7" />
      </button>

      {deleteProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6"
          onClick={() => setDeleteProduct(null)}
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <p className="font-bold text-gray-900 mb-1">Delete this item?</p>
            <p className="text-sm text-gray-500 mb-4">&ldquo;{deleteProduct.name}&rdquo; will be permanently removed.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteProduct(null)}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={closeForm} />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl max-h-[92vh] overflow-y-auto">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <p className="font-bold text-gray-900 text-base">
                {editProduct ? 'Edit item' : 'Add new item'}
              </p>
              <button onClick={closeForm} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div
                className="w-full h-36 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden cursor-pointer bg-gray-50"
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="preview" className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Camera className="w-8 h-8" />
                    <p className="text-xs">Tap to add photo</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Product Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Dal Tadka"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7C3AED]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Main Course"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7C3AED]"
                />
                {uniqueCategories.length > 0 && (
                  <div className="flex gap-2 mt-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                    {uniqueCategories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setForm(f => ({ ...f, description: cat }))}
                        className={`whitespace-nowrap text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                          form.description === cat
                            ? 'bg-[#7C3AED] text-white border-[#7C3AED]'
                            : 'bg-white text-gray-600 border-gray-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={form.selling_price}
                    onChange={e => setForm(f => ({ ...f, selling_price: e.target.value }))}
                    placeholder="0"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">MRP (₹)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={form.mrp}
                    onChange={e => setForm(f => ({ ...f, mrp: e.target.value }))}
                    placeholder="0"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>
              </div>
              {Number(form.selling_price) > 0 && Number(form.mrp) > Number(form.selling_price) && (
                <p className="text-xs text-green-600 font-medium -mt-2">
                  {Math.round((1 - Number(form.selling_price) / Number(form.mrp)) * 100)}% discount shown to customers
                </p>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Unit</label>
                <select
                  value={form.unit}
                  onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7C3AED] bg-white"
                >
                  {UNITS.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                {TOGGLES.map(t => (
                  <div key={t.key} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{t.label}</span>
                    <button
                      onClick={() => setForm(f => ({ ...f, [t.key]: !f[t.key] }))}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        form[t.key] ? 'bg-[#7C3AED]' : 'bg-gray-300'
                      }`}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        form[t.key] ? 'left-7' : 'left-1'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSave}
                disabled={saving || uploading}
                className="w-full bg-[#7C3AED] disabled:opacity-50 text-white font-bold rounded-xl py-4 text-sm"
              >
                {uploading ? 'Uploading image…' : saving ? 'Saving…' : editProduct ? 'Update Item' : 'Add Item'}
              </button>
            </div>
            <div className="pb-8" />
          </div>
        </>
      )}
    </>
  );
}
