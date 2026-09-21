import React from "react";

export type CardVariant = "white" | "cream" | "mist";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: "none" | "sm" | "md" | "lg";
  bordered?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = "white",
      padding = "md",
      bordered = true,
      className = "",
      ...props
    },
    ref
  ) => {
    // 24px border-radius strictly enforced for Lytera cards
    const baseClasses = "rounded-[24px] transition-all duration-200 overflow-hidden";

    const variantClasses: Record<CardVariant, string> = {
      white: "bg-white",
      cream: "bg-[#FAF5F2]",
      mist: "bg-[#EBF2F6]",
    };

    const borderClass = bordered ? "border border-[#E2E8F0]" : "";

    const paddingClasses = {
      none: "p-0",
      sm: "p-4",
      md: "p-6", // 24px standard per Lytera design system
      lg: "p-8",
    };

    return (
      <div
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${borderClass} ${paddingClasses[padding]} ${className}`.trim()}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export interface CardInnerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "cream" | "mist" | "white";
  padding?: "sm" | "md";
}

/**
 * Subkomponen wadah dalam (nested container) dengan radius 16px sesuai aturan DESIGN.md
 */
export const CardInner: React.FC<CardInnerProps> = ({
  children,
  variant = "cream",
  padding = "md",
  className = "",
  ...props
}) => {
  const variantClasses = {
    cream: "bg-[#FAF5F2]",
    mist: "bg-[#EBF2F6]",
    white: "bg-white border border-[#E2E8F0]",
  };

  const paddingClasses = {
    sm: "p-3",
    md: "p-4",
  };

  return (
    <div
      className={`rounded-[16px] ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
};
