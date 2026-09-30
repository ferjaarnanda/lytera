import React from "react";
import { PortalWallpaper } from "@/components/PortalWallpaper";

interface PortalPeranLayoutProps {
  children: React.ReactNode;
  params: Promise<{ peran: string }>;
}

export default async function PortalPeranLayout({
  children,
  params,
}: PortalPeranLayoutProps) {
  const { peran } = await params;

  // Hanya terapkan wallpaper foto untuk pasien dan fasilitas kesehatan
  // (termasuk semua sub-halaman: dashboard, rujukan, rujukan/baru, staf, dokter-petugas, dll)
  if (peran === "pasien" || peran === "fasilitas") {
    return <PortalWallpaper>{children}</PortalWallpaper>;
  }

  // Verifikasi Administrasi (verifikator) dan lainnya tidak memakai wallpaper foto
  return <>{children}</>;
}
