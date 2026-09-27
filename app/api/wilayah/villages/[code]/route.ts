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
        { error: "Kode kecamatan wajib diisi" },
        { status: 400 }
      );
    }

    // Normalisasi: jika kode berupa 6 digit tanpa titik (mis. 317101), ubah ke 31.71.01
    if (/^\d{6}$/.test(code)) {
      code = `${code.slice(0, 2)}.${code.slice(2, 4)}.${code.slice(4)}`;
    }

    const res = await fetch(`https://wilayah.id/api/villages/${encodeURIComponent(code)}.json`, {
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Gagal memuat data kelurahan/desa dari server wilayah.id" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching villages:", error);
    return NextResponse.json(
      { error: "Gagal memuat data wilayah, periksa koneksi internet" },
      { status: 500 }
    );
  }
}
