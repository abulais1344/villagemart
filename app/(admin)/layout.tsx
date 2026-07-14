import type { Metadata } from 'next';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export const metadata: Metadata = {
  title: {
    default: 'Dashboard | Zupr Admin',
    template: '%s | Zupr Admin',
  },
  manifest: '/manifest-admin.json',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {children}
      <p className="text-xs text-center text-gray-400 py-4 pb-24">© 2026 Zupr. All rights reserved.</p>
      <AdminSidebar />
    </div>
  );
}
