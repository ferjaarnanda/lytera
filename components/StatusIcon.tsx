import React from "react";

export type StatusType = "selesai" | "proses" | "belum";
export type StatusIconSize = "sm" | "md" | "lg" | "xl";

export interface StatusIconProps extends React.HTMLAttributes<HTMLDivElement> {
  status: StatusType;
  size?: StatusIconSize;
  stepNumber?: number | string;
}

export const StatusIcon: React.FC<StatusIconProps> = ({
  status,
  size = "md",
  stepNumber,
  className = "",
  ...props
}) => {
  // Dimension mapping
  const sizeMap: Record<
    StatusIconSize,
    { box: string; iconSize: number; strokeWidth: number; text: string }
  > = {
    sm: { box: "w-5 h-5", iconSize: 12, strokeWidth: 2.5, text: "text-[10px]" },
    md: { box: "w-6 h-6", iconSize: 14, strokeWidth: 2.5, text: "text-xs" },
    lg: { box: "w-8 h-8", iconSize: 18, strokeWidth: 2.5, text: "text-sm" },
    xl: { box: "w-10 h-10", iconSize: 22, strokeWidth: 2.5, text: "text-base" },
  };

  const currentSize = sizeMap[size];

  // 1. Selesai: Lingkaran hijau #1B6B4D bercentang putih
  if (status === "selesai") {
    return (
      <div
        className={`${currentSize.box} rounded-full bg-[#1B6B4D] text-white flex items-center justify-center shrink-0 shadow-xs ${className}`.trim()}
        title="Status: Selesai"
        {...props}
      >
        <svg
          width={currentSize.iconSize}
          height={currentSize.iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={currentSize.strokeWidth + 0.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-label="Selesai"
        >
          <path d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
    );
  }

  // 2. Proses: Lingkaran kuning #E0A100 berjam putih
  if (status === "proses") {
    return (
      <div
        className={`${currentSize.box} rounded-full bg-[#E0A100] text-white flex items-center justify-center shrink-0 shadow-xs ring-4 ring-[#FFF4D6] ${className}`.trim()}
        title="Status: Sedang Diproses"
        {...props}
      >
        <svg
          width={currentSize.iconSize}
          height={currentSize.iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={currentSize.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-label="Dalam Proses"
        >
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 15 15" />
        </svg>
      </div>
    );
  }

  // 3. Belum: Lingkaran putih garis abu-abu
  return (
    <div
      className={`${currentSize.box} rounded-full bg-white border-2 border-slate-300 text-slate-400 flex items-center justify-center shrink-0 font-medium ${currentSize.text} ${className}`.trim()}
      title="Status: Belum Dimulai"
      {...props}
    >
      {stepNumber !== undefined ? (
        <span>{stepNumber}</span>
      ) : (
        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
      )}
    </div>
  );
};
