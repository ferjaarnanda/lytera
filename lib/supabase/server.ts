import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Buat Supabase client untuk digunakan di Server Components, Server Actions,
 * dan Route Handlers. Menggunakan cookies() async (Next.js 16).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll dipanggil dari Server Component (tidak bisa set cookie) —
            // diabaikan karena Proxy akan menangani refresh token.
          }
        },
      },
    }
  );
}
