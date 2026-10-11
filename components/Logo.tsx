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
  /**
   * Varian tampilan kapsul putih, senada dengan tombol Kembali ke Beranda (BackButton)
   * untuk halaman pendaftaran akun.
   */
  variant?: "default" | "pillCapsule";
}

export const Logo: React.FC<LogoProps> = ({
  size = "md",
  asLink = true,
  href = "/",
  className = "",
  variant = "default",
}) => {
  // Asset resmi Lytera-logo.svg sudah mencakup icon, tulisan "Lytera", dan tagline "Akses Kesehatan, Lebih Mudah"
  // Rasio aspek gambar: ~2.5 : 1 (1983 x 793)
  const sizeMap = {
    sm: {
      width: variant === "pillCapsule" ? 95 : 85,
      height: variant === "pillCapsule" ? 38 : 34,
      imgClass: variant === "pillCapsule" ? "h-9 sm:h-[38px] w-auto" : "h-8 sm:h-[34px] w-auto",
    },
    md: {
      width: variant === "pillCapsule" ? 125 : 115,
      height: variant === "pillCapsule" ? 50 : 46,
      imgClass: variant === "pillCapsule" ? "h-11 sm:h-12 w-auto" : "h-10 sm:h-11 w-auto",
    },
    lg: {
      width: variant === "pillCapsule" ? 150 : 140,
      height: variant === "pillCapsule" ? 60 : 56,
      imgClass: variant === "pillCapsule" ? "h-13 sm:h-[58px] w-auto" : "h-12 sm:h-[52px] w-auto",
    },
  }[size];

  const content = (
    <div
      className={`inline-flex items-center select-none ${className}`.trim()}
    >
      {/* SATU ASSET GAMBAR LENGKAP LYTERA (SVG VECTOR) */}
      <Image
        src="/images/Lytera-logo.svg"
        alt="Lytera - Akses Kesehatan, Lebih Mudah"
        width={sizeMap.width}
        height={sizeMap.height}
        className={`${sizeMap.imgClass} shrink-0 object-contain`}
        priority
      />
    </div>
  );

  if (asLink && href) {
    if (variant === "pillCapsule") {
      return (
        <Link
          href={href}
          className={`inline-flex items-center px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md hover:-translate-y-[1px] active:scale-[0.98] active:shadow-sm transition-[box-shadow,transform] duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2E7D51] ${className}`.trim()}
          aria-label="Lytera - Beranda"
        >
          {content}
        </Link>
      );
    }

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

  if (variant === "pillCapsule") {
    return (
      <div
        className={`inline-flex items-center px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white border border-[#E2E8F0] shadow-sm ${className}`.trim()}
      >
        {content}
      </div>
    );
  }

  return content;
};
