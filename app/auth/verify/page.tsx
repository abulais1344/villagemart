'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { OTPInput } from '@/components/shared/OTPInput';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import toast from 'react-hot-toast';

function getRedirectTarget() {
  const saved = localStorage.getItem('login_redirect') || '/';
  localStorage.removeItem('login_redirect');
  return saved;
}

function VerifyForm() {
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const router = useRouter();
  const params = useSearchParams();
  const phone = params.get('phone') ?? '';

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Auto-verify when all 6 digits are entered
  useEffect(() => {
    if (otp.length === 6) handleVerify(otp);
  }, [otp]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleVerify = async (code: string) => {
    if (verifying) return;
    setVerifying(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp: code }),
      });
      const data = await res.json();

      if (!data.success) {
        toast.error(data.error ?? 'Invalid OTP. Please try again.');
        setOtp('');
        setVerifying(false);
        return;
      }

      if (data.isNewUser) {
        // New user — collect profile details
        router.push(`/auth/login?step=2&phone=${encodeURIComponent(phone)}`);
        return;
      }

      // Existing user — save to localStorage and redirect
      const u = data.user;
      localStorage.setItem('vm_customer', JSON.stringify({
        name: u.name,
        phone: u.phone,
        address: u.address || '',
        landmark: u.landmark || '',
        area: u.area || 'Ardhapur',
        addresses: u.addresses || [],
        active_address_index: u.active_address_index || 0,
      }));
      toast.success(`Welcome back, ${u.name}! 👋`);
      window.location.href = getRedirectTarget();
    } catch {
      toast.error('Something went wrong. Please try again.');
      setOtp('');
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error ?? 'Failed to resend OTP.');
      } else {
        toast.success('OTP resent!');
        setCountdown(30);
        setOtp('');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setResending(false);
    }
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
          <span className="font-semibold text-[#1A1A1A]">+91 {phone}</span>
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
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    }>
      <VerifyForm />
    </Suspense>
  );
}
