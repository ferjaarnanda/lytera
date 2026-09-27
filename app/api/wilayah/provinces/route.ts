import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("https://wilayah.id/api/provinces.json", {
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Gagal memuat data provinsi dari server wilayah.id" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching provinces:", error);
    return NextResponse.json(
      { error: "Gagal memuat data wilayah, periksa koneksi internet" },
      { status: 500 }
    );
  }
}
