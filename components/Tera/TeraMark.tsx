import React from "react";

export interface TeraMarkProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  isHovered?: boolean;
}

/**
 * Komponen Mark/Logo Resmi Tera AI
 * Memiliki border gradient hijau terang -> hijau deep yang berputar secara kontinu saat hover.
 */
export const TeraMark: React.FC<TeraMarkProps> = ({
  size = "md",
  className = "",
  isHovered = false,
}) => {
  const sizeConfig = {
    sm: {
      outer: "w-8 h-8",
      inner: "w-7 h-7",
      iconSize: 16,
    },
    md: {
      outer: "w-11 h-11",
      inner: "w-[40px] h-[40px]",
      iconSize: 22,
    },
    lg: {
      outer: "w-14 h-14",
      inner: "w-[50px] h-[50px]",
      iconSize: 28,
    },
  }[size];

  return (
    <div
      className={`relative rounded-full flex items-center justify-center p-[2.5px] overflow-hidden shrink-0 ${sizeConfig.outer} ${className}`.trim()}
    >
      {/* 1. CONTINUOUS MOVING BORDER GRADIENT (HIJAU TERANG -> HIJAU DEEP) */}
      <div
        className={`absolute inset-[-100%] transition-opacity duration-300 pointer-events-none ${
          isHovered ? "opacity-100 animate-tera-spin" : "opacity-40"
        }`}
        style={{
          background:
            "conic-gradient(from 0deg, #34D399 0%, #10B981 35%, #047857 70%, #022C22 90%, #34D399 100%)",
        }}
        aria-hidden="true"
      />

      {/* 2. INNER SURFACE CONTAINER */}
      <div
        className={`relative rounded-full bg-[#0A2230] flex items-center justify-center text-white z-10 shadow-sm transition-transform duration-200 ${
          isHovered ? "scale-[0.98]" : "scale-100"
        } ${sizeConfig.inner}`}
      >
        {/* IKON TERA: Digital Medical Sparkle */}
        <svg
          width={sizeConfig.iconSize}
          height={sizeConfig.iconSize}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Daun / Pelindung Luar */}
          <path
            d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z"
            fill="url(#tera-leaf-grad)"
            opacity="0.35"
          />
          {/* Salib AI Sparkle Medis */}
          <path
            d="M12 6V18M6 12H18"
            stroke="url(#tera-cross-grad)"
            strokeWidth="2.75"
            strokeLinecap="round"
          />
          {/* Kilau AI Pintar di Titik Tengah */}
          <circle cx="12" cy="12" r="2.25" fill="#34D399" />
          <path
            d="M16 8L17.5 6.5M16 16L17.5 17.5M8 8L6.5 6.5"
            stroke="#10B981"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          <defs>
            <linearGradient id="tera-leaf-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
              <stop stopColor="#34D399" />
              <stop offset="1" stopColor="#047857" />
            </linearGradient>
            <linearGradient id="tera-cross-grad" x1="6" y1="6" x2="18" y2="18" gradientUnits="userSpaceOnUse">
              <stop stopColor="#A7F3D0" />
              <stop offset="0.5" stopColor="#34D399" />
              <stop offset="1" stopColor="#10B981" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
};
