import React from "react";
import Link from "next/link";
import Image from "next/image";

export interface LogoProps {
  /**
   * Warna teks/tone (disimpan untuk kompatibilitas props)
   */
  tone?: "dark" | "light" | "auto";
  /** Sembunyikan teks (disimpan untuk kompatibilitas) */
  hideText?: boolean;
  /** Ukuran logo */
  size?: "sm" | "md" | "lg";
  /** Jadikan elemen Link ke "/" jika href didefinisikan, default true */
  asLink?: boolean;
  href?: string;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = "md",
  asLink = true,
  href = "/",
  className = "",
}) => {
  // Asset asli Lytera-logo.png sudah mencakup icon, tulisan "Lytera", dan tagline "Akses Kesehatan, Lebih Mudah"
  // Rasio aspek gambar: ~2.5 : 1
  const sizeMap = {
    sm: { width: 85, height: 34, imgClass: "h-8 sm:h-[34px] w-auto" },
    md: { width: 115, height: 46, imgClass: "h-10 sm:h-11 w-auto" },
    lg: { width: 140, height: 56, imgClass: "h-12 sm:h-[52px] w-auto" },
  }[size];

  const content = (
    <div
      className={`inline-flex items-center select-none ${className}`.trim()}
    >
      {/* SATU ASSET GAMBAR LENGKAP LYTERA */}
      <Image
        src="/images/Lytera-logo.png"
        alt="Lytera - Akses Kesehatan, Lebih Mudah"
        width={sizeMap.width}
        height={sizeMap.height}
        className={`${sizeMap.imgClass} shrink-0 object-contain`}
        priority
      />
    </div>
  );

  if (asLink && href) {
    return (
      <Link
        href={href}
        className="inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2E7D51] rounded-lg transition-transform hover:opacity-95"
        aria-label="Lytera - Beranda"
      >
        {content}
      </Link>
    );
  }

  return content;
};
