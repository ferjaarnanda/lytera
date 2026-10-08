import React from "react";
import Link from "next/link";
import Image from "next/image";

export interface LogoProps {
  /**
   * Warna teks Lytera:
   * - 'dark': untuk latar gelap (teks putih)
   * - 'light': untuk latar terang (teks Deep Navy #0F3040)
   * - 'auto': mewarisi warna teks saat ini (currentColor)
   */
  tone?: "dark" | "light" | "auto";
  /** Sembunyikan teks tulisan "Lytera", hanya tampilkan ikon */
  hideText?: boolean;
  /** Ukuran logo */
  size?: "sm" | "md" | "lg";
  /** Jadikan elemen Link ke "/" jika href didefinisikan, default true */
  asLink?: boolean;
  href?: string;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  tone = "dark",
  hideText = false,
  size = "md",
  asLink = true,
  href = "/",
  className = "",
}) => {
  const sizeMap = {
    sm: { imgSize: 28, text: "text-lg" },
    md: { imgSize: 36, text: "text-xl" },
    lg: { imgSize: 44, text: "text-2xl" },
  }[size];

  const textColorClass = {
    dark: "text-white",
    light: "text-[#0F3040]",
    auto: "text-current",
  }[tone];

  const content = (
    <div
      className={`inline-flex items-center gap-2.5 select-none transition-colors duration-300 ${textColorClass} ${className}`.trim()}
    >
      {/* LOGO IMAGE RESMI LYTERA */}
      <Image
        src="/images/Lytera-logo.png"
        alt="Lytera"
        width={sizeMap.imgSize}
        height={sizeMap.imgSize}
        className="shrink-0 object-contain"
        priority
      />

      {/* TEKS LYTERA */}
      {!hideText && (
        <span
          className={`font-extrabold tracking-tight ${sizeMap.text} transition-colors duration-300`}
        >
          Lytera
        </span>
      )}
    </div>
  );

  if (asLink && href) {
    return (
      <Link
        href={href}
        className="inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3D8B5E] rounded-lg"
        aria-label="Lytera - Beranda"
      >
        {content}
      </Link>
    );
  }

  return content;
};
