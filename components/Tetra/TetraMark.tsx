import React from "react";

export interface TetraMarkProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  isHovered?: boolean;
}

/**
 * Komponen Mark/Logo Resmi Tetra AI
 * Memiliki 4 garis diagonal dan continuous moving border animation saat hover.
 */
export const TetraMark: React.FC<TetraMarkProps> = ({
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
          isHovered ? "opacity-100 animate-tetra-spin" : "opacity-40"
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
        {/* IKON TETRA: Digital Medical Sparkle dengan TEPAT 4 GARIS DIAGONAL */}
        <svg
          width={sizeConfig.iconSize}
          height={sizeConfig.iconSize}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Daun Pelindung Luar */}
          <path
            d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z"
            fill="url(#tetra-leaf-grad)"
            opacity="0.35"
          />
          {/* Salib Tegak & Datar Medis */}
          <path
            d="M12 6V18M6 12H18"
            stroke="url(#tetra-cross-grad)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Titik Inti Kilau AI di Pusat */}
          <circle cx="12" cy="12" r="2.2" fill="#34D399" />

          {/* TEPAT 4 GARIS DIAGONAL DI 4 KUADRAN (TETRA = EMPAT) */}
          {/* 1. Kuadran Atas-Kanan */}
          <line
            x1="15.8"
            y1="8.2"
            x2="17.8"
            y2="6.2"
            stroke="#10B981"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          {/* 2. Kuadran Bawah-Kanan */}
          <line
            x1="15.8"
            y1="15.8"
            x2="17.8"
            y2="17.8"
            stroke="#10B981"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          {/* 3. Kuadran Atas-Kiri */}
          <line
            x1="8.2"
            y1="8.2"
            x2="6.2"
            y2="6.2"
            stroke="#10B981"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          {/* 4. Kuadran Bawah-Kiri */}
          <line
            x1="8.2"
            y1="15.8"
            x2="6.2"
            y2="17.8"
            stroke="#10B981"
            strokeWidth="1.6"
            strokeLinecap="round"
          />

          <defs>
            <linearGradient id="tetra-leaf-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
              <stop stopColor="#34D399" />
              <stop offset="1" stopColor="#047857" />
            </linearGradient>
            <linearGradient id="tetra-cross-grad" x1="6" y1="6" x2="18" y2="18" gradientUnits="userSpaceOnUse">
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
