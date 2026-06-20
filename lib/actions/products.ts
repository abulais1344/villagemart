'use server';

import { revalidatePath } from 'next/cache';
import { createServiceClient } from '@/lib/supabase/server';
import type { StockStatus } from '@/types';

function getStockStatus(qty: number, threshold: number): StockStatus {
  if (qty === 0) return 'out_of_stock';
  if (qty <= threshold) return 'low_stock';
  return 'in_stock';
}

function generateSKU(): string {
  return 'VM-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 5).toUpperCase();
}

export interface ProductPayload {
  name: string;
  description?: string | null;
  category_id: string;
  unit: string;
  mrp: number;
  selling_price: number;
  offer_percentage: number;
  tax_percentage: number;
  stock_quantity: number;
  low_stock_threshold: number;
  sku?: string | null;
  is_featured: boolean;
  is_active: boolean;
  is_veg?: boolean;
  images: string[];
  merchant_id?: string | null;
}

export async function createProduct(data: ProductPayload) {
  const supabase = await createServiceClient();

  const sku = data.sku?.trim() || generateSKU();
  const stock_status = getStockStatus(data.stock_quantity, data.low_stock_threshold);

  const { data: product, error } = await supabase
    .from('vm_products')
    .insert({
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
      sku,
      merchant_id: data.merchant_id ?? null,
      is_featured: data.is_featured,
      is_active: data.is_active,
      is_veg: data.is_veg ?? true,
      images: data.images,
      stock_status,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath('/admin/products');
  return product;
}

export async function updateProduct(id: string, data: ProductPayload) {
  const supabase = await createServiceClient();

  const sku = data.sku?.trim() || generateSKU();
  const stock_status = getStockStatus(data.stock_quantity, data.low_stock_threshold);

  const { error } = await supabase
    .from('vm_products')
    .update({
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
      sku,
      is_featured: data.is_featured,
      is_active: data.is_active,
      is_veg: data.is_veg ?? true,
      images: data.images,
      stock_status,
    })
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath('/admin/products');
}

export async function deleteProduct(id: string) {
  const supabase = await createServiceClient();

  const { error } = await supabase
    .from('vm_products')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath('/admin/products');
}

export async function updateStock(id: string, quantity: number, type: 'add' | 'set') {
  const supabase = await createServiceClient();

  const { data: product, error: fetchError } = await supabase
    .from('vm_products')
    .select('stock_quantity, low_stock_threshold')
    .eq('id', id)
    .single();

  if (fetchError || !product) throw new Error('Product not found');

  const newQty = type === 'add' ? product.stock_quantity + quantity : quantity;
  const stock_status = getStockStatus(newQty, product.low_stock_threshold);

  const { error } = await supabase
    .from('vm_products')
    .update({ stock_quantity: newQty, stock_status })
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath('/admin/products');
  return newQty;
}

export async function toggleProductActive(id: string, is_active: boolean) {
  const supabase = await createServiceClient();

  const { error } = await supabase
    .from('vm_products')
    .update({ is_active })
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath('/admin/products');
}

export async function deleteProductImage(url: string) {
  const supabase = await createServiceClient();

  const match = url.match(/\/storage\/v1\/object\/public\/products\/(.+)/);
  if (!match) throw new Error('Invalid image URL');

  const { error } = await supabase.storage.from('products').remove([match[1]]);

  if (error) throw new Error(error.message);
}

export async function reorderProductImages(productId: string, newOrder: string[]) {
  const supabase = await createServiceClient();

  const { error } = await supabase
    .from('vm_products')
    .update({ images: newOrder })
    .eq('id', productId);

  if (error) throw new Error(error.message);

  revalidatePath('/admin/products');
}

export async function bulkUpdateProducts(ids: string[], updates: { is_active: boolean }) {
  const supabase = await createServiceClient();

  const { error } = await supabase
    .from('vm_products')
    .update(updates)
    .in('id', ids);

  if (error) throw new Error(error.message);

  revalidatePath('/admin/products');
}

export async function bulkDeleteProducts(ids: string[]) {
  const supabase = await createServiceClient();

  const { error } = await supabase
    .from('vm_products')
    .delete()
    .in('id', ids);

  if (error) throw new Error(error.message);

  revalidatePath('/admin/products');
}
