import React from "react";

export interface PortalWallpaperProps {
  children: React.ReactNode;
  className?: string;
  src?: string;
  brightness?: number;
}

/**
 * Komponen pembungkus wallpaper foto latar belakang resmi Lytera.
 * Ditampilkan di rute /masuk/*, /daftar/*, dan /portal/*
 *
 * Menggunakan elemen fixed menempel pada viewport (diam saat scroll),
 * dengan foto ber-filter blur(2px) brightness(...) dan overlay gelap Night.
 */
export const PortalWallpaper: React.FC<PortalWallpaperProps> = ({
  children,
  className = "",
  src = "/images/wallpaper-hospital.webp",
  brightness = 1.15,
}) => {
  return (
    <>
      {/* 1. Lapisan Foto Wallpaper Tetap di Layar (Fixed Viewport) */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -10,
          pointerEvents: "none",
          backgroundImage: `url('${src}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          filter: `blur(2px) brightness(${brightness})`,
          transform: "translateZ(0)",
          willChange: "transform",
        }}
        aria-hidden="true"
      />

      {/* 2. Lapisan Overlay Gelap Night rgba(10,34,48,0.6) di atas foto, di bawah konten */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -9,
          pointerEvents: "none",
          backgroundColor: "rgba(10, 34, 48, 0.6)",
          transform: "translateZ(0)",
        }}
        aria-hidden="true"
      />

      {/* 3. Konten Halaman Mengalir Normal */}
      <div data-portal-wallpaper="true" className={className || undefined}>
        {children}
      </div>
    </>
  );
};
