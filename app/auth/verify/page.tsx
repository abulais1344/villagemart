'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { OTPInput } from '@/components/shared/OTPInput';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import toast from 'react-hot-toast';

function VerifyForm() {
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const router = useRouter();
  const params = useSearchParams();
  const phone = params.get('phone') ?? '';
  const supabase = createClient();

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Auto-verify when 6 digits entered
  useEffect(() => {
    if (otp.length === 6) handleVerify(otp);
  }, [otp]);

  const handleVerify = async (code: string) => {
    if (verifying) return;
    setVerifying(true);

    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token: code,
      type: 'sms',
    });

    if (error) {
      toast.error('Invalid OTP. Please try again.');
      setOtp('');
      setVerifying(false);
      return;
    }

    // Upsert user record
    if (data.user) {
      await supabase.from('vm_users').upsert({
        id: data.user.id,
        phone: phone.replace('+91', ''),
        role: 'customer',
      }, { onConflict: 'id' });

      // Fetch role and redirect
      const { data: userRecord } = await supabase
        .from('vm_users')
        .select('role')
        .eq('id', data.user.id)
        .single();

      const role = userRecord?.role ?? 'customer';
      if (role === 'admin') router.push('/admin/dashboard');
      else if (role === 'merchant') router.push('/merchant/dashboard');
      else if (role === 'rider') router.push('/rider/dashboard');
      else router.push('/');
    }
  };

  const handleResend = async () => {
    setResending(true);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('OTP resent!');
      setCountdown(30);
      setOtp('');
    }
    setResending(false);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col px-6 pt-8 pb-12">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-[#6B7280] mb-8 self-start"
      >
        <ArrowLeft className="w-5 h-5" /> Back
      </button>

      <div className="flex-1">
        <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mb-6">
          <span className="text-3xl">📱</span>
        </div>

        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">Verify OTP</h1>
        <p className="text-sm text-[#6B7280] mb-8">
          Enter the 6-digit code sent to{' '}
          <span className="font-semibold text-[#1A1A1A]">{phone}</span>
        </p>

        <OTPInput value={otp} onChange={setOtp} disabled={verifying} />

        {verifying && (
          <div className="flex justify-center mt-6">
            <Spinner />
          </div>
        )}

        <div className="flex justify-center mt-8">
          {countdown > 0 ? (
            <p className="text-sm text-[#6B7280]">
              Resend OTP in <span className="font-semibold text-primary-600">{countdown}s</span>
            </p>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending}
              className="flex items-center gap-1.5 text-sm text-primary-600 font-semibold"
            >
              {resending ? <Spinner size="sm" /> : <RefreshCw className="w-4 h-4" />}
              Resend OTP
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>}>
      <VerifyForm />
    </Suspense>
  );
}
