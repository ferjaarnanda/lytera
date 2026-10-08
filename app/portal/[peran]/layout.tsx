import React from "react";
import { PortalWallpaper } from "@/components/PortalWallpaper";
import { TeraWidget } from "@/components/Tera";
import { TeraRole } from "@/lib/tera/types";

interface PortalPeranLayoutProps {
  children: React.ReactNode;
  params: Promise<{ peran: string }>;
}

export default async function PortalPeranLayout({
  children,
  params,
}: PortalPeranLayoutProps) {
  const { peran } = await params;
  const mappedRole = (peran === "fasilitas" ? "puskesmas" : peran) as TeraRole;

  // Terapkan wallpaper rumah sakit untuk pasien dan fasilitas kesehatan
  // (termasuk semua sub-halaman: dashboard, rujukan, rujukan/baru, staf, dokter-petugas, dll)
  if (peran === "pasien" || peran === "fasilitas") {
    return (
      <PortalWallpaper>
        {children}
        <TeraWidget variant="portal" context={{ role: mappedRole }} />
      </PortalWallpaper>
    );
  }

  // Terapkan wallpaper khusus verifikasi & dinkes untuk verifikator
  if (peran === "verifikator") {
    return (
      <PortalWallpaper
        src="/images/wallpaper-verifikasi-dinkes.webp"
        brightness={1.3}
      >
        {children}
        <TeraWidget variant="portal" context={{ role: "verifikator" }} />
      </PortalWallpaper>
    );
  }

  return (
    <>
      {children}
      <TeraWidget variant="portal" context={{ role: mappedRole }} />
    </>
  );
}
