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
  BOTTOM_OFFSET_MS,
  FADE_DURATION_MS,
} from "@/lib/demo-facilities";

// Helper untuk format jam 24 jam dengan titik dua menggunakan Intl.DateTimeFormat (hourCycle h23)
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

// Helper untuk deteksi zona waktu dari selisih UTC perangkat
function detectTimezoneFromOffset(date: Date): string {
  const offsetHours = -Math.round(date.getTimezoneOffset() / 60);

  if (offsetHours === 7) return "WIB";
  if (offsetHours === 8) return "WITA";
  if (offsetHours === 9) return "WIT";
  return offsetHours >= 0 ? `GMT+${offsetHours}` : `GMT${offsetHours}`;
}

// Langganan timer detik untuk useSyncExternalStore
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

  // --- REFS UNTUK INDEKS FASILITAS ---
  const topSeqRef = useRef(0);
  const topIdx1Ref = useRef(0);
  const topIdx2Ref = useRef(0);
  const bottomIdx3Ref = useRef(0);

  // --- STATE FASILITAS & OPASITAS ---
  const [topFacility, setTopFacility] = useState<Facility>(TINGKAT_1_FACILITIES[0]);
  const [topOpacity, setTopOpacity] = useState(1);

  const [bottomFacility, setBottomFacility] = useState<Facility>(TINGKAT_3_FACILITIES[0]);
  const [bottomOpacity, setBottomOpacity] = useState(1);

  // --- REFS UNTUK JEDA HOVER & SAFETY TIMEOUT ---
  const isHoveredRef = useRef(false);
  const lastHoverActionTimeRef = useRef(0);
  const touchResumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- EFFECT UTAMA: TIMER AKUMULASI (TICK) YANG KONTINU DAN KEBAL TERHADAP RE-RENDER ---
  useEffect(() => {
    // Fungsi transisi baris atas (11 langkah berulang)
    const rotateTop = () => {
      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      topSeqRef.current = (topSeqRef.current + 1) % TOP_SEQUENCE.length;
      const targetTingkat = TOP_SEQUENCE[topSeqRef.current];

      const getNextFacility = () => {
        if (targetTingkat === 1) {
          topIdx1Ref.current = (topIdx1Ref.current + 1) % TINGKAT_1_FACILITIES.length;
          return TINGKAT_1_FACILITIES[topIdx1Ref.current];
        }
        topIdx2Ref.current = (topIdx2Ref.current + 1) % TINGKAT_2_FACILITIES.length;
        return TINGKAT_2_FACILITIES[topIdx2Ref.current];
      };

      if (prefersReducedMotion) {
        setTopFacility(getNextFacility());
      } else {
        setTopOpacity(0);
        setTimeout(() => {
          setTopFacility(getNextFacility());
          setTopOpacity(1);
        }, FADE_DURATION_MS);
      }
    };

    // Fungsi transisi baris bawah (5 fasilitas tingkat 3 berurutan)
    const rotateBottom = () => {
      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const getNextFacility = () => {
        bottomIdx3Ref.current = (bottomIdx3Ref.current + 1) % TINGKAT_3_FACILITIES.length;
        return TINGKAT_3_FACILITIES[bottomIdx3Ref.current];
      };

      if (prefersReducedMotion) {
        setBottomFacility(getNextFacility());
      } else {
        setBottomOpacity(0);
        setTimeout(() => {
          setBottomFacility(getNextFacility());
          setBottomOpacity(1);
        }, FADE_DURATION_MS);
      }
    };

    const TICK_MS = 100;
    let topElapsed = 0;
    // Baris bawah dimulai dengan offset sehingga tepat pada t = BOTTOM_OFFSET_MS (5.1 detik)
    // baris bawah pertama kali berganti!
    let bottomElapsed = ROTATION_INTERVAL_MS - BOTTOM_OFFSET_MS;

    const intervalId = setInterval(() => {
      // Safety: bila hover aktif lebih dari 12 detik tanpa aksi nyata, otomatis lepas jeda
      if (isHoveredRef.current && Date.now() - lastHoverActionTimeRef.current > 12000) {
        isHoveredRef.current = false;
      }

      // Jangan akumulasi waktu saat kursor sedang di atas kartu atau tab browser tersembunyi
      if (isHoveredRef.current) return;
      if (typeof document !== "undefined" && document.hidden) return;

      topElapsed += TICK_MS;
      bottomElapsed += TICK_MS;

      // Pergantian baris atas setiap ROTATION_INTERVAL_MS (10200 ms)
      if (topElapsed >= ROTATION_INTERVAL_MS) {
        topElapsed = 0;
        rotateTop();
      }

      // Pergantian baris bawah setiap ROTATION_INTERVAL_MS (10200 ms)
      if (bottomElapsed >= ROTATION_INTERVAL_MS) {
        bottomElapsed = 0;
        rotateBottom();
      }
    }, TICK_MS);

    return () => {
      clearInterval(intervalId);
      if (touchResumeTimeoutRef.current) clearTimeout(touchResumeTimeoutRef.current);
    };
  }, []);

  // Handlers untuk jeda saat mouse hover
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

  // Handlers untuk layar sentuh (mobile/tablet) agar tidak tersangkut jeda permanen
  const handleTouchStart = () => {
    isHoveredRef.current = true;
    lastHoverActionTimeRef.current = Date.now();
    if (touchResumeTimeoutRef.current) clearTimeout(touchResumeTimeoutRef.current);
  };

  const handleTouchEnd = () => {
    // Pada perangkat sentuh, otomatis lanjutkan rotasi 1.5 detik setelah sentuhan selesai
    touchResumeTimeoutRef.current = setTimeout(() => {
      isHoveredRef.current = false;
    }, 1500);
  };

  // Render Ikon Fasilitas Lucide: Tas Medis (BriefcaseMedical) untuk Tk 1, Gedung (Building2) untuk Tk 2 & 3
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

  return (
    <div className={`w-full ${className}`.trim()}>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleMouseLeave}
        className="bg-white rounded-[24px] p-6 shadow-xl border border-[#E2E8F0] max-w-[960px] mx-auto text-left transition-shadow duration-200"
      >
        {/* HEADER KARTU */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E2E8F0] mb-4 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[17px] font-bold text-[#0A2230] tracking-tight">
                Status Integrasi Terkini
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FAF5F2] text-[#8F5A4E] border border-[#8F5A4E]/20">
                SIMULASI
              </span>
            </div>
            <p className="text-[12px] text-[#464858] mt-0.5">
              Contoh status fasilitas kesehatan yang terhubung ke Lytera
            </p>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF2F6] border border-[#E2E8F0] w-fit shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#1B6B4D] animate-pulse inline-block shrink-0" />
            <span className="text-[12px] font-semibold text-[#1B6B4D]">
              Real-time Aktif
            </span>
          </div>
        </div>

        {/* DAFTAR BARIS STATUS DENGAN TINGGI TETAP 88px */}
        <div className="flex flex-col gap-3">
          {/* BARIS ATAS: Rotasi Siklus Tingkat 1 & 2 */}
          <div
            className="h-[88px] min-h-[88px] max-h-[88px] p-3.5 rounded-[16px] bg-[#FAF5F2] border border-[#8F5A4E]/15 flex items-center justify-between gap-3 overflow-hidden transition-opacity duration-[700ms] ease-in-out"
            style={{ opacity: topOpacity }}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-[12px] bg-white border border-[#E2E8F0] flex items-center justify-center shrink-0 shadow-2xs">
                {renderFacilityIcon(topFacility.tingkat)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 max-w-full">
                  <p
                    className="text-[14px] font-semibold text-[#0A2230] truncate min-w-0"
                    title={topFacility.nama}
                  >
                    {topFacility.nama}
                  </p>
                  <span className="whitespace-nowrap shrink-0 inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full bg-white text-[#8F5A4E] font-medium border border-[#8F5A4E]/20">
                    {TINGKAT_LABELS[topFacility.tingkat]}
                  </span>
                </div>
                <p
                  className="text-[12px] text-[#464858] truncate mt-0.5"
                  title={topFacility.daerah}
                >
                  {topFacility.daerah}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[12px] text-[#1B6B4D] font-semibold flex items-center justify-end gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#1B6B4D]/20 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-[#1B6B4D] shrink-0" />
                Terhubung
              </span>
            </div>
          </div>

          {/* BARIS BAWAH: Rotasi Tingkat 3 (Tersier) */}
          <div
            className="h-[88px] min-h-[88px] max-h-[88px] p-3.5 rounded-[16px] bg-[#FAF5F2] border border-[#8F5A4E]/15 flex items-center justify-between gap-3 overflow-hidden transition-opacity duration-[700ms] ease-in-out"
            style={{ opacity: bottomOpacity }}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-[12px] bg-white border border-[#E2E8F0] flex items-center justify-center shrink-0 shadow-2xs">
                {renderFacilityIcon(bottomFacility.tingkat)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 max-w-full">
                  <p
                    className="text-[14px] font-semibold text-[#0A2230] truncate min-w-0"
                    title={bottomFacility.nama}
                  >
                    {bottomFacility.nama}
                  </p>
                  <span className="whitespace-nowrap shrink-0 inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full bg-white text-[#8F5A4E] font-medium border border-[#8F5A4E]/20">
                    {TINGKAT_LABELS[bottomFacility.tingkat]}
                  </span>
                </div>
                <p
                  className="text-[12px] text-[#464858] truncate mt-0.5"
                  title={bottomFacility.daerah}
                >
                  {bottomFacility.daerah}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[12px] text-[#1B6B4D] font-semibold flex items-center justify-end gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#1B6B4D]/20 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-[#1B6B4D] shrink-0" />
                Terhubung
              </span>
            </div>
          </div>
        </div>

        {/* FOOTER KARTU: JAM REAL-TIME DAN ZONA WAKTU */}
        <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[#464858]">
            <Clock className="w-4 h-4 text-slate-400 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span className="text-[11px] text-slate-500 font-medium">
              Zona Waktu: {timezoneLabel}
            </span>
          </div>

          <div className="text-right self-end sm:self-auto">
            <span className="text-[12px] font-bold text-[#0A2230] tabular-nums tracking-wide bg-[#EBF2F6] px-2.5 py-1 rounded-md inline-block">
              {clockDisplay}
            </span>
          </div>
        </div>

        {/* CATATAN KECIL DI BAWAH KARTU */}
        <p className="text-[11px] text-slate-400 text-center mt-3 italic">
          Data contoh untuk demo, bukan status integrasi sebenarnya.
        </p>
      </div>
    </div>
  );
};
