import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="p-1.5 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Link>
        <h1 className="text-base font-bold text-gray-900">Privacy Policy</h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <p className="text-2xl font-bold text-[#7C3AED] mb-1">Privacy Policy</p>
        <p className="text-xs text-gray-400 mb-6">Last updated: June 22, 2026</p>

        <section>
          <h2 className="font-semibold text-lg text-gray-800 mt-6 mb-2">1. Information We Collect</h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 leading-relaxed">
            <li>Name and phone number (required for login and delivery)</li>
            <li>Delivery address and GPS location (for delivery zone check)</li>
            <li>Order history and payment status</li>
            <li>Device information (for PWA/app functionality)</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-lg text-gray-800 mt-6 mb-2">2. How We Use Your Information</h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 leading-relaxed">
            <li>To process and deliver your orders</li>
            <li>To send order updates via WhatsApp (Twilio)</li>
            <li>To verify delivery zone eligibility</li>
            <li>To improve our service</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-lg text-gray-800 mt-6 mb-2">3. Third-Party Services</h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 leading-relaxed">
            <li><span className="font-medium">Razorpay:</span> processes payments; subject to Razorpay's privacy policy</li>
            <li><span className="font-medium">Google Maps:</span> used for location picker; subject to Google's privacy policy</li>
            <li><span className="font-medium">Twilio:</span> used for WhatsApp order notifications</li>
            <li><span className="font-medium">Supabase:</span> our database and backend provider</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-lg text-gray-800 mt-6 mb-2">4. Data Storage</h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 leading-relaxed">
            <li>Your data is stored securely on Supabase servers</li>
            <li>We do not sell your personal data to third parties</li>
            <li>Delivery address is stored locally on your device and synced to our servers</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-lg text-gray-800 mt-6 mb-2">5. Your Rights</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            You may request deletion of your account and data by contacting us at{' '}
            <a href="mailto:support@zupr.in" className="text-[#7C3AED] underline">support@zupr.in</a>.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-lg text-gray-800 mt-6 mb-2">6. Contact Us</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Zupr, Ardhapur, Nanded District, Maharashtra 431708
            <br />
            Email:{' '}
            <a href="mailto:support@zupr.in" className="text-[#7C3AED] underline">support@zupr.in</a>
          </p>
        </section>
      </div>
    </div>
  );
}
