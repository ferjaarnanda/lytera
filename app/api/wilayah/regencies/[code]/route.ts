import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{
    code: string;
  }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const rawCode = resolvedParams.code?.trim();

    if (!rawCode) {
      return NextResponse.json(
        { error: "Kode provinsi wajib diisi" },
        { status: 400 }
      );
    }

    const res = await fetch(`https://wilayah.id/api/regencies/${encodeURIComponent(rawCode)}.json`, {
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Gagal memuat data kabupaten/kota dari server wilayah.id" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching regencies:", error);
    return NextResponse.json(
      { error: "Gagal memuat data wilayah, periksa koneksi internet" },
      { status: 500 }
    );
  }
}
