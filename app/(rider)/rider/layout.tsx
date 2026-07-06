import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { RiderProvider } from './RiderProvider';
import { RiderNav } from '@/components/rider/RiderNav';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Orders | Zupr Rider', template: '%s | Zupr Rider' },
};

export default async function RiderPortalLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const riderId = cookieStore.get('rider_session')?.value;

  if (!riderId) redirect('/rider-login');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: rider } = await supabase
    .from('riders')
    .select('*')
    .eq('id', riderId)
    .eq('is_active', true)
    .single();

  if (!rider) redirect('/rider-login');

  return (
    <RiderProvider rider={rider}>
      <div className="min-h-screen bg-gray-50 pb-20">
        {children}
        <RiderNav />
      </div>
    </RiderProvider>
  );
}
