import { NextResponse } from "next/server";
import { formatRegionName } from "@/lib/region-utils";

export async function GET() {
  try {
    const res = await fetch(
      "https://emsifa.github.io/api-wilayah-indonesia/api/provinces.json",
      {
        next: { revalidate: 86400 },
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Gagal memuat data provinsi dari API wilayah" },
        { status: res.status }
      );
    }

    const data: Array<{ id: string; name: string }> = await res.json();

    const normalized = (Array.isArray(data) ? data : [])
      .map((item) => ({
        id: String(item.id),
        code: String(item.id),
        name: formatRegionName(item.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "id", { sensitivity: "base" }));

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error fetching provinces:", error);
    return NextResponse.json(
      { error: "Gagal memuat data wilayah, periksa koneksi internet" },
      { status: 500 }
    );
  }
}
