import React from "react";
import Link from "next/link";

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
  const sizeClasses = {
    sm: { icon: "h-7 w-7", text: "text-lg", svgH: "h-7" },
    md: { icon: "h-9 w-9", text: "text-xl", svgH: "h-9" },
    lg: { icon: "h-11 w-11", text: "text-2xl", svgH: "h-11" },
  }[size];

  const textColorClass = {
    dark: "text-white",
    light: "text-[#0F3040]",
    auto: "text-current",
  }[tone];

  const content = (
    <div
      className={`inline-flex items-center gap-3 select-none transition-colors duration-300 ${textColorClass} ${className}`.trim()}
    >
      {/* IKON SVG RESMI LYTERA */}
      <svg
        viewBox="0 0 40 48"
        className={`${sizeClasses.svgH} w-auto shrink-0`}
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="2"
          y="6"
          width="36"
          height="36"
          rx="12"
          fill="#0A2230"
          stroke="#D99B7F"
          strokeWidth="2"
        />
        <path
          d="M14 24C14 18.4772 18.4772 14 24 14C29.5228 14 34 18.4772 34 24C34 29.5228 29.5228 34 24 34"
          stroke="#D99B7F"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="24" cy="24" r="4" fill="#FFFFFF" />
        <path
          d="M20 24H28M24 20V28"
          stroke="#0A2230"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      {/* TEKS LYTERA */}
      {!hideText && (
        <span
          className={`font-extrabold tracking-tight ${sizeClasses.text} transition-colors duration-300`}
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
        className="inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D99B7F] rounded-lg"
        aria-label="Lytera - Beranda"
      >
        {content}
      </Link>
    );
  }

  return content;
};
