import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Zupr Rider Login',
};

export default function RiderLoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
