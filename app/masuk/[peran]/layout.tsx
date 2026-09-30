import React from "react";
import { PortalWallpaper } from "@/components/PortalWallpaper";

interface MasukPeranLayoutProps {
  children: React.ReactNode;
  params: Promise<{ peran: string }>;
}

export default async function MasukPeranLayout({
  children,
  params,
}: MasukPeranLayoutProps) {
  const { peran } = await params;

  // Hanya terapkan wallpaper foto untuk pasien dan fasilitas kesehatan
  if (peran === "pasien" || peran === "fasilitas") {
    return <PortalWallpaper>{children}</PortalWallpaper>;
  }

  // Verifikasi Administrasi (verifikator) dan lainnya tidak memakai wallpaper foto
  return <>{children}</>;
}
