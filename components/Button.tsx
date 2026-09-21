import React from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "peach";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      fullWidth = false,
      leftIcon,
      rightIcon,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    // Base styling: radius 14px, semibold text 15px, no uppercase, transition
    const baseClasses =
      "inline-flex items-center justify-center font-semibold rounded-[14px] transition-all duration-200 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

    // Size variants
    const sizeClasses: Record<ButtonSize, string> = {
      sm: "h-9 px-3.5 text-xs gap-1.5",
      md: "h-12 px-6 text-[15px] leading-5 gap-2",
      lg: "h-14 px-8 text-base gap-2.5",
    };

    // Style variants (Strict Lytera palette: Terracotta, Deep Navy, Peach, White, Slate, Canvas, Mist)
    const variantClasses: Record<ButtonVariant, string> = {
      primary:
        "bg-[#8F5A4E] text-white hover:bg-[#A56F63] active:bg-[#7B4B40] focus-visible:ring-[#8F5A4E] shadow-sm",
      secondary:
        "bg-white text-[#0F3040] border border-[#E2E8F0] hover:bg-[#F8FAFC] active:bg-[#EBF2F6] focus-visible:ring-[#0F3040]",
      ghost:
        "bg-transparent text-[#0F3040] hover:bg-[#EBF2F6] active:bg-[#D8E6F0] focus-visible:ring-[#0F3040]",
      peach:
        "bg-[#D99B7F] text-[#0A2230] hover:bg-[#E4AE94] active:bg-[#C98B6F] focus-visible:ring-[#D99B7F] shadow-sm",
    };

    const widthClass = fullWidth ? "w-full" : "";

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClass} ${className}`.trim()}
        {...props}
      >
        {leftIcon && <span className="shrink-0 flex items-center">{leftIcon}</span>}
        <span>{children}</span>
        {rightIcon && <span className="shrink-0 flex items-center">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
