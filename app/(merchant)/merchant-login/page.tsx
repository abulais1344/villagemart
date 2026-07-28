import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { MerchantLoginForm } from './MerchantLoginForm';

/**
 * Server component so we can read the merchant_session cookie before rendering.
 * If the cookie is present and valid, redirect straight to the dashboard —
 * this is what makes the Capacitor app stay logged in after an app kill,
 * since capacitor.config.ts always opens https://www.zupr.in/merchant-login.
 */
export default async function MerchantLoginPage() {
  const cookieStore = await cookies();
  const merchantId  = cookieStore.get('merchant_session')?.value;

  if (merchantId) {
    const supabase = await createServiceClient();
    const { data: merchant } = await supabase
      .from('merchants')
      .select('id, status')
      .eq('id', merchantId)
      .eq('status', 'approved')
      .single();

    if (merchant) redirect('/merchant/dashboard');
  }

  return <MerchantLoginForm />;
}
