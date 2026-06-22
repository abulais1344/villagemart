'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema, type ProductFormData } from '@/lib/utils/validators';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ImageUpload } from '@/components/shared/ImageUpload';
import type { Product } from '@/types';

interface ProductFormProps {
  initial?: Partial<Product>;
  categories: { id: string; name: string }[];
  onSubmit: (data: ProductFormData & { images: string[]; is_veg: boolean }) => Promise<void>;
  loading?: boolean;
}

const GENERAL_UNITS = ['piece', 'packet', 'kg', 'g (gram)', 'L (litre)', 'ml', 'dozen', 'box'];
const DEFAULT_UNITS = ['piece', 'kg', 'g', 'L', 'ml', 'packet'];

const UNIT_OPTIONS: Record<string, string[]> = {
  'Restaurants & Dhabas': ['Full Plate', 'Half Plate', 'Quarter Plate', 'Single', 'Double', 'Bowl', 'Piece', 'Per Person'],
  'Dairy': ['ml', 'L (litre)', 'g (gram)', 'kg', 'piece', 'packet'],
  'Eggs': ['piece', 'dozen (12 eggs)', 'tray (30 eggs)'],
  'Bread & Bakery': ['piece', 'loaf', 'dozen', 'packet', 'slice'],
  'Groceries': GENERAL_UNITS,
  'Snacks': GENERAL_UNITS,
  'Household': GENERAL_UNITS,
  'Personal Care': GENERAL_UNITS,
  'Baby Care': GENERAL_UNITS,
  'Fruits & Vegetables': ['kg', 'g (gram)', 'piece', 'dozen', 'bunch'],
};

function getUnitsForCategory(name: string): string[] {
  return UNIT_OPTIONS[name] ?? DEFAULT_UNITS;
}

export function ProductForm({ initial, categories, onSubmit, loading }: ProductFormProps) {
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [isVeg, setIsVeg] = useState<boolean>(initial?.is_veg ?? true);

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<ProductFormData>({
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
  const categoryId = watch('category_id');
  const discount = mrp > 0 ? Math.round(((mrp - selling) / mrp) * 100) : 0;

  const categoryName = categories.find(c => c.id === categoryId)?.name ?? '';
  const isRestaurant = categoryName === 'Restaurants & Dhabas';
  const unitOptions = getUnitsForCategory(categoryName);

  // Reset unit to first option when category changes (skip on initial mount)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setValue('unit', getUnitsForCategory(categoryName)[0]);
  }, [categoryId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fieldClass = 'w-full rounded-xl border border-[#E5E7EB] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <form onSubmit={handleSubmit((d) => onSubmit({ ...(d as ProductFormData), images, is_veg: isVeg }))} className="space-y-4">
      <ImageUpload
        bucket="products"
        onUpload={url => setImages(prev => [...prev.filter(u => u !== url), url])}
        currentUrl={images[0]}
        label="Product Image"
      />

      <Input label="Product Name *" error={errors.name?.message} {...register('name')} placeholder="e.g. Amul Milk 500ml" />

      {/* Food Type — only for restaurants */}
      {isRestaurant && (
        <div>
          <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Food Type *</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={isVeg === true}
                onChange={() => setIsVeg(true)}
                className="accent-green-600"
              />
              <span className="text-sm">🟢 Veg</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={isVeg === false}
                onChange={() => setIsVeg(false)}
                className="accent-red-500"
              />
              <span className="text-sm">🔴 Non Veg</span>
            </label>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Category *</label>
        <select {...register('category_id')} className={fieldClass}>
          <option value="">Select category</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {errors.category_id && <p className="mt-1 text-xs text-error">{errors.category_id.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Unit *</label>
        <select {...register('unit')} className={fieldClass}>
          {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
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
