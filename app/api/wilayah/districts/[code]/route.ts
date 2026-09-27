import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{
    code: string;
  }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    let code = resolvedParams.code?.trim();

    if (!code) {
      return NextResponse.json(
        { error: "Kode kabupaten/kota wajib diisi" },
        { status: 400 }
      );
    }

    // Normalisasi: jika kode berupa 4 digit tanpa titik (mis. 3171), ubah ke 31.71
    if (/^\d{4}$/.test(code)) {
      code = `${code.slice(0, 2)}.${code.slice(2)}`;
    }

    const res = await fetch(`https://wilayah.id/api/districts/${encodeURIComponent(code)}.json`, {
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Gagal memuat data kecamatan dari server wilayah.id" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching districts:", error);
    return NextResponse.json(
      { error: "Gagal memuat data wilayah, periksa koneksi internet" },
      { status: 500 }
    );
  }
}
