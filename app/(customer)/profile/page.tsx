'use client';

import { useRouter } from 'next/navigation';
import { User, MapPin, ShoppingBag, Heart, Bell, LogOut, ChevronRight, Phone } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { Header } from '@/components/customer/Header';
import { Spinner } from '@/components/ui/Spinner';
import { formatPhone } from '@/lib/utils/format';
import toast from 'react-hot-toast';

const MENU = [
  { icon: MapPin, label: 'My Addresses', href: '/addresses' },
  { icon: ShoppingBag, label: 'My Orders', href: '/orders' },
  { icon: Heart, label: 'Wishlist', href: '/wishlist' },
  { icon: Bell, label: 'Notifications', href: '/notifications' },
];

export default function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Logged out successfully');
    router.push('/auth/login');
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      </>
    );
  }

  if (!user) {
    router.push('/auth/login');
    return null;
  }

  return (
    <>
      <Header />
      <main className="px-4 py-4 space-y-4">
        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center">
              {user.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar_url} alt="Avatar" className="w-full h-full rounded-2xl object-cover" />
              ) : (
                <User className="w-8 h-8 text-primary-600" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1A1A1A]">{user.name ?? 'Customer'}</h2>
              <div className="flex items-center gap-1 text-sm text-[#6B7280]">
                <Phone className="w-3.5 h-3.5" />
                {formatPhone(user.phone)}
              </div>
            </div>
          </div>
        </div>

        {/* Menu */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] divide-y divide-[#E5E7EB]">
          {MENU.map(({ icon: Icon, label, href }) => (
            <button
              key={href}
              onClick={() => router.push(href)}
              className="flex items-center gap-3 w-full px-4 py-4 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
                <Icon className="w-4.5 h-4.5 text-primary-600" />
              </div>
              <span className="text-sm font-medium text-[#1A1A1A] flex-1">{label}</span>
              <ChevronRight className="w-4 h-4 text-[#6B7280]" />
            </button>
          ))}
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-4 py-4 bg-white rounded-2xl border border-[#E5E7EB] text-left hover:bg-red-50 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
            <LogOut className="w-4.5 h-4.5 text-error" />
          </div>
          <span className="text-sm font-medium text-error">Logout</span>
        </button>

        <p className="text-center text-xs text-[#6B7280]">VillageMart v1.0.0</p>
      </main>
    </>
  );
}
