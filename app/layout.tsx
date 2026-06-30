import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import FirebaseAuthStateListener from "@/components/FirebaseAuthStateListener";

const inter = Inter({ subsets: ["latin"] });

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Zupr',
  url: 'https://zupr.in',
  description: 'Order food and groceries from local restaurants in your neighbourhood.',
  applicationCategory: 'FoodEstablishment',
  operatingSystem: 'Any',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'INR',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.5',
    ratingCount: '100',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: '19.2819',
    longitude: '77.3736',
  },
  areaServed: {
    '@type': 'City',
    name: 'Ardhapur',
  },
};

export const metadata: Metadata = {
  metadataBase: new URL('https://zupr.in'),

  title: {
    default: 'Zupr — Your neighbourhood, delivered.',
    template: '%s | Zupr',
  },
  description: 'Order food and groceries from local restaurants and stores in your neighbourhood. Fast delivery, safe payments. Bas order karo. Zupr karo.',
  keywords: ['food delivery', 'grocery delivery', 'local delivery', 'Ardhapur', 'Nanded', 'Maharashtra', 'Zupr', 'restaurant delivery', 'hyperlocal delivery'],
  authors: [{ name: 'Zupr' }],
  creator: 'Zupr',
  publisher: 'Zupr',

  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.ico',
  },

  manifest: '/manifest.json',

  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://zupr.in',
    siteName: 'Zupr',
    title: 'Zupr — Your neighbourhood, delivered.',
    description: 'Order food and groceries from local restaurants in your neighbourhood. Fast delivery. Bas order karo. Zupr karo.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Zupr — Your neighbourhood, delivered.',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Zupr — Your neighbourhood, delivered.',
    description: 'Order food and groceries from local restaurants in your neighbourhood.',
    images: ['/og-image.jpg'],
    creator: '@zuprin',
  },

  applicationName: 'Zupr',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Zupr',
  },
  formatDetection: {
    telephone: false,
  },

  alternates: {
    canonical: '/',
  },

  other: {
    'msapplication-TileColor': '#7C3AED',
    'msapplication-TileImage': '/icon-192.png',
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#7C3AED",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className} data-scroll-behavior="smooth">
      <body className="bg-white text-[#1A1A1A] min-h-screen">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ServiceWorkerRegistration />
        <FirebaseAuthStateListener />
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: '12px',
              background: '#1A1A1A',
              color: '#fff',
              fontSize: '14px',
            },
            success: {
              iconTheme: { primary: '#16A34A', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#DC2626', secondary: '#fff' },
            },
          }}
        />
      </body>
    </html>
  );
}
