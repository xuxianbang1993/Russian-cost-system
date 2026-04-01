import { createBrowserClient } from '@supabase/ssr';

import type { Database } from '@/lib/supabase/database.types';

function getSupabaseBrowserConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Missing Supabase browser environment variables.');
  }

  return { url, anonKey };
}

export function createClient() {
  const { url, anonKey } = getSupabaseBrowserConfig();

  return createBrowserClient<Database>(url, anonKey);
}
