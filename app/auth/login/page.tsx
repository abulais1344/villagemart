'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase/client';
import { OTPInput } from '@/components/shared/OTPInput';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import toast from 'react-hot-toast';

function getRedirectTarget() {
  const saved = localStorage.getItem('login_redirect') || '/';
  localStorage.removeItem('login_redirect');
  return saved;
}

// Step 0 = phone entry, Step 1 = OTP entry, Step 2 = profile completion
type Step = 0 | 1 | 2;

export default function LoginPage() {
  const router = useRouter();

  const [step, setStep]               = useState<Step>(0);
  const [phone, setPhone]             = useState('');
  const firebaseUidRef                = useRef<string | null>(null);
  const [otp, setOtp]                 = useState('');
  const [name, setName]               = useState('');

  const [phoneError, setPhoneError]   = useState('');
  const [otpError, setOtpError]       = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [verifying, setVerifying]     = useState(false);
  const [resending, setResending]     = useState(false);
  const [countdown, setCountdown]     = useState(30);

  const confirmationResultRef  = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef   = useRef<RecaptchaVerifier | null>(null);

  // Countdown timer for resend button (active only on OTP step)
  useEffect(() => {
    if (step !== 1 || countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [step, countdown]);

  // Auto-submit when all 6 OTP digits are entered
  useEffect(() => {
    if (step === 1 && otp.length === 6) handleOtpSubmit(otp);
  }, [otp, step]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Initialise (or re-initialise) the invisible reCAPTCHA ──────────────────
  function initRecaptcha(): RecaptchaVerifier {
    if (recaptchaVerifierRef.current) {
      try { recaptchaVerifierRef.current.clear(); } catch {}
      recaptchaVerifierRef.current = null;
    }
    const verifier = new RecaptchaVerifier(firebaseAuth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {},
    });
    recaptchaVerifierRef.current = verifier;
    return verifier;
  }

  // ── Step 0: send OTP ────────────────────────────────────────────────────────
  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPhoneError('');
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setPhoneError('Enter a valid 10-digit Indian mobile number');
      return;
    }

    setSendLoading(true);
    try {
      const verifier = initRecaptcha();
      const result = await signInWithPhoneNumber(firebaseAuth, `+91${phone}`, verifier);
      confirmationResultRef.current = result;
      setCountdown(30);
      setOtp('');
      setStep(1);
    } catch (err: unknown) {
      console.error('signInWithPhoneNumber error:', err);
      // Clean up broken verifier so next attempt starts fresh
      if (recaptchaVerifierRef.current) {
        try { recaptchaVerifierRef.current.clear(); } catch {}
        recaptchaVerifierRef.current = null;
      }
      const msg = (err as { message?: string })?.message;
      setPhoneError(msg?.includes('TOO_SHORT') || msg?.includes('INVALID')
        ? 'Invalid phone number. Please check and try again.'
        : 'Failed to send OTP. Please try again.');
    } finally {
      setSendLoading(false);
    }
  }

  // ── Step 1: verify OTP ──────────────────────────────────────────────────────
  const handleOtpSubmit = async (code: string) => {
    if (verifying || !confirmationResultRef.current) return;
    setVerifying(true);
    setOtpError('');

    try {
      const credential = await confirmationResultRef.current.confirm(code);
      const idToken = await credential.user.getIdToken();

      const res = await fetch('/api/auth/verify-firebase-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();

      if (!data.success) {
        setOtpError(data.error ?? 'Verification failed. Please try again.');
        setOtp('');
        return;
      }

      if (data.isNewUser) {
        setPhone(data.phone);
        firebaseUidRef.current = credential.user.uid;
        setStep(2);
        return;
      }

      // Existing user — save to localStorage and go home
      const u = data.user;
      localStorage.setItem('vm_customer', JSON.stringify({
        id:                   u.id,
        name:                 u.name,
        phone:                u.phone,
        address:              u.address || '',
        landmark:             u.landmark || '',
        area:                 u.area || 'Ardhapur',
        addresses:            u.addresses || [],
        active_address_index: u.active_address_index || 0,
      }));
      toast.success(`Welcome back, ${u.name}! 👋`);
      window.location.href = getRedirectTarget();
    } catch (err: unknown) {
      console.error('OTP confirm error:', err);
      const msg = (err as { message?: string })?.message ?? '';
      setOtpError(msg.includes('invalid') || msg.includes('INVALID')
        ? 'Incorrect OTP. Please try again.'
        : 'Something went wrong. Please try again.');
      setOtp('');
    } finally {
      setVerifying(false);
    }
  };

  // ── Step 1: resend OTP ──────────────────────────────────────────────────────
  const handleResend = async () => {
    setResending(true);
    setOtpError('');
    try {
      const verifier = initRecaptcha();
      const result = await signInWithPhoneNumber(firebaseAuth, `+91${phone}`, verifier);
      confirmationResultRef.current = result;
      setCountdown(30);
      setOtp('');
      toast.success('OTP resent!');
    } catch (err) {
      console.error('Resend error:', err);
      toast.error('Failed to resend OTP. Please try again.');
    } finally {
      setResending(false);
    }
  };

  // ── Step 2: profile completion ──────────────────────────────────────────────
  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    const uid = firebaseUidRef.current;
    const payload = {
      uid,
      id: uid,
      phone, name,
      addresses:            [],
      active_address_index: 0,
    };

    const res = await fetch('/api/customer/upsert-profile', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    const result = await res.json();

    if (!result.success) {
      toast.error(result.error ?? 'Failed to save profile. Please try again.');
      return;
    }

    localStorage.setItem('vm_customer', JSON.stringify(payload));
    window.location.href = getRedirectTarget();
  }

  // ── Shared styles ───────────────────────────────────────────────────────────
  const fieldClass = 'w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent';
  const labelClass = 'block text-sm font-medium text-[#1A1A1A] mb-1.5';

  const heroTitle = step === 0 ? 'Welcome!' : step === 1 ? 'Verify OTP' : 'Complete your profile';
  const heroSub   = step === 0
    ? 'Enter your mobile number to continue'
    : step === 1
    ? `Code sent to +91 ${phone}`
    : 'Almost there';

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Invisible reCAPTCHA mount point — always in DOM */}
      <div id="recaptcha-container" />

      {/* Hero */}
      <div className="bg-gradient-to-b from-[#7C3AED] to-[#6D28D9] px-6 pt-12 pb-12 text-white">
        <button
          onClick={() => step === 0 ? router.back() : setStep(s => (s - 1) as Step)}
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
        <h1 className="text-2xl font-bold mb-1">{heroTitle}</h1>
        <p className="text-purple-200 text-sm">{heroSub}</p>
      </div>

      {/* Form area */}
      <div className="flex-1 px-6 pt-8 pb-8">

        {/* ── Step 0: phone entry ── */}
        {step === 0 && (
          <>
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">Login / Sign up</h2>
            <p className="text-sm text-[#6B7280] mb-8">We'll send a 6-digit OTP to verify your number</p>

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

              <Button type="submit" fullWidth size="lg" loading={sendLoading}>
                Send OTP
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
        )}

        {/* ── Step 1: OTP entry ── */}
        {step === 1 && (
          <>
            <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-6">
              <span className="text-3xl">📱</span>
            </div>

            <p className="text-sm text-[#6B7280] mb-8">
              Enter the 6-digit code sent to{' '}
              <span className="font-semibold text-[#1A1A1A]">+91 {phone}</span>
            </p>

            <OTPInput value={otp} onChange={setOtp} disabled={verifying} />

            {otpError && <p className="text-xs text-red-500 mt-3 text-center">{otpError}</p>}

            {verifying && (
              <div className="flex justify-center mt-6">
                <Spinner />
              </div>
            )}

            <div className="flex justify-center mt-8">
              {countdown > 0 ? (
                <p className="text-sm text-[#6B7280]">
                  Resend OTP in <span className="font-semibold text-[#7C3AED]">{countdown}s</span>
                </p>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="flex items-center gap-1.5 text-sm text-[#7C3AED] font-semibold"
                >
                  {resending ? <Spinner size="sm" /> : <RefreshCw className="w-4 h-4" />}
                  Resend OTP
                </button>
              )}
            </div>
          </>
        )}

        {/* ── Step 2: profile completion ── */}
        {step === 2 && (
          <>
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">What's your name?</h2>
            <p className="text-sm text-[#6B7280] mb-6">So we know what to call you on your orders</p>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className={labelClass}>Full Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  autoFocus
                  placeholder="Your name"
                  className={fieldClass}
                />
              </div>

              <Button type="submit" fullWidth size="lg">
                Continue
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
