import React from "react";

export interface PortalWallpaperProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Komponen pembungkus wallpaper foto latar belakang resmi Lytera.
 * Ditampilkan di rute /masuk/pasien/*, /daftar/pasien/*, /portal/pasien/*,
 * dan /masuk/fasilitas/*, /daftar/fasilitas/*, /portal/fasilitas/*.
 *
 * Spesifikasi:
 * - Aset: public/images/wallpaper-hospital.webp
 * - background-size: cover
 * - background-attachment: scroll (bergerak bersama konten saat digulir)
 * - Menutupi TINGGI PENUH konten halaman (min-height mengikuti konten)
 * - Efek blur 60% (~18px)
 * - Overlay gelap semi-transparan Night (#0A2230 dengan opacity 60%)
 * - z-index di paling belakang (-z-10 dengan isolate)
 * - Tidak menghalangi interaksi pointer
 */
export const PortalWallpaper: React.FC<PortalWallpaperProps> = ({
  children,
  className = "",
}) => {
  return (
    <div
      data-portal-wallpaper="true"
      className={`relative min-h-screen w-full isolate overflow-x-hidden ${className}`.trim()}
    >
      {/* Background layer spanning full scrollable height */}
      <div
        className="absolute inset-0 -z-10 pointer-events-none select-none overflow-hidden bg-[#0A2230]"
        aria-hidden="true"
      >
        {/* Hospital Photo with 5% blur effect & +15% brightness */}
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/images/wallpaper-hospital.webp')",
            backgroundAttachment: "scroll",
            filter: "blur(2px) brightness(1.15)",
            transform: "scale(1.02)",
          }}
        />

        {/* Semi-transparent dark overlay: Night (#0A2230) 60% opacity */}
        <div className="absolute inset-0 w-full h-full bg-[#0A2230]/60" />
      </div>

      {/* Page Content Layer */}
      <div className="relative z-10 w-full min-h-screen flex flex-col">
        {children}
      </div>
    </div>
  );
};
