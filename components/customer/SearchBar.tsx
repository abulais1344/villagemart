'use client';

import { Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (q: string) => void;
  navigates?: boolean;
}

export function SearchBar({ placeholder = 'Search products, stores...', onSearch, navigates = false }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    if (navigates) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    onSearch?.(query.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
      <input
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-gray-50 border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
      />
      {query && (
        <button
          type="button"
          onClick={() => { setQuery(''); onSearch?.(''); }}
          className="absolute right-3 top-1/2 -translate-y-1/2"
        >
          <X className="w-4 h-4 text-[#6B7280]" />
        </button>
      )}
    </form>
  );
}
