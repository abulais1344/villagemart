'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

function getRedirectTarget() {
  const saved = localStorage.getItem('login_redirect') || '/';
  localStorage.removeItem('login_redirect');
  return saved;
}

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [area, setArea] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [checkLoading, setCheckLoading] = useState(false);

  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPhoneError('');
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setPhoneError('Enter a valid 10-digit Indian mobile number');
      return;
    }

    setCheckLoading(true);
    const supabase = createClient();
    // Match all common storage formats: 10-digit, 91-prefix, +91-prefix
    const { data, error } = await supabase
      .from('vm_users')
      .select('name, phone, address, landmark, area, addresses, active_address_index')
      .or(`phone.eq.${phone},phone.eq.91${phone},phone.eq.+91${phone}`)
      .maybeSingle();
    setCheckLoading(false);
    if (error) console.error('vm_users lookup error:', error.message);

    if (data?.name) {
      // Returning customer — skip step 2
      localStorage.setItem('vm_customer', JSON.stringify({
        name: data.name,
        phone: data.phone,
        address: data.address || '',
        landmark: data.landmark || '',
        area: data.area || '',
        addresses: data.addresses || [],
        active_address_index: data.active_address_index || 0,
      }));
      toast.success(`Welcome back, ${data.name}! 👋`);
      setTimeout(() => {
        window.location.href = getRedirectTarget();
      }, 500);
    } else {
      // New customer — go to step 2, pre-fill name if partial record exists
      if (data?.name) setName(data.name);
      setStep(2);
    }
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();

    await supabase.from('vm_users').upsert(
      { phone, name, address, landmark, area },
      { onConflict: 'phone' }
    );

    localStorage.setItem('vm_customer', JSON.stringify({ name, phone, address, landmark, area }));
    window.location.href = getRedirectTarget();
  }

  const fieldClass = 'w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent';
  const labelClass = 'block text-sm font-medium text-[#1A1A1A] mb-1.5';

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Hero */}
      <div className="bg-gradient-to-b from-[#7C3AED] to-[#6D28D9] px-6 pt-12 pb-12 text-white">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-purple-200 hover:text-white mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Back</span>
        </button>
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
            <span className="text-xl font-black text-[#7C3AED]">Z</span>
          </div>
          <span className="text-2xl font-bold">Zupr</span>
        </div>
        <h1 className="text-2xl font-bold mb-1">
          {step === 1 ? 'Welcome!' : 'Complete your profile'}
        </h1>
        <p className="text-purple-200 text-sm">
          {step === 1 ? 'Enter your mobile number to continue' : 'Tell us where to deliver'}
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 pt-8 pb-8">
        {step === 1 ? (
          <>
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">Login / Sign up</h2>
            <p className="text-sm text-[#6B7280] mb-8">Enter your mobile number to continue</p>

            <form onSubmit={handlePhoneSubmit} className="space-y-5">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 border-r border-[#E5E7EB] pr-2.5">
                  <span className="text-base">🇮🇳</span>
                  <span className="text-sm font-medium text-[#1A1A1A]">+91</span>
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={e => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setPhoneError(''); }}
                  placeholder="Enter mobile number"
                  className={`w-full pl-20 pr-4 py-3.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent ${phoneError ? 'border-red-400' : 'border-[#E5E7EB]'}`}
                />
              </div>
              {phoneError && <p className="text-xs text-red-500">{phoneError}</p>}

              <Button type="submit" fullWidth size="lg" loading={checkLoading}>
                Continue
              </Button>
            </form>

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-[#E5E7EB]" />
              <span className="text-xs text-[#9CA3AF] font-medium">OR</span>
              <div className="flex-1 h-px bg-[#E5E7EB]" />
            </div>

            <button
              type="button"
              onClick={() => router.back()}
              className="w-full py-3 rounded-xl border border-[#E5E7EB] text-sm font-semibold text-[#6B7280] hover:bg-gray-50 transition-colors"
            >
              Continue as Guest
            </button>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">Almost there!</h2>
            <p className="text-sm text-[#6B7280] mb-6">Tell us where to deliver your order</p>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className={labelClass}>Full Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  placeholder="Your name"
                  className={fieldClass}
                />
              </div>

              <div>
                <label className={labelClass}>Mobile Number</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 border-r border-[#E5E7EB] pr-2.5">
                    <span className="text-base">🇮🇳</span>
                    <span className="text-sm font-medium text-[#6B7280]">+91</span>
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    readOnly
                    className="w-full pl-20 pr-4 py-3 rounded-xl border border-[#E5E7EB] text-sm bg-gray-50 text-[#6B7280]"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Delivery Address *</label>
                <textarea
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  required
                  rows={2}
                  placeholder="House no, Street, Area"
                  className={`${fieldClass} resize-none`}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Landmark <span className="text-[#6B7280] font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={landmark}
                  onChange={e => setLandmark(e.target.value)}
                  placeholder="Near school, mosque, temple..."
                  className={fieldClass}
                />
              </div>

              <div>
                <label className={labelClass}>Village / Area *</label>
                <input
                  type="text"
                  value={area}
                  onChange={e => setArea(e.target.value)}
                  required
                  placeholder="e.g. Ardhapur"
                  className={fieldClass}
                />
              </div>

              <Button type="submit" fullWidth size="lg">
                Save & Continue
              </Button>
            </form>
          </>
        )}

        <p className="text-xs text-[#6B7280] text-center mt-8">
          By continuing, you agree to our{' '}
          <Link href="/terms" className="text-[#7C3AED]">Terms of Service</Link> and{' '}
          <Link href="/privacy" className="text-[#7C3AED]">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
