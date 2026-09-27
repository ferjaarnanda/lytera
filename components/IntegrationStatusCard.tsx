"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BriefcaseMedical, Building2, Clock } from "lucide-react";
import {
  Facility,
  TINGKAT_1_FACILITIES,
  TINGKAT_2_FACILITIES,
  TINGKAT_3_FACILITIES,
  TINGKAT_LABELS,
  TOP_SEQUENCE,
  ROTATION_INTERVAL_MS,
  FADE_DURATION_MS,
} from "@/lib/demo-facilities";

// Helper format jam 24 jam menggunakan Intl.DateTimeFormat (hourCycle h23)
function formatTime24(date: Date): string {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);

    const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
    const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
    const second = parts.find((p) => p.type === "second")?.value ?? "00";
    return `${hour}:${minute}:${second}`;
  } catch {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }
}

// Helper deteksi zona waktu dari offset perangkat
function detectTimezoneFromOffset(date: Date): string {
  const offsetHours = -Math.round(date.getTimezoneOffset() / 60);
  if (offsetHours === 7) return "WIB";
  if (offsetHours === 8) return "WITA";
  if (offsetHours === 9) return "WIT";
  return offsetHours >= 0 ? `GMT+${offsetHours}` : `GMT${offsetHours}`;
}

// Langganan timer detik untuk useSyncExternalStore (bebas hydration mismatch)
function subscribeClock(callback: () => void) {
  const timer = setInterval(callback, 1000);
  return () => clearInterval(timer);
}

