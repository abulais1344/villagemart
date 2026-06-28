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

type FormState = {
  name: string;
  slug: string;
  emoji: string;
  icon_url: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
};

const EMPTY_FORM: FormState = {
  name: '', slug: '', emoji: '', icon_url: '', image_url: '', sort_order: 0, is_active: true,
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState<Category | null>(null);
  const [saving, setSaving]         = useState(false);
  const [form, setForm]             = useState<FormState>(EMPTY_FORM);
  const supabase = createClient();

  const load = async () => {
    const { data } = await supabase.from('categories').select('*').order('sort_order');
    setCategories(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openForm = (cat?: Category) => {
    if (cat) {
      setEditing(cat);
      setForm({
        name: cat.name,
        slug: cat.slug,
        emoji: (cat as any).emoji ?? '',
        icon_url: cat.icon_url ?? '',
        image_url: cat.image_url ?? '',
        sort_order: cat.sort_order,
        is_active: cat.is_active,
      });
    } else {
      setEditing(null);
      setForm(EMPTY_FORM);
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) { toast.error('Name and slug are required'); return; }
    setSaving(true);
    const payload = {
      name: form.name,
      slug: form.slug,
      emoji: form.emoji || null,
      icon_url: form.icon_url || null,
      image_url: form.image_url || null,
      sort_order: form.sort_order,
      is_active: form.is_active,
    };
    if (editing) {
      const { error } = await supabase.from('categories').update(payload).eq('id', editing.id);
      if (error) { toast.error('Update failed'); } else { toast.success('Category updated'); }
    } else {
      const { error } = await supabase.from('categories').insert(payload);
      if (error) { toast.error('Add failed'); } else { toast.success('Category added'); }
    }
    setSaving(false);
    setShowForm(false);
    load();
  };

  const toggleActive = async (cat: Category) => {
    const next = !cat.is_active;
    setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, is_active: next } : c));
    const { error } = await supabase
      .from('categories')
      .update({ is_active: next })
      .eq('id', cat.id);
    if (error) {
      setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, is_active: cat.is_active } : c));
      toast.error('Toggle failed');
    } else {
      toast.success(next ? 'Category enabled' : 'Category hidden');
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Delete this category? This cannot be undone.')) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) { toast.error('Delete failed'); return; }
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
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center shrink-0 text-2xl">
                  {cat.image_url ? (
                    <Image src={cat.image_url} alt={cat.name} width={48} height={48} className="object-cover w-full h-full" />
                  ) : (
                    <span>{(cat as any).emoji ?? '📦'}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1A1A1A] truncate">{cat.name}</p>
                  <p className="text-xs text-[#6B7280]">/{cat.slug} · #{cat.sort_order}</p>
                </div>

                {/* is_active toggle */}
                <button
                  onClick={() => toggleActive(cat)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${cat.is_active ? 'bg-[#7C3AED]' : 'bg-gray-200'}`}
                  title={cat.is_active ? 'Visible — click to hide' : 'Hidden — click to show'}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${cat.is_active ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>

                {/* Edit / Delete */}
                <button onClick={() => openForm(cat)} className="text-primary-600 p-1"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => deleteCategory(cat.id)} className="text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
      </main>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Category' : 'Add Category'}>
        <div className="space-y-4">
          <ImageUpload
            bucket="merchants"
            onUpload={url => setForm(f => ({ ...f, image_url: url }))}
            currentUrl={form.image_url}
            label="Category Image (optional)"
          />
          <Input
            label="Name *"
            value={form.name}
            onChange={e => setForm(f => ({
              ...f,
              name: e.target.value,
              slug: f.slug || e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
            }))}
            placeholder="e.g. Groceries"
          />
          <Input
            label="Slug *"
            value={form.slug}
            onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
            placeholder="e.g. groceries"
          />
          <Input
            label="Emoji"
            value={form.emoji}
            onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
            placeholder="e.g. 🛒"
          />
          <Input
            label="Sort Order"
            type="number"
            value={form.sort_order}
            onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
          />
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${form.is_active ? 'bg-[#7C3AED]' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
            <span className="text-sm font-medium text-[#1A1A1A]">{form.is_active ? 'Visible on store' : 'Hidden from store'}</span>
          </label>
          <Button fullWidth loading={saving} onClick={handleSave}>
            {editing ? 'Update' : 'Add'} Category
          </Button>
        </div>
      </Modal>
    </>
  );
}
