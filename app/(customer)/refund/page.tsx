import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="p-1.5 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Link>
        <h1 className="text-base font-bold text-gray-900">Refund &amp; Cancellation Policy</h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <p className="text-2xl font-bold text-[#7C3AED] mb-1">Refund &amp; Cancellation Policy</p>
        <p className="text-xs text-gray-400 mb-6">Last updated: June 22, 2026</p>

        <section>
          <h2 className="font-semibold text-lg text-gray-800 mt-6 mb-2">1. Order Cancellation</h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 leading-relaxed">
            <li>Orders can be cancelled within 2 minutes of placement, before a merchant accepts the order.</li>
            <li>Once a merchant has accepted your order, cancellation is not guaranteed.</li>
            <li>To cancel, contact us immediately on WhatsApp or call our support number.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-lg text-gray-800 mt-6 mb-2">2. Refund Eligibility</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-1">You are eligible for a full refund if:</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 leading-relaxed">
            <li>The item delivered is incorrect or damaged.</li>
            <li>The order was not delivered within 2 hours of the estimated delivery time.</li>
            <li>The merchant cancelled your order.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-lg text-gray-800 mt-6 mb-2">3. Refund Process</h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 leading-relaxed">
            <li>Approved refunds are processed within 5–7 business days.</li>
            <li>Refunds are credited to the original payment method (UPI/card via Razorpay).</li>
            <li>All payments on VillageMart are prepaid via Razorpay (UPI/card). Refunds are credited back to the original payment method.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-lg text-gray-800 mt-6 mb-2">4. Non-Refundable Cases</h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 leading-relaxed">
            <li>Perishable items (vegetables, dairy, cooked food) are non-refundable once delivered unless there is a quality issue.</li>
            <li>Refund requests made after 24 hours of delivery will not be accepted.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-lg text-gray-800 mt-6 mb-2">5. How to Raise a Refund Request</h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 leading-relaxed">
            <li>WhatsApp us at +91-XXXXXXXXXX with your order ID and issue description.</li>
            <li>Email: <a href="mailto:support@villagemart.in" className="text-[#7C3AED] underline">support@villagemart.in</a></li>
            <li>We aim to respond within 24 hours.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-lg text-gray-800 mt-6 mb-2">6. Contact</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            VillageMart, Ardhapur, Nanded District, Maharashtra 431708
            <br />
            Email:{' '}
            <a href="mailto:support@villagemart.in" className="text-[#7C3AED] underline">support@villagemart.in</a>
          </p>
        </section>
      </div>
    </div>
  );
}