export const IntegrationStatusCard: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  // --- REAL-TIME CLOCK VIA useSyncExternalStore ---
  const clockDisplay = useSyncExternalStore(
    subscribeClock,
    () => {
      const now = new Date();
      return `${formatTime24(now)} ${detectTimezoneFromOffset(now)}`;
    },
    () => "--:--:--"
  );

  const timezoneLabel = useSyncExternalStore(
    subscribeClock,
    () => detectTimezoneFromOffset(new Date()),
    () => "Mendeteksi..."
  );

  // --- REFS INDEKS ROTASI ---
  const topSeqRef = useRef(0);
  const topIdx1Ref = useRef(0);
  const topIdx2Ref = useRef(0);
  const bottomIdx3Ref = useRef(0);

  // --- STATE FASILITAS & OPASITAS SEREMPAK ---
  const [topFacility, setTopFacility] = useState<Facility>(TINGKAT_1_FACILITIES[0]);
  const [bottomFacility, setBottomFacility] = useState<Facility>(TINGKAT_3_FACILITIES[0]);
  const [fadeOpacity, setFadeOpacity] = useState(1);

  // --- REFS JEDA HOVER & TOUCH ---
  const isHoveredRef = useRef(false);
  const lastHoverActionTimeRef = useRef(0);
  const touchResumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- EFFECT: ROTASI SEREMPAK SETIAP 6 DETIK (ROTATION_INTERVAL_MS = 6000) ---
  useEffect(() => {
    // Fungsi memajukan kedua fasilitas secara bersamaan
    const rotateBoth = () => {
      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // Hitung fasilitas baris atas berikutnya
      topSeqRef.current = (topSeqRef.current + 1) % TOP_SEQUENCE.length;
      const targetTingkat = TOP_SEQUENCE[topSeqRef.current];

      let nextTop: Facility;
      if (targetTingkat === 1) {
        topIdx1Ref.current = (topIdx1Ref.current + 1) % TINGKAT_1_FACILITIES.length;
        nextTop = TINGKAT_1_FACILITIES[topIdx1Ref.current];
      } else {
        topIdx2Ref.current = (topIdx2Ref.current + 1) % TINGKAT_2_FACILITIES.length;
        nextTop = TINGKAT_2_FACILITIES[topIdx2Ref.current];
      }

      // Hitung fasilitas baris bawah berikutnya
      bottomIdx3Ref.current = (bottomIdx3Ref.current + 1) % TINGKAT_3_FACILITIES.length;
      const nextBottom = TINGKAT_3_FACILITIES[bottomIdx3Ref.current];

      if (prefersReducedMotion) {
        setTopFacility(nextTop);
        setBottomFacility(nextBottom);
      } else {
        // Fade out kedua kartu serempak
        setFadeOpacity(0);
        setTimeout(() => {
          // Ganti data tepat saat transisi fade-out selesai
          setTopFacility(nextTop);
          setBottomFacility(nextBottom);
          // Fade in kedua kartu serempak
          setFadeOpacity(1);
        }, FADE_DURATION_MS);
      }
    };

    const TICK_MS = 100;
    let elapsed = 0;

    const intervalId = setInterval(() => {
      // Safety timeout hover: lepas otomatis setelah 12 detik tanpa aksi
      if (isHoveredRef.current && Date.now() - lastHoverActionTimeRef.current > 12000) {
        isHoveredRef.current = false;
      }

      // Jeda jika sedang di-hover atau tab browser tidak aktif
      if (isHoveredRef.current) return;
      if (typeof document !== "undefined" && document.hidden) return;

      elapsed += TICK_MS;

      // Pergantian serempak setiap 6 detik
      if (elapsed >= ROTATION_INTERVAL_MS) {
        elapsed = 0;
        rotateBoth();
      }
    }, TICK_MS);

    return () => {
      clearInterval(intervalId);
      if (touchResumeTimeoutRef.current) clearTimeout(touchResumeTimeoutRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    isHoveredRef.current = true;
    lastHoverActionTimeRef.current = Date.now();
  };

  const handleMouseMove = () => {
    lastHoverActionTimeRef.current = Date.now();
  };

  const handleMouseLeave = () => {
    isHoveredRef.current = false;
  };

  const handleTouchStart = () => {
    isHoveredRef.current = true;
    lastHoverActionTimeRef.current = Date.now();
    if (touchResumeTimeoutRef.current) clearTimeout(touchResumeTimeoutRef.current);
  };

  const handleTouchEnd = () => {
    touchResumeTimeoutRef.current = setTimeout(() => {
      isHoveredRef.current = false;
    }, 1500);
  };

  const renderFacilityIcon = (tingkat: 1 | 2 | 3) => {
    if (tingkat === 1) {
      return (
        <BriefcaseMedical
          className="w-5 h-5 text-[#8F5A4E]"
          strokeWidth={1.75}
          aria-hidden="true"
        />
      );
    }
    return (
      <Building2
        className="w-5 h-5 text-[#8F5A4E]"
        strokeWidth={1.75}
        aria-hidden="true"
      />
    );
  };

  // Helper render tiap card fasilitas sesuai struktur compact
  const renderCardItem = (facility: Facility) => (
    <div
      className="p-3.5 rounded-[16px] bg-[#FAF5F2] border border-[#8F5A4E]/15 flex items-start gap-3 transition-opacity duration-500 ease-in-out"
      style={{ opacity: fadeOpacity }}
    >
      <div className="w-10 h-10 rounded-[12px] bg-white border border-[#E2E8F0] flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
        {renderFacilityIcon(facility.tingkat)}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className="text-[14px] font-bold text-[#0A2230] leading-tight truncate"
          title={facility.nama}
        >
          {facility.nama}
        </p>

        <p
          className="text-[12px] text-[#464858] truncate mt-0.5"
          title={facility.daerah}
        >
          {facility.daerah}
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center text-[10.5px] px-2.5 py-0.5 rounded-full bg-white text-[#8F5A4E] font-medium border border-[#8F5A4E]/20">
            {TINGKAT_LABELS[facility.tingkat]}
          </span>
        </div>

        {/* Indikator Terhubung TEPAT di bawah informasi tingkat faskes / identitas fasilitas */}
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#1B6B4D]">
          <span className="w-2 h-2 rounded-full bg-[#1B6B4D] animate-pulse shrink-0 inline-block" />
          <span>Terhubung</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`w-full max-w-[420px] ${className}`.trim()}>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleMouseLeave}
        className="bg-white rounded-[24px] p-5 sm:p-6 shadow-xl border border-[#E2E8F0] w-full text-left transition-shadow duration-200"
      >
        {/* HEADER COMPACT */}
        <div className="pb-3 border-b border-[#E2E8F0] mb-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[16px] font-bold text-[#0A2230] tracking-tight">
                Status Integrasi Terkini
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FAF5F2] text-[#8F5A4E] border border-[#8F5A4E]/20">
                SIMULASI
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EBF2F6] border border-[#E2E8F0] shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1B6B4D] animate-pulse shrink-0" />
              <span className="text-[11px] font-semibold text-[#1B6B4D]">
                Aktif
              </span>
            </div>
          </div>
          <p className="text-[12px] text-[#464858] mt-1">
            Fasilitas kesehatan yang terhubung secara real-time ke Lytera
          </p>
        </div>

        {/* DUA KARTU RUMAH SAKIT DENGAN ROTASI SEREMPAK SETIAP 6 DETIK */}
        <div className="flex flex-col gap-2.5">
          {renderCardItem(topFacility)}
          {renderCardItem(bottomFacility)}
        </div>

        {/* FOOTER KARTU COMPACT: JAM REAL-TIME DAN ZONA WAKTU */}
        <div className="mt-3.5 pt-2.5 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-[#464858]">
          <div className="flex items-center gap-1.5">
            <Clock
              className="w-3.5 h-3.5 text-slate-400 shrink-0"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <span className="text-slate-500 font-medium">
              Zona Waktu: {timezoneLabel}
            </span>
          </div>

          <span className="text-[11px] font-bold text-[#0A2230] tabular-nums tracking-wide bg-[#EBF2F6] px-2 py-0.5 rounded">
            {clockDisplay}
          </span>
        </div>

        {/* CATATAN KECIL */}
        <p className="text-[10px] text-slate-400 text-center mt-2">
          Data simulasi untuk demo, bukan integrasi yang sebenarnya.
        </p>
      </div>
    </div>
  );
};
