import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireMerchant } from '@/lib/auth-helpers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireMerchant();
  if (!auth.ok) return auth.response;
  const { merchantId } = auth;

  const { id } = await params;
  const body = await request.json();
  const { name, description, selling_price, mrp, unit, is_veg, is_bestseller, is_active, images } = body;

  const { data: existing, error: fetchError } = await supabase
    .from('vm_products')
    .select('merchant_id')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  if (existing.merchant_id !== merchantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('vm_products')
    .update({ name, description, selling_price, mrp, unit, is_veg, is_bestseller, is_active, images })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireMerchant();
  if (!auth.ok) return auth.response;
  const { merchantId } = auth;

  const { id } = await params;

  const { data: existing, error: fetchError } = await supabase
    .from('vm_products')
    .select('merchant_id, images')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  if (existing.merchant_id !== merchantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const imageUrl: string | undefined = existing.images?.[0];
  if (imageUrl) {
    const marker = '/storage/v1/object/public/products/';
    const idx = imageUrl.indexOf(marker);
    if (idx !== -1) {
      const storagePath = imageUrl.slice(idx + marker.length);
      await supabase.storage.from('products').remove([storagePath]);
    }
  }

  const { error } = await supabase.from('vm_products').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
