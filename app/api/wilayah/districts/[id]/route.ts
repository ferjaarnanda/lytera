import { NextResponse } from "next/server";
import { formatRegionName } from "@/lib/region-utils";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const rawId = resolvedParams.id?.trim();

    if (!rawId) {
      return NextResponse.json(
        { error: "ID kabupaten/kota wajib diisi" },
        { status: 400 }
      );
    }

    const res = await fetch(
      `https://emsifa.github.io/api-wilayah-indonesia/api/districts/${encodeURIComponent(rawId)}.json`,
      {
        next: { revalidate: 86400 },
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Gagal memuat data kecamatan dari API wilayah" },
        { status: res.status }
      );
    }

    const data: Array<{ id: string; regency_id: string; name: string }> = await res.json();

    const normalized = (Array.isArray(data) ? data : [])
      .map((item) => ({
        id: String(item.id),
        code: String(item.id),
        name: formatRegionName(item.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "id", { sensitivity: "base" }));

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error fetching districts:", error);
    return NextResponse.json(
      { error: "Gagal memuat data wilayah, periksa koneksi internet" },
      { status: 500 }
    );
  }
}
