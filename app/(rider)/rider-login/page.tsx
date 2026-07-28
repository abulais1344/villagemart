import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { RiderLoginForm } from './RiderLoginForm';

export default async function RiderLoginPage() {
  const cookieStore = await cookies();
  const riderId     = cookieStore.get('rider_session')?.value;

  if (riderId) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data: rider } = await supabase
      .from('vm_riders')
      .select('id')
      .eq('id', riderId)
      .eq('is_active', true)
      .single();

    if (rider) redirect('/rider/orders');
  }

  return <RiderLoginForm />;
}
