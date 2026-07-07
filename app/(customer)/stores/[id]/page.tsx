import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { StorePageClient } from '@/components/customer/StorePageClient';
import { BottomNav } from '@/components/customer/BottomNav';
import type { Product } from '@/types';

export const revalidate = 60;

export default async function StoreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: merchant } = await supabase
    .from('merchants')
    .select('*')
    .eq('id', id)
    .single();

  if (!merchant) notFound();

  const { data: products } = await supabase
    .from('vm_products')
    .select('*, category:categories(*)')
    .eq('merchant_id', id)
    .eq('is_active', true)
    .order('is_bestseller', { ascending: false });

  return (
    <>
      <StorePageClient merchant={merchant} products={(products ?? []) as Product[]} />
      <BottomNav />
    </>
  );
}
