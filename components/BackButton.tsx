import React from "react";
import Link from "next/link";

export interface BackButtonProps {
  href?: string;
  label?: string;
  className?: string;
}

/**
 * Tombol navigasi kembali berbentuk pil untuk halaman Login dan Pendaftaran.
 * Sesuai aturan: Halaman login dan pendaftaran TIDAK memakai navbar;
 * hanya tombol ghost berbentuk pil "← Kembali ke Beranda" di pojok kiri atas.
 */
export const BackButton: React.FC<BackButtonProps> = ({
  href = "/",
  label = "← Kembali ke Beranda",
  className = "",
}) => {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-[#0F3040] hover:bg-[#EBF2F6] active:bg-[#D8E6F0] transition-colors duration-200 border border-[#E2E8F0] bg-white/80 backdrop-blur-sm ${className}`.trim()}
    >
      <span>{label}</span>
    </Link>
  );
};
