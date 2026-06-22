import { BottomNav } from '@/components/customer/BottomNav';
import { FloatingCartBar } from '@/components/customer/FloatingCartBar';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {children}
      <FloatingCartBar />
      <BottomNav />
    </div>
  );
}
