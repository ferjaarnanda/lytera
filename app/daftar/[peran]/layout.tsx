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

  // Wallpaper rumah sakit untuk pasien dan fasilitas kesehatan
  if (peran === "pasien" || peran === "fasilitas") {
    return <PortalWallpaper>{children}</PortalWallpaper>;
  }

  // Wallpaper khusus verifikasi & dinkes untuk verifikator
  if (peran === "verifikator") {
    return (
      <PortalWallpaper
        src="/images/wallpaper-verifikasi-dinkes.webp"
        brightness={1.3}
      >
        {children}
      </PortalWallpaper>
    );
  }

  return <>{children}</>;
}
