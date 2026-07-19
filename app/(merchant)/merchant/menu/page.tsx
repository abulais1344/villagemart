import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { MerchantMenuClient } from '@/components/merchant/MerchantMenuClient';

export const dynamic = 'force-dynamic';

export default async function MerchantMenuPage() {
  const cookieStore = await cookies();
  const merchantId = cookieStore.get('merchant_session')?.value;

  let initialMenu: any[] = [];
  if (merchantId) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data } = await supabase
      .from('vm_products')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('name', { ascending: true });
    initialMenu = data ?? [];
  }

  return <MerchantMenuClient initialMenu={initialMenu} />;
}
