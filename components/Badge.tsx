import React from "react";

export type BadgeVariant =
  | "selesai"
  | "proses"
  | "bahaya"
  | "netral"
  | "info";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  showDot?: boolean;
  leftIcon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "netral",
  showDot = false,
  leftIcon,
  className = "",
  ...props
}) => {
  // Always fully rounded (9999px) per Lytera design rules
  const baseClasses =
    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-medium leading-none select-none tracking-normal";

  // Palette pairing strictly from DESIGN.md and user prompt
  const variantStyles: Record<
    BadgeVariant,
    { container: string; dot: string }
  > = {
    selesai: {
      container: "bg-[#EDF7F2] text-[#1B6B4D]",
      dot: "bg-[#1B6B4D]",
    },
    proses: {
      container: "bg-[#FFF4D6] text-[#7A5200]",
      dot: "bg-[#E0A100]",
    },
    bahaya: {
      container: "bg-[#FDECEA] text-[#B3261E]",
      dot: "bg-[#B3261E]",
    },
    netral: {
      container: "bg-white text-[#464858] border border-[#E2E8F0]",
      dot: "bg-[#73787C]",
    },
    info: {
      container: "bg-[#EBF2F6] text-[#0F3040]",
      dot: "bg-[#0F3040]",
    },
  };

  const currentStyle = variantStyles[variant];

  return (
    <span
      className={`${baseClasses} ${currentStyle.container} ${className}`.trim()}
      {...props}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${currentStyle.dot}`}
          aria-hidden="true"
        />
      )}
      {leftIcon && <span className="shrink-0 flex items-center">{leftIcon}</span>}
      <span>{children}</span>
    </span>
  );
};
