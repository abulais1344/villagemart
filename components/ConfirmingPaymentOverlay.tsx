'use client';

import { useEffect } from 'react';

/**
 * Shown while /api/parcel/create-order or the Razorpay verify-payment
 * call is in flight, after Razorpay's own "Payment Successful" screen
 * closes and before the customer is redirected to order confirmation.
 *
 * Usage:
 *   {isConfirming && <ConfirmingPaymentOverlay />}
 *
 * Gate `isConfirming` on the same state that currently drives the
 * "Confirming Payment" coin screen — this replaces that screen's
 * content, not the state logic around it.
 *
 * Animations are defined in app/globals.css (.scooter-icon, .road-line).
 */
export default function ConfirmingPaymentOverlay() {
  // Blocks back/swipe navigation and tab close while payment is
  // being confirmed. Runs only while this component is mounted, so
  // it cleans itself up the moment isConfirming flips false.
  useEffect(() => {
    const blockUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', blockUnload);

    history.pushState(null, '', location.href);
    const blockPop = () => history.pushState(null, '', location.href);
    window.addEventListener('popstate', blockPop);

    return () => {
      window.removeEventListener('beforeunload', blockUnload);
      window.removeEventListener('popstate', blockPop);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="text-center px-6">
        <svg
          width="150"
          height="100"
          viewBox="0 0 150 100"
          className="mx-auto mb-4"
          aria-hidden="true"
        >
          <line
            x1="0"
            y1="78"
            x2="150"
            y2="78"
            stroke="#E5E7EB"
            strokeWidth="2"
            strokeDasharray="6 6"
            className="road-line"
          />
          <g className="scooter-icon">
            <circle cx="46" cy="68" r="10" fill="none" stroke="#534AB7" strokeWidth="3.5" />
            <circle cx="106" cy="68" r="10" fill="none" stroke="#534AB7" strokeWidth="3.5" />
            <path d="M46 68 C40 68 38 58 46 55 L64 55 L82 68 Z" fill="#7F77DD" />
            <path d="M82 68 L106 68 L100 45 L80 45 Z" fill="#534AB7" />
            <rect x="84" y="32" width="18" height="14" rx="2" fill="#3C3489" />
            <text
              x="93"
              y="42"
              textAnchor="middle"
              fontSize="9"
              fontWeight="700"
              fill="#EEEDFE"
            >
              Z
            </text>
            <path d="M64 55 L62 38" stroke="#534AB7" strokeWidth="3" strokeLinecap="round" />
            <path d="M55 38 L69 38" stroke="#534AB7" strokeWidth="3" strokeLinecap="round" />
            <circle cx="70" cy="30" r="7" fill="#7F77DD" />
            <rect x="65" y="22" width="10" height="5" rx="2" fill="#3C3489" />
          </g>
        </svg>

        <p className="text-base font-medium text-gray-900 mb-1">
          Confirming your order
        </p>
        <p className="text-sm text-gray-500">
          Please don&apos;t go back or close this page
        </p>
      </div>
    </div>
  );
}
