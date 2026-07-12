import { cookies } from 'next/headers';
import { createServiceClient } from '@/lib/supabase/server';
import { MerchantMenuClient } from '@/components/merchant/MerchantMenuClient';

export default async function MerchantMenuPage() {
  const cookieStore = await cookies();
  const merchantId = cookieStore.get('merchant_session')?.value;

  let initialMenu: any[] = [];
  if (merchantId) {
    const supabase = await createServiceClient();
    const { data } = await supabase
      .from('vm_products')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('name', { ascending: true });
    initialMenu = data ?? [];
  }

  return <MerchantMenuClient initialMenu={initialMenu} />;
}
