import React from "react";
import { PortalWallpaper } from "@/components/PortalWallpaper";

interface DaftarPeranLayoutProps {
  children: React.ReactNode;
  params: Promise<{ peran: string }>;
}

export default async function DaftarPeranLayout({
  children,
  params,
}: DaftarPeranLayoutProps) {
  const { peran } = await params;

  // Hanya terapkan wallpaper foto untuk pasien dan fasilitas kesehatan
  if (peran === "pasien" || peran === "fasilitas") {
    return <PortalWallpaper>{children}</PortalWallpaper>;
  }

  // Verifikasi Administrasi (verifikator) dan lainnya tidak memakai wallpaper foto
  return <>{children}</>;
}
