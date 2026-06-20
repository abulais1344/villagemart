'use client';

import { useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ProductImageUpload } from '@/components/shared/ProductImageUpload';
import type { Product } from '@/types';

// Extended schema with SKU and selling_price ≤ mrp validation
const schema = z.object({
  name: z.string().min(2, 'Product name is required'),
  description: z.string().optional(),
  category_id: z.string().min(1, 'Select a category'),
  unit: z.string().min(1, 'Unit is required'),
  mrp: z.number().positive('MRP must be > 0'),
  selling_price: z.number().positive('Selling price must be > 0'),
  offer_percentage: z.number().min(0).max(100).default(0),
  tax_percentage: z.number().min(0).max(100).default(0),
  stock_quantity: z.number().int().min(0, 'Stock cannot be negative'),
  low_stock_threshold: z.number().int().min(0).default(10),
  sku: z.string().optional(),
  is_featured: z.boolean().default(false),
  is_active: z.boolean().default(true),
  images: z.array(z.string()).default([]),
}).refine(d => d.selling_price <= d.mrp, {
  message: 'Selling price must be ≤ MRP',
  path: ['selling_price'],
});

export type AdminProductFormData = z.infer<typeof schema>;

const UNITS = ['piece', 'plate', 'kg', 'gram', 'litre', 'ml', 'dozen'];
const TAX_OPTIONS = [0, 5, 12, 18];

interface AdminProductFormProps {
  initial?: Partial<Product>;
  categories: { id: string; name: string }[];
  onSubmit: (data: AdminProductFormData) => Promise<void>;
  loading?: boolean;
}

export function AdminProductForm({ initial, categories, onSubmit, loading }: AdminProductFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AdminProductFormData>({
    resolver: zodResolver(schema) as Resolver<AdminProductFormData>,
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
      sku: initial?.sku ?? '',
      is_featured: initial?.is_featured ?? false,
      is_active: initial?.is_active ?? true,
      images: initial?.images ?? [],
    },
  });

  const mrp = watch('mrp');
  const selling = watch('selling_price');
  const images = watch('images');

  // Auto-calculate offer % whenever MRP or selling price changes
  useEffect(() => {
    if (mrp > 0 && selling > 0 && selling <= mrp) {
      setValue('offer_percentage', Math.round(((mrp - selling) / mrp) * 100), { shouldValidate: false });
    }
  }, [mrp, selling, setValue]);

  const label = (text: string, required?: boolean) => (
    <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
      {text}{required && <span className="text-error ml-0.5">*</span>}
    </label>
  );

  const fieldClass = 'w-full rounded-xl border border-[#E5E7EB] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <ProductImageUpload
        images={images}
        onChange={urls => setValue('images', urls, { shouldValidate: false })}
        productId={initial?.id}
      />

      {/* Name */}
      <Input
        label="Product Name"
        error={errors.name?.message}
        placeholder="e.g. Amul Milk 500ml"
        {...register('name')}
      />

      {/* Description */}
      <div>
        {label('Description')}
        <textarea
          {...register('description')}
          rows={3}
          placeholder="Optional product description"
          className={`${fieldClass} resize-none`}
        />
      </div>

      {/* Category */}
      <div>
        {label('Category', true)}
        <select {...register('category_id')} className={fieldClass}>
          <option value="">Select category</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {errors.category_id && <p className="mt-1 text-xs text-error">{errors.category_id.message}</p>}
      </div>

      {/* Unit */}
      <div>
        {label('Unit', true)}
        <select {...register('unit')} className={fieldClass}>
          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>

      {/* MRP + Selling Price */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="MRP (₹)"
          type="number"
          step="0.01"
          min="0"
          error={errors.mrp?.message}
          {...register('mrp', { valueAsNumber: true })}
        />
        <Input
          label="Selling Price (₹)"
          type="number"
          step="0.01"
          min="0"
          error={errors.selling_price?.message}
          {...register('selling_price', { valueAsNumber: true })}
        />
      </div>

      {/* Offer % + Tax % */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          {label('Offer %')}
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            className={fieldClass}
            {...register('offer_percentage', { valueAsNumber: true })}
          />
          <p className="mt-1 text-xs text-[#6B7280]">Auto-calculated or override manually</p>
          {errors.offer_percentage && <p className="mt-1 text-xs text-error">{errors.offer_percentage.message}</p>}
        </div>
        <div>
          {label('Tax %')}
          <select {...register('tax_percentage', { valueAsNumber: true })} className={fieldClass}>
            {TAX_OPTIONS.map(t => <option key={t} value={t}>{t}%</option>)}
          </select>
        </div>
      </div>

      {/* Stock + Low Stock Threshold */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Stock Quantity"
          type="number"
          min="0"
          error={errors.stock_quantity?.message}
          {...register('stock_quantity', { valueAsNumber: true })}
        />
        <Input
          label="Low Stock Alert At"
          type="number"
          min="0"
          {...register('low_stock_threshold', { valueAsNumber: true })}
        />
      </div>

      {/* SKU */}
      <div>
        {label('SKU')}
        <input
          type="text"
          placeholder="Leave empty to auto-generate"
          className={fieldClass}
          {...register('sku')}
        />
        <p className="mt-1 text-xs text-[#6B7280]">Unique product code. Auto-generated if left blank.</p>
      </div>

      {/* Toggles */}
      <div className="flex items-center gap-6 pt-1">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div className="relative">
            <input type="checkbox" className="sr-only peer" {...register('is_active')} />
            <div className="w-10 h-6 bg-gray-200 peer-checked:bg-primary-600 rounded-full transition-colors" />
            <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
          </div>
          <span className="text-sm font-medium text-[#1A1A1A]">Active</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div className="relative">
            <input type="checkbox" className="sr-only peer" {...register('is_featured')} />
            <div className="w-10 h-6 bg-gray-200 peer-checked:bg-primary-600 rounded-full transition-colors" />
            <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
          </div>
          <span className="text-sm font-medium text-[#1A1A1A]">Featured</span>
        </label>
      </div>

      <Button type="submit" fullWidth loading={loading}>
        {initial?.id ? 'Update Product' : 'Add Product'}
      </Button>
    </form>
  );
}
