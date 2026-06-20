'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Category } from '@/types';
import toast from 'react-hot-toast';
import Image from 'next/image';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', icon_url: '', image_url: '', sort_order: 0 });
  const supabase = createClient();

  const load = async () => {
    const { data } = await supabase.from('categories').select('*').order('sort_order');
    setCategories(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openForm = (cat?: Category) => {
    if (cat) {
      setEditing(cat);
      setForm({ name: cat.name, slug: cat.slug, icon_url: cat.icon_url ?? '', image_url: cat.image_url ?? '', sort_order: cat.sort_order });
    } else {
      setEditing(null);
      setForm({ name: '', slug: '', icon_url: '', image_url: '', sort_order: 0 });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) { toast.error('Name and slug are required'); return; }
    setSaving(true);
    if (editing) {
      await supabase.from('categories').update(form).eq('id', editing.id);
      toast.success('Category updated');
    } else {
      await supabase.from('categories').insert(form);
      toast.success('Category added');
    }
    setSaving(false);
    setShowForm(false);
    load();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    await supabase.from('categories').delete().eq('id', id);
    setCategories(prev => prev.filter(c => c.id !== id));
    toast.success('Category deleted');
  };

  return (
    <>
      <AdminHeader title="Categories" />
      <main className="px-4 py-4 space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-[#6B7280]">{categories.length} categories</p>
          <Button size="sm" onClick={() => openForm()}>
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : (
          <div className="space-y-2">
            {categories.map(cat => (
              <div key={cat.id} className="bg-white rounded-2xl border border-[#E5E7EB] p-3 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary-50 overflow-hidden flex items-center justify-center shrink-0">
                  {cat.image_url ? (
                    <Image src={cat.image_url} alt={cat.name} width={48} height={48} className="object-cover w-full h-full" />
                  ) : (
                    <span className="text-xl">🛍️</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#1A1A1A]">{cat.name}</p>
                  <p className="text-xs text-[#6B7280]">/{cat.slug} · Order: {cat.sort_order}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openForm(cat)} className="text-primary-600"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => deleteCategory(cat.id)} className="text-error"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Category' : 'Add Category'}>
        <div className="space-y-4">
          <ImageUpload bucket="merchants" onUpload={url => setForm(f => ({ ...f, image_url: url }))} currentUrl={form.image_url} label="Category Image" />
          <Input label="Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: f.slug || e.target.value.toLowerCase().replace(/\s+/g, '-') }))} placeholder="e.g. Groceries" />
          <Input label="Slug *" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="e.g. groceries" />
          <Input label="Sort Order" type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
          <Button fullWidth loading={saving} onClick={handleSave}>{editing ? 'Update' : 'Add'} Category</Button>
        </div>
      </Modal>
    </>
  );
}
