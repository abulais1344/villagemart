'use client';

import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema, type ProductFormData } from '@/lib/utils/validators';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { useState } from 'react';
import type { Product } from '@/types';

interface ProductFormProps {
  initial?: Partial<Product>;
  categories: { id: string; name: string }[];
  onSubmit: (data: ProductFormData & { images: string[] }) => Promise<void>;
  loading?: boolean;
}

const UNITS = ['piece', 'kg', 'gram', '500g', '250g', 'litre', '500ml', '250ml', 'packet', 'dozen', 'pair'];

export function ProductForm({ initial, categories, onSubmit, loading }: ProductFormProps) {
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const { register, handleSubmit, formState: { errors }, watch } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema) as Resolver<ProductFormData>,
    defaultValues: {
      name: initial?.name ?? '',
      description: initial?.description ?? '',
      category_id: initial?.category_id ?? '',
      unit: initial?.unit ?? 'piece',
      mrp: initial?.mrp ?? 0,
      selling_price: initial?.selling_price ?? 0,
      offer_percentage: initial?.offer_percentage ?? 0,
      tax_percentage: initial?.tax_percentage ?? 0,
      stock_quantity: initial?.stock_quantity ?? 0,
      low_stock_threshold: initial?.low_stock_threshold ?? 10,
      is_active: initial?.is_active ?? true,
      is_featured: initial?.is_featured ?? false,
    },
  });

  const mrp = watch('mrp');
  const selling = watch('selling_price');
  const discount = mrp > 0 ? Math.round(((mrp - selling) / mrp) * 100) : 0;

  return (
    <form onSubmit={handleSubmit((d) => onSubmit({ ...(d as ProductFormData), images }))} className="space-y-4">
      <ImageUpload
        bucket="products"
        onUpload={url => setImages(prev => [...prev.filter(u => u !== url), url])}
        currentUrl={images[0]}
        label="Product Image"
      />

      <Input label="Product Name *" error={errors.name?.message} {...register('name')} placeholder="e.g. Amul Milk 500ml" />

      <div>
        <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Category *</label>
        <select {...register('category_id')} className="w-full rounded-xl border border-[#E5E7EB] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">Select category</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {errors.category_id && <p className="mt-1 text-xs text-error">{errors.category_id.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Unit *</label>
        <select {...register('unit')} className="w-full rounded-xl border border-[#E5E7EB] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input label="MRP (₹) *" type="number" step="0.01" error={errors.mrp?.message} {...register('mrp', { valueAsNumber: true })} />
        <div>
          <Input label="Selling Price (₹) *" type="number" step="0.01" error={errors.selling_price?.message} {...register('selling_price', { valueAsNumber: true })} />
          {discount > 0 && <p className="text-xs text-success mt-1">{discount}% discount</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input label="Stock Qty" type="number" {...register('stock_quantity', { valueAsNumber: true })} />
        <Input label="Low Stock Alert" type="number" {...register('low_stock_threshold', { valueAsNumber: true })} />
      </div>

      <Input label="Description" {...register('description')} placeholder="Optional description" />

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" {...register('is_active')} className="w-4 h-4 accent-primary-600 rounded" />
          <span className="text-sm text-[#1A1A1A]">Active</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" {...register('is_featured')} className="w-4 h-4 accent-primary-600 rounded" />
          <span className="text-sm text-[#1A1A1A]">Featured</span>
        </label>
      </div>

      <Button type="submit" fullWidth loading={loading}>
        {initial ? 'Update Product' : 'Add Product'}
      </Button>
    </form>
  );
}
