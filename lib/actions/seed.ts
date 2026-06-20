'use server';

import { revalidatePath } from 'next/cache';
import { createServiceClient } from '@/lib/supabase/server';

const SEED_PRODUCTS = [
  { name: 'Amul Milk 500ml',       category_slug: 'dairy',            unit: 'ml',    mrp: 35,  selling_price: 32,  stock: 100 },
  { name: 'Amul Milk 1L',          category_slug: 'dairy',            unit: 'litre', mrp: 65,  selling_price: 62,  stock: 80  },
  { name: 'Britannia Bread',       category_slug: 'groceries',        unit: 'piece', mrp: 45,  selling_price: 40,  stock: 50  },
  { name: 'Eggs 6-pack',           category_slug: 'dairy',            unit: 'dozen', mrp: 65,  selling_price: 60,  stock: 60  },
  { name: 'Eggs 12-pack',          category_slug: 'dairy',            unit: 'dozen', mrp: 120, selling_price: 110, stock: 40  },
  { name: "Lay's Classic Salted 26g", category_slug: 'snacks',        unit: 'gram',  mrp: 20,  selling_price: 20,  stock: 200 },
  { name: "Lay's Magic Masala 26g",   category_slug: 'snacks',        unit: 'gram',  mrp: 20,  selling_price: 20,  stock: 200 },
  { name: 'Parle-G 200g',          category_slug: 'snacks',           unit: 'gram',  mrp: 25,  selling_price: 25,  stock: 300 },
  { name: 'Tata Salt 1kg',         category_slug: 'groceries',        unit: 'kg',    mrp: 30,  selling_price: 28,  stock: 150 },
  { name: 'Aashirvaad Atta 5kg',   category_slug: 'groceries',        unit: 'kg',    mrp: 295, selling_price: 280, stock: 30  },
  { name: 'Onions 1kg',            category_slug: 'fruits-vegetables', unit: 'kg',   mrp: 40,  selling_price: 35,  stock: 80  },
  { name: 'Tomatoes 1kg',          category_slug: 'fruits-vegetables', unit: 'kg',   mrp: 45,  selling_price: 40,  stock: 80  },
  { name: 'Potatoes 1kg',          category_slug: 'fruits-vegetables', unit: 'kg',   mrp: 35,  selling_price: 30,  stock: 80  },
  { name: 'Sunflower Oil 1L',      category_slug: 'groceries',        unit: 'litre', mrp: 165, selling_price: 150, stock: 40  },
  { name: 'Tata Tea 250g',         category_slug: 'groceries',        unit: 'gram',  mrp: 100, selling_price: 95,  stock: 60  },
];

export async function seedInitialProducts(): Promise<{ inserted: number; skipped: number; errors: string[] }> {
  const supabase = await createServiceClient();

  const slugs = [...new Set(SEED_PRODUCTS.map(p => p.category_slug))];
  const { data: categories, error: catErr } = await supabase
    .from('categories')
    .select('id, slug')
    .in('slug', slugs);

  if (catErr) throw new Error('Failed to fetch categories: ' + catErr.message);

  const catMap = Object.fromEntries((categories ?? []).map(c => [c.slug, c.id]));

  const missing = slugs.filter(s => !catMap[s]);
  const errors: string[] = missing.length
    ? [`Missing categories (create them first): ${missing.join(', ')}`]
    : [];

  const { data: existing } = await supabase
    .from('vm_products')
    .select('name')
    .is('merchant_id', null);

  const existingNames = new Set((existing ?? []).map(p => p.name.toLowerCase()));

  const toInsert = SEED_PRODUCTS
    .filter(p => catMap[p.category_slug] && !existingNames.has(p.name.toLowerCase()))
    .map(p => ({
      name: p.name,
      category_id: catMap[p.category_slug],
      unit: p.unit,
      mrp: p.mrp,
      selling_price: p.selling_price,
      offer_percentage: p.mrp > p.selling_price ? Math.round(((p.mrp - p.selling_price) / p.mrp) * 100) : 0,
      tax_percentage: 0,
      stock_quantity: p.stock,
      low_stock_threshold: 10,
      stock_status: p.stock <= 10 ? 'low_stock' : 'in_stock',
      images: [],
      is_active: true,
      is_featured: false,
      merchant_id: null,
      sku: 'VM-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 5).toUpperCase(),
    }));

  const skipped = SEED_PRODUCTS.length - toInsert.length - missing.length;

  if (toInsert.length === 0) {
    revalidatePath('/admin/products');
    return { inserted: 0, skipped: SEED_PRODUCTS.length - missing.length, errors };
  }

  const { error: insertErr } = await supabase.from('vm_products').insert(toInsert);

  if (insertErr) throw new Error('Insert failed: ' + insertErr.message);

  revalidatePath('/admin/products');
  return { inserted: toInsert.length, skipped, errors };
}
