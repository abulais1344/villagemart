import { createBrowserClient } from '@supabase/ssr';

function safeUrl(url: string | undefined): string {
  if (!url) return 'https://placeholder.supabase.co';
  try { new URL(url); return url; } catch { return 'https://placeholder.supabase.co'; }
}

export function createClient() {
  return createBrowserClient(
    safeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
  );
}
