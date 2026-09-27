import { createBrowserClient } from "@supabase/ssr";

/**
 * Buat Supabase client untuk digunakan di komponen klien (browser).
 * Hanya boleh menggunakan NEXT_PUBLIC_* key — tidak ada service role key.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
