'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { AdminProductForm, type AdminProductFormData } from '@/components/admin/AdminProductForm';
import { updateProduct } from '@/lib/actions/products';
import { createClient } from '@/lib/supabase/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Product } from '@/types';
import toast from 'react-hot-toast';

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    Promise.all([
      supabase.from('vm_products').select('*, category:categories(id, name)').eq('id', id).single(),
      supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
    ]).then(([{ data: prod }, { data: cats }]) => {
      setProduct(prod as Product ?? null);
      setCategories(cats ?? []);
      setFetchLoading(false);
    });
  }, [id]);

  const handleSubmit = async (data: AdminProductFormData) => {
    if (!product) return;
    setSaving(true);
    try {
      await updateProduct(product.id, {
        name: data.name,
        description: data.description ?? null,
        category_id: data.category_id,
        unit: data.unit,
        mrp: data.mrp,
        selling_price: data.selling_price,
        offer_percentage: data.offer_percentage,
        tax_percentage: data.tax_percentage,
        stock_quantity: data.stock_quantity,
        low_stock_threshold: data.low_stock_threshold,
        sku: data.sku ?? null,
        is_featured: data.is_featured,
        is_active: data.is_active,
        images: data.images,
      });
      toast.success('Product updated!');
      router.push('/admin/products');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AdminHeader title="Edit Product" />
      <main className="px-4 py-4 space-y-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#1A1A1A]"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {fetchLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-40" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : !product ? (
          <div className="text-center py-12">
            <p className="text-[#6B7280]">Product not found</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
            <AdminProductForm
              initial={product}
              categories={categories}
              onSubmit={handleSubmit}
              loading={saving}
            />
          </div>
        )}
      </main>
    </>
  );
}
