"use client";

import React, { useEffect, useState, useCallback } from "react";
import { IntegrationStatusCard } from "@/components/IntegrationStatusCard";

const FULL_HEADING = "Sistem Digital Rujukan & Rekam Medis Terpadu";

export const HeroSection: React.FC = () => {
  const [typedText, setTypedText] = useState("");
  const [showCursor, setShowCursor] = useState(true);

  // Stagger sequence stages:
  // stage >= 1: sub-headline fade-up (600ms)
  // stage >= 2: button 1 fade-up
  // stage >= 3: button 2 fade-up (120ms stagger)
  // stage >= 4: right column IntegrationStatusCard fade-up (600ms)
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
        setAnimStage(4);
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

        // Rangkaian stagger setelah H1 selesai:
        // 1. Sub-headline fade-up
        setTimeout(() => setAnimStage(1), 100);

        // 2. Tombol Mulai Sekarang
        setTimeout(() => setAnimStage(2), 350);

        // 3. Tombol Cara Kerja
        setTimeout(() => setAnimStage(3), 470);

        // 4. Panel Status Integrasi Terkini di kanan atas hero
        setTimeout(() => setAnimStage(4), 600);
      }
    }, 32);

    return () => {
      clearInterval(typingInterval);
    };
  }, []);

  // Handler navigasi smooth scroll ke section masuk-peran
  const handleMulaiSekarang = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const target = document.getElementById("masuk-peran");
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
      window.history.pushState(null, "", "#masuk-peran");
    }
  }, []);

  // Handler navigasi smooth scroll ke section cara-kerja
  const handleCaraKerja = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const target = document.getElementById("cara-kerja");
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
      window.history.pushState(null, "", "#cara-kerja");
    }
  }, []);

  return (
    <section
      data-navbar-tone="dark"
      className="w-full max-w-full bg-transparent pt-[156px] sm:pt-[168px] pb-[72px] sm:pb-[96px] relative overflow-x-hidden text-left"
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* KOLOM KIRI (7 cols): HEADLINE, DESKRIPSI, TOMBOL */}
          <div className="lg:col-span-7 flex flex-col z-10">
            {/* H1: Efek Mengetik Huruf per Huruf tanpa Layout Shift */}
            <h1
              className="text-4xl sm:text-5xl lg:text-[54px] leading-[1.15] font-extrabold text-white tracking-tight relative"
              aria-label={FULL_HEADING}
            >
              {/* Teks tak terlihat sebagai penahan tinggi layout */}
              <span className="invisible select-none block" aria-hidden="true">
                {FULL_HEADING}
              </span>

              {/* Teks yang sedang diketik di atasnya */}
              <span
                className="absolute inset-0 select-text block text-white"
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
              className={`text-base sm:text-lg text-slate-200 leading-[1.6] max-w-[540px] mt-6 transition-[opacity,transform] duration-600 ease-out ${
                animStage >= 1
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4 pointer-events-none"
              }`}
            >
              Lytera menghubungkan pasien, puskesmas, rumah sakit, apotek, dan
              petugas administrasi dalam satu alur rujukan secara real-time.
            </p>

            {/* Dua Tombol CTA */}
            <div className="flex flex-wrap items-center gap-4 mt-9">
              <a
                href="#masuk-peran"
                onClick={handleMulaiSekarang}
                className={`inline-flex items-center justify-center px-7 py-3.5 rounded-[14px] bg-[#D99B7F] text-[#0A2230] font-bold text-[15px] hover:bg-[#E4AE94] hover:-translate-y-[1px] active:scale-[0.98] transition-[opacity,transform,background-color] duration-200 shadow-sm cursor-pointer ${
                  animStage >= 2
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-3 pointer-events-none"
                }`}
              >
                Mulai Sekarang
              </a>
              <a
                href="#cara-kerja"
                onClick={handleCaraKerja}
                className={`inline-flex items-center justify-center px-7 py-3.5 rounded-[14px] bg-white/10 text-white font-semibold text-[15px] hover:bg-white/20 hover:-translate-y-[1px] active:scale-[0.98] transition-[opacity,transform,background-color] duration-200 border border-white/25 shadow-sm cursor-pointer backdrop-blur-sm ${
                  animStage >= 3
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-3 pointer-events-none"
                }`}
              >
                Lihat Cara Kerja
              </a>
            </div>
          </div>

          {/* KOLOM KANAN (5 cols): STATUS INTEGRASI TERKINI COMPACT */}
          <div
            className={`lg:col-span-5 w-full flex items-center justify-center lg:justify-end relative z-10 transition-[opacity,transform] duration-700 ease-out ${
              animStage >= 4
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-6 pointer-events-none"
            }`}
          >
            <IntegrationStatusCard />
          </div>
        </div>
      </div>
    </section>
  );
};
