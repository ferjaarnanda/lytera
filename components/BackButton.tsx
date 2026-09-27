import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export interface BackButtonProps {
  href?: string;
  label?: string;
  className?: string;
}

/**
 * Tombol navigasi kembali berbentuk pil untuk halaman Login dan Pendaftaran.
 * Menampilkan ikon panah kiri + label teks, dengan shadow ringan dan efek hover naik.
 */
export const BackButton: React.FC<BackButtonProps> = ({
  href = "/",
  label = "Kembali ke Beranda",
  className = "",
}) => {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-[#0F3040] bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md hover:-translate-y-[1px] active:scale-[0.98] active:shadow-sm transition-[box-shadow,transform] duration-200 ${className}`.trim()}
    >
      <ArrowLeft className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
};
