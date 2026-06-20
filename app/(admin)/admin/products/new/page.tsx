'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { AdminProductForm, type AdminProductFormData } from '@/components/admin/AdminProductForm';
import { createProduct } from '@/lib/actions/products';
import { createClient } from '@/lib/supabase/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import toast from 'react-hot-toast';

function NewProductContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const merchantId = searchParams.get('merchant_id');
  const merchantName = searchParams.get('merchant_name');

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from('categories')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        setCategories(data ?? []);
        setCategoriesLoaded(true);
      });
  }, []);

  const restaurantCatId = categories.find(c => c.slug === 'restaurants')?.id ?? '';

  const formInitial = merchantId
    ? {
        category_id: restaurantCatId,
        unit: 'plate',
        stock_quantity: 50,
        is_featured: false,
      }
    : undefined;

  const handleSubmit = async (data: AdminProductFormData) => {
    setLoading(true);
    try {
      await createProduct({
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
        merchant_id: merchantId || null,
      });
      toast.success('Product created!');
      if (merchantId) {
        router.push(`/admin/products?merchantId=${merchantId}&merchantName=${encodeURIComponent(merchantName ?? '')}`);
      } else {
        router.push('/admin/products');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AdminHeader title="Add Product" />
      <main className="px-4 py-4 space-y-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#1A1A1A]"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
          {merchantId && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 mb-4">
              <p className="text-sm text-purple-700">
                Adding product for <strong>{merchantName}</strong>
              </p>
            </div>
          )}

          {categoriesLoaded && (
            <AdminProductForm
              categories={categories}
              initial={formInitial}
              onSubmit={handleSubmit}
              loading={loading}
            />
          )}
        </div>
      </main>
    </>
  );
}

export default function NewProductPage() {
  return (
    <Suspense>
      <NewProductContent />
    </Suspense>
  );
}
