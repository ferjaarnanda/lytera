import React from "react";
import { PortalWallpaper } from "@/components/PortalWallpaper";
import { TeraWidget } from "@/components/Tera";

export default function PortalDinkesLayout({
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
      <TeraWidget variant="portal" context={{ role: "dinkes" }} />
    </PortalWallpaper>
  );
}
