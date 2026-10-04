import React from "react";
import { PortalWallpaper } from "@/components/PortalWallpaper";

export default function MasukDinkesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PortalWallpaper
      src="/images/wallpaper-verifikasi-dinkes.webp"
      brightness={1.3}
    >
      {children}
    </PortalWallpaper>
  );
}
