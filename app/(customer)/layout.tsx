import { BottomNav } from '@/components/customer/BottomNav';
import { FloatingCartBar } from '@/components/customer/FloatingCartBar';
import { CustomerPushSetup } from '@/components/customer/CustomerPushSetup';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {children}
      <FloatingCartBar />
      <BottomNav />
      <CustomerPushSetup />
    </div>
  );
}
