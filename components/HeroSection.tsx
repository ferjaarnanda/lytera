"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Clock, Lock, QrCode } from "lucide-react";
import { IntegrationStatusCard } from "@/components/IntegrationStatusCard";

const FULL_HEADING = "Rujukan pasien tanpa kertas. Rekam medis yang ikut pasien.";

export const HeroSection: React.FC = () => {
  const [typedText, setTypedText] = useState("");
  const [showCursor, setShowCursor] = useState(true);

  // Stagger sequence stages:
  // stage >= 1: sub-headline fade-up (600ms)
  // stage >= 2: button 1 fade-up
  // stage >= 3: button 2 fade-up (120ms stagger)
  // stage >= 4: right column cards fade + slide from right (700ms)
  // stage >= 5: right card items stagger (150ms intervals)
  // stage >= 6: IntegrationStatusCard fade-up (700ms)
  const [animStage, setAnimStage] = useState(0);

  useEffect(() => {
    // Cek prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      const initTimer = setTimeout(() => {
        setTypedText(FULL_HEADING);
        setShowCursor(false);
        setAnimStage(6);
      }, 0);
      return () => clearTimeout(initTimer);
    }

    // Ketik huruf per huruf (~32ms per karakter)
    let charIndex = 0;
    const typingInterval = setInterval(() => {
      charIndex++;
      setTypedText(FULL_HEADING.slice(0, charIndex));

      if (charIndex >= FULL_HEADING.length) {
        clearInterval(typingInterval);

        // Kursor berkedip sebentar lalu hilang
        setTimeout(() => {
          setShowCursor(false);
        }, 300);

        // Mulai rangkaian stagger setelah H1 selesai:
        // 1. Sub-headline fade-up (600ms)
        setTimeout(() => setAnimStage(1), 100);

        // 2. Tombol 1
        setTimeout(() => setAnimStage(2), 350);

        // 3. Tombol 2 (stagger 120ms)
        setTimeout(() => setAnimStage(3), 470);

        // 4. Kartu timeline & token di kanan (fade + geser 24px, 700ms)
        setTimeout(() => setAnimStage(4), 600);

        // 5. Isi kartu muncul berurutan (stagger 150ms)
        setTimeout(() => setAnimStage(5), 850);

        // 6. Kartu Status Integrasi fade-up (700ms)
        setTimeout(() => setAnimStage(6), 1150);
      }
    }, 32);

    return () => {
      clearInterval(typingInterval);
    };
  }, []);

  return (
    <section
      data-navbar-tone="dark"
      className="w-full bg-[#0A2230] pt-[168px] pb-[96px] relative overflow-hidden text-left"
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* KOLOM KIRI (7 cols) */}
          <div className="lg:col-span-7 flex flex-col z-10">
            {/* H1: Efek Mengetik Huruf per Huruf tanpa Layout Shift */}
            <h1
              className="text-4xl sm:text-5xl lg:text-[56px] leading-[1.15] font-extrabold text-white tracking-tight relative"
              aria-label={FULL_HEADING}
            >
              {/* Teks tak terlihat sebagai penahan tinggi layout (mencegah melompat) */}
              <span className="invisible select-none block" aria-hidden="true">
                {FULL_HEADING}
              </span>

              {/* Teks yang sedang diketik di atasnya */}
              <span
                className="absolute inset-0 select-text block"
                aria-hidden="true"
              >
                {typedText}
                {showCursor && (
                  <span
                    className="inline-block w-[3px] h-[0.85em] bg-[#D99B7F] ml-1.5 align-baseline animate-pulse"
                    aria-hidden="true"
                  />
                )}
              </span>
            </h1>

            {/* Sub-headline: fade-up 600ms */}
            <p
              className={`text-base sm:text-lg text-slate-300 leading-[1.6] max-w-[540px] mt-6 transition-all duration-600 ease-out ${
                animStage >= 1
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4 pointer-events-none"
              }`}
            >
              Lytera menghubungkan pasien, puskesmas, rumah sakit, apotek, dan
              petugas administrasi dalam satu alur rujukan secara real-time.
            </p>

            {/* Dua Tombol CTA (stagger 120ms) */}
            <div className="flex flex-wrap items-center gap-4 mt-9">
              <Link
                href="#masuk-peran"
                className={`inline-flex items-center justify-center px-7 py-3.5 rounded-[14px] bg-[#D99B7F] text-[#0A2230] font-semibold text-[15px] hover:bg-[#E4AE94] hover:-translate-y-[1px] active:scale-[0.98] transition-all shadow-none ${
                  animStage >= 2
                    ? "opacity-100 translate-y-0 duration-500 ease-out"
                    : "opacity-0 translate-y-3 pointer-events-none"
                }`}
              >
                Mulai Sekarang
              </Link>
              <a
                href="#cara-kerja"
                className={`inline-flex items-center justify-center px-7 py-3.5 rounded-[14px] bg-transparent text-white font-semibold text-[15px] hover:bg-white/10 hover:-translate-y-[1px] active:scale-[0.98] transition-all shadow-none border border-white/20 ${
                  animStage >= 3
                    ? "opacity-100 translate-y-0 duration-500 ease-out"
                    : "opacity-0 translate-y-3 pointer-events-none"
                }`}
              >
                Lihat Cara Kerja
              </a>
            </div>
          </div>

          {/* KOLOM KANAN (5 cols): Kartu Rujukan & Token Akses Medis */}
          <div
            className={`lg:col-span-5 flex flex-col items-center justify-center relative min-h-[480px] transition-all duration-700 ease-out ${
              animStage >= 4
                ? "opacity-100 translate-x-0"
                : "opacity-0 translate-x-6 pointer-events-none"
            }`}
          >
            <div className="absolute w-[420px] h-[420px] rounded-full bg-[#132F40] pointer-events-none -right-4 top-1/2 -translate-y-1/2" />

            {/* Kartu Rujukan Aktif */}
            <div className="relative w-full max-w-[380px] bg-white rounded-[24px] p-6 shadow-xl z-10 border border-[#E2E8F0]">
              <div className="flex items-center justify-between pb-2 mb-4 border-b border-[#E2E8F0]/60">
                <div>
                  <span className="text-[12px] text-slate-400 block font-medium">
                    Status Terkini
                  </span>
                  <span className="text-[17px] font-bold text-[#0A2230]">
                    Rujukan Aktif #LY-8821
                  </span>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium bg-[#FAF5F2] text-[#8F5A4E]">
                  Rawat Jalan
                </span>
              </div>

              <div className="p-3 rounded-[16px] bg-[#FAF5F2] mb-4">
                <p className="text-[13px] font-semibold text-[#0A2230] flex items-center gap-1.5">
                  <span>Puskesmas Sukamaju</span>
                  <ArrowRight
                    className="w-3.5 h-3.5 text-[#8F5A4E] shrink-0"
                    strokeWidth={2}
                  />
                  <span>RSUD Kartika Husada</span>
                </p>
                <p className="text-[12px] text-slate-500 mt-0.5">
                  Spesialis: Poli Jantung &amp; Pembuluh Darah
                </p>
              </div>

              {/* Stepper Timeline dalam Kartu (Stagger 150ms antar item saat animStage >= 5) */}
              <div className="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
                {/* Item 1 */}
                <div
                  className={`flex items-start gap-3 relative transition-all duration-400 ease-out ${
                    animStage >= 5
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-2"
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-[#1B6B4D] flex items-center justify-center shrink-0 z-10 text-white">
                    <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#0A2230]">
                      Rujukan Diterbitkan
                    </p>
                    <p className="text-[12px] text-slate-500">
                      Puskesmas Sukamaju • 08:30 WIB
                    </p>
                  </div>
                </div>

                {/* Item 2 */}
                <div
                  className={`flex items-start gap-3 relative transition-all duration-400 ease-out delay-150 ${
                    animStage >= 5
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-2"
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-[#1B6B4D] flex items-center justify-center shrink-0 z-10 text-white">
                    <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#0A2230]">
                      Verifikasi Berkas
                    </p>
                    <p className="text-[12px] text-slate-500">
                      Kelurahan Sukamaju • 09:15 WIB
                    </p>
                  </div>
                </div>

                {/* Item 3 */}
                <div
                  className={`flex items-start gap-3 relative transition-all duration-400 ease-out delay-300 ${
                    animStage >= 5
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-2"
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-[#FFF4D6] text-[#E0A100] flex items-center justify-center shrink-0 z-10">
                    <Clock className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-[#0A2230]">
                      Diterima RSUD
                    </p>
                    <p className="text-[12px] text-[#7A5200]">
                      Poli Jantung • Menunggu jadwal
                    </p>
                  </div>
                </div>

                {/* Item 4 */}
                <div
                  className={`flex items-start gap-3 relative transition-all duration-400 ease-out delay-450 ${
                    animStage >= 5
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-2"
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center shrink-0 z-10">
                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                  </div>
                  <div className="min-w-0 opacity-60">
                    <p className="text-[13px] text-slate-500">
                      Pemeriksaan Selesai
                    </p>
                    <p className="text-[12px] text-slate-400">
                      Tindak lanjut &amp; resume medis
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Token Akses Medis Floating Badge */}
            <div
              className={`relative -mt-10 sm:-mt-12 sm:mr-[-40px] w-full max-w-[300px] bg-white rounded-[20px] p-4 shadow-xl border border-[#E2E8F0] z-20 self-end sm:self-auto transition-all duration-500 ease-out ${
                animStage >= 5
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-3"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Lock
                  className="w-4 h-4 text-[#0A2230] shrink-0"
                  strokeWidth={2}
                />
                <span className="text-[12px] font-semibold text-[#0A2230]">
                  Token Akses Medis
                </span>
              </div>
              <div className="bg-[#FAF5F2] rounded-[14px] p-2.5 text-center mb-2.5">
                <span className="text-[26px] leading-tight font-bold text-[#0A2230] tracking-wider tabular-nums">
                  849 201
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="w-10 h-10 rounded-[10px] bg-[#0A2230] text-white flex items-center justify-center shrink-0">
                  <QrCode className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#FFF4D6] text-[#7A5200] w-fit mb-0.5">
                    Berlaku 54 mnt lagi
                  </span>
                  <span className="text-[11px] text-slate-500 truncate">
                    Diberikan ke dokter saat periksa
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KARTU STATUS INTEGRASI TERKINI: Fade-up 700ms */}
        <div
          className={`w-full mt-[56px] pt-[36px] border-t border-white/[0.08] relative z-20 transition-all duration-700 ease-out ${
            animStage >= 6
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-6 pointer-events-none"
          }`}
        >
          <IntegrationStatusCard />
        </div>
      </div>
    </section>
  );
};
