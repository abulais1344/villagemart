import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="p-1.5 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Link>
        <h1 className="text-base font-bold text-gray-900">Terms &amp; Conditions</h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <p className="text-2xl font-bold text-[#7C3AED] mb-1">Terms &amp; Conditions</p>
        <p className="text-xs text-gray-400 mb-6">Last updated: June 22, 2026</p>

        <section>
          <h2 className="font-semibold text-lg text-gray-800 mt-6 mb-2">1. Acceptance of Terms</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            By using Zupr, you agree to these terms and conditions in full.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-lg text-gray-800 mt-6 mb-2">2. Service Description</h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 leading-relaxed">
            <li>Zupr is a hyperlocal grocery and food delivery platform serving Ardhapur and nearby areas within a 3.7 km delivery zone.</li>
            <li>We connect customers with local merchants and our own warehouse.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-lg text-gray-800 mt-6 mb-2">3. Eligibility</h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 leading-relaxed">
            <li>You must provide a valid Indian mobile number to use the service.</li>
            <li>Delivery is only available within our 3.7 km service zone around Ardhapur.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-lg text-gray-800 mt-6 mb-2">4. Orders &amp; Delivery</h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 leading-relaxed">
            <li>Orders are subject to product availability and merchant operating hours.</li>
            <li>Estimated delivery times are indicative and may vary.</li>
            <li>Zupr reserves the right to cancel orders in case of unavailability or force majeure.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-lg text-gray-800 mt-6 mb-2">5. Pricing</h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 leading-relaxed">
            <li>All prices are in Indian Rupees (INR) and inclusive of applicable taxes.</li>
            <li>Delivery charges may apply based on order value and distance.</li>
            <li>Free delivery may be available above a minimum order value. Check the app for current thresholds.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-lg text-gray-800 mt-6 mb-2">6. User Conduct</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            You agree not to misuse the platform, place fraudulent orders, or provide false delivery addresses.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-lg text-gray-800 mt-6 mb-2">7. Limitation of Liability</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Zupr is not liable for delays caused by third-party logistics, natural events, or circumstances beyond our control.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-lg text-gray-800 mt-6 mb-2">8. Governing Law</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            These terms are governed by the laws of India and the state of Maharashtra. Disputes shall be subject to the jurisdiction of courts in Nanded district.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-lg text-gray-800 mt-6 mb-2">9. Contact</h2>
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
