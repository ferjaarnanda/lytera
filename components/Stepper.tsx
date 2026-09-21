import React from "react";
import { StatusIcon, StatusType } from "./StatusIcon";

export interface StepItem {
  id: string | number;
  title: string;
  subtitle?: string;
  status: StatusType;
}

export interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: StepItem[];
  orientation?: "horizontal" | "vertical";
}

export const Stepper: React.FC<StepperProps> = ({
  steps,
  orientation = "horizontal",
  className = "",
  ...props
}) => {
  if (orientation === "vertical") {
    return (
      <div className={`space-y-4 ${className}`.trim()} {...props}>
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;

          return (
            <div key={step.id} className="relative flex items-start gap-3">
              {/* Status icon with vertical line */}
              <div className="flex flex-col items-center">
                <StatusIcon
                  status={step.status}
                  size="md"
                  stepNumber={idx + 1}
                />
                {!isLast && (
                  <div
                    className={`w-[2px] h-8 my-1 ${
                      step.status === "selesai" ? "bg-[#1B6B4D]" : "bg-[#E2E8F0]"
                    }`}
                  />
                )}
              </div>

              {/* Step info */}
              <div className="pt-0.5">
                <p
                  className={`text-sm font-semibold leading-tight ${
                    step.status === "proses"
                      ? "text-[#0F3040]"
                      : step.status === "selesai"
                      ? "text-[#0F3040]"
                      : "text-slate-400"
                  }`}
                >
                  {step.title}
                </p>
                {step.subtitle && (
                  <p className="text-xs text-slate-500 mt-0.5">{step.subtitle}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Default: Horizontal Stepper
  return (
    <div
      className={`w-full overflow-x-auto py-2 ${className}`.trim()}
      {...props}
    >
      <div className="flex items-center min-w-max gap-2 sm:gap-3">
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;

          const titleColor =
            step.status === "proses"
              ? "text-[#0F3040] font-bold"
              : step.status === "selesai"
              ? "text-[#0F3040] font-semibold"
              : "text-slate-400 font-medium";

          return (
            <React.Fragment key={step.id}>
              {/* Step Node */}
              <div className="flex items-center gap-2.5">
                <StatusIcon
                  status={step.status}
                  size="md"
                  stepNumber={idx + 1}
                />
                <div className="flex flex-col">
                  <span className={`text-xs sm:text-sm tracking-tight ${titleColor}`}>
                    {step.title}
                  </span>
                  {step.subtitle && (
                    <span className="text-[11px] text-slate-400 leading-tight">
                      {step.subtitle}
                    </span>
                  )}
                </div>
              </div>

              {/* Connecting Line */}
              {!isLast && (
                <div
                  className={`h-[2px] w-6 sm:w-10 rounded-full shrink-0 ${
                    step.status === "selesai" ? "bg-[#1B6B4D]" : "bg-[#E2E8F0]"
                  }`}
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
