import React from "react";
import { StatusIcon, StatusType } from "./StatusIcon";
import { Badge, BadgeVariant } from "./Badge";

export interface TimelineItemData {
  id: string | number;
  title: string;
  time?: string;
  description?: string;
  status: StatusType;
  badgeText?: string;
  badgeVariant?: BadgeVariant;
  facility?: string;
  doctor?: string;
}

export interface TimelineProps extends React.HTMLAttributes<HTMLDivElement> {
  items: TimelineItemData[];
}

export const Timeline: React.FC<TimelineProps> = ({
  items,
  className = "",
  ...props
}) => {
  return (
    <div
      className={`relative pl-7 sm:pl-8 space-y-6 before:content-[''] before:absolute before:left-[11px] sm:before:left-[13px] before:top-3 before:bottom-3 before:w-[2px] before:bg-[#E2E8F0] ${className}`.trim()}
      {...props}
    >
      {items.map((item) => {
        // Dynamic styling depending on status
        const isProcess = item.status === "proses";
        const isDone = item.status === "selesai";

        const cardBg = isProcess
          ? "bg-[#FFF4D6]/40 border border-[#E0A100]/30"
          : isDone
          ? "bg-white border border-[#E2E8F0]"
          : "bg-white/60 border border-[#E2E8F0]/80 opacity-75";

        const titleColor = isProcess
          ? "text-[#7A5200] font-bold"
          : isDone
          ? "text-[#0F3040] font-bold"
          : "text-slate-500 font-medium";

        return (
          <div key={item.id} className="relative flex items-start gap-4">
            {/* Status node positioned over the continuous vertical line */}
            <div className="absolute -left-[27px] sm:-left-[31px] top-1 z-10">
              <StatusIcon status={item.status} size="md" />
            </div>

            {/* Timeline event card with 16px radius inner surface */}
            <div
              className={`flex-1 rounded-[16px] p-4 transition-all duration-200 shadow-xs ${cardBg}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className={`text-sm sm:text-[15px] leading-snug ${titleColor}`}>
                    {item.title}
                  </h4>
                  {item.badgeText && (
                    <Badge
                      variant={
                        item.badgeVariant ||
                        (item.status === "selesai"
                          ? "selesai"
                          : item.status === "proses"
                          ? "proses"
                          : "netral")
                      }
                    >
                      {item.badgeText}
                    </Badge>
                  )}
                </div>

                {item.time && (
                  <span className="text-xs text-slate-500 tabular-nums font-normal shrink-0">
                    {item.time}
                  </span>
                )}
              </div>

              {item.description && (
                <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed mt-1">
                  {item.description}
                </p>
              )}

              {(item.facility || item.doctor) && (
                <div className="flex items-center gap-3 mt-2.5 pt-2 border-t border-[#E2E8F0]/60 text-[11px] text-slate-500">
                  {item.facility && <span>Faskes: <strong className="text-[#0F3040]">{item.facility}</strong></span>}
                  {item.doctor && <span>Petugas/Dokter: <strong className="text-[#0F3040]">{item.doctor}</strong></span>}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
