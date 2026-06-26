import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { MerchantProvider } from './MerchantProvider';
import { MerchantNav } from '@/components/merchant/MerchantNav';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  manifest: '/merchant-manifest.json',
  title: {
    default: 'Dashboard | Zupr Partner',
    template: '%s | Zupr Partner',
  },
};

export default async function MerchantPortalLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const merchantId = cookieStore.get('merchant_session')?.value;

  if (!merchantId) redirect('/merchant-login');

  const supabase = await createServiceClient();
  const { data: merchant } = await supabase
    .from('merchants')
    .select('*')
    .eq('id', merchantId)
    .single();

  if (!merchant || merchant.status !== 'approved') redirect('/merchant-login');

  return (
    <MerchantProvider merchant={merchant}>
      <div className="min-h-screen bg-gray-50 pb-20">
        {children}
        <MerchantNav />
      </div>
    </MerchantProvider>
  );
}
