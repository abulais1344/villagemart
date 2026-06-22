import { Header } from '@/components/customer/Header';
import { SearchPageClient } from '@/components/customer/SearchPageClient';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const initialQuery = params.q ?? '';

  return (
    <>
      <Header />
      <main className="px-4 py-4">
        <SearchPageClient initialQuery={initialQuery} />
      </main>
    </>
  );
}
