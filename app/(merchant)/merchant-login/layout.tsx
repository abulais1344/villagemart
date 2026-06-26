import type { Metadata } from 'next';

export const metadata: Metadata = {
  manifest: '/merchant-manifest.json',
  title: 'Zupr Partner Login',
};

export default function MerchantLoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
