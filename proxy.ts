import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * proxy.ts — Next.js 16 (menggantikan middleware.ts).
 * Melindungi semua rute /portal/* agar hanya bisa diakses
 * oleh pengguna yang sudah login. Jika tidak ada sesi,
 * redirect ke /masuk dengan query ?from=<path> untuk kembali
 * setelah login berhasil.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Buat Supabase server client yang dapat membaca & menyegarkan
  // cookie sesi tanpa memerlukan cookies() dari next/headers
  // (proxy berjalan di Edge Runtime, bukan di Server Component).
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Segarkan cookie di request dan response
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Periksa sesi — ini juga menyegarkan token jika sudah kedaluwarsa
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = request.nextUrl;

  // Lindungi semua /portal/* (izinkan bypass jika ?demo=1 untuk testing/preview visual)
  if (pathname.startsWith("/portal")) {
    if (!session && request.nextUrl.searchParams.get("demo") !== "1") {
      const loginUrl = new URL("/", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Jalankan proxy hanya untuk /portal dan anak-anaknya.
     * Kecualikan _next/static, _next/image, dan favicon.
     */
    "/portal/:path*",
  ],
};
