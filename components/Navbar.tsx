"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { RolePickerDialog } from "@/components/RolePickerDialog";

export type NavbarVariant =
  | "landing"
  | "pasien"
  | "dokter-puskesmas"
  | "rumah-sakit"
  | "apoteker"
  | "admin-faskes"
  | "verifikator"
  | "dinkes";

export interface NavbarProps {
  variant?: NavbarVariant;
  activeItem?: string;
  facilityName?: string;
  userName?: string;
  userRole?: string;
  isFixed?: boolean;
  hideLogoText?: boolean;
  onItemClick?: (item: string) => void;
  className?: string;
}

// Konfigurasi item menu per varian peran
const VARIANT_MENUS: Record<NavbarVariant, { label: string; href?: string }[]> = {
  landing: [
    { label: "Fitur", href: "#fitur" },
    { label: "Cara Kerja", href: "#cara-kerja" },
    { label: "Kenapa Lytera?", href: "#kenapa-lytera" },
  ],
  pasien: [
    { label: "Beranda" },
    { label: "Rujukan Saya" },
    { label: "Riwayat Medis" },
    { label: "Izin Akses" },
  ],
  "dokter-puskesmas": [
    { label: "Buat Rujukan" },
    { label: "Riwayat Rujukan" },
    { label: "Rekam Medis" },
  ],
  "rumah-sakit": [
    { label: "Rujukan Masuk" },
    { label: "Jadwal Saya" },
    { label: "Rekam Medis" },
  ],
  apoteker: [{ label: "E-Resep" }, { label: "Riwayat" }],
  "admin-faskes": [
    { label: "Dokter & Petugas" },
    { label: "Kuota & Jadwal" },
    { label: "Profil Faskes" },
  ],
  verifikator: [{ label: "Verifikasi" }, { label: "Riwayat" }],
  dinkes: [
    { label: "Pemantauan" },
    { label: "Verifikasi Faskes" },
    { label: "Aturan Daerah" },
  ],
};

const DEFAULT_FACILITIES: Record<NavbarVariant, string | undefined> = {
  landing: undefined,
  pasien: undefined,
  "dokter-puskesmas": "Puskesmas Sukamaju",
  "rumah-sakit": "RSUD Kartika Husada",
  apoteker: "Instalasi Farmasi RSUD",
  "admin-faskes": "Klinik Pratama Sehat",
  verifikator: "Kelurahan Sukamaju • Verifikator",
  dinkes: "Dinas Kesehatan Kab/Kota",
};

export const Navbar: React.FC<NavbarProps> = ({
  variant = "landing",
  activeItem,
  facilityName,
  userName = "Siti Rahmawati",
  userRole,
  isFixed = true,
  hideLogoText = false,
  onItemClick,
  className = "",
}) => {
  const headerRef = useRef<HTMLElement>(null);
  const darkToneRef = useRef(false);
  const [isDarkTone, setIsDarkTone] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [rolePickerOpen, setRolePickerOpen] = useState(false);

  // easeOutCubic(t) = 1 - (1 - t)^3
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  // Scroll listener dengan requestAnimationFrame & passive listener
  useEffect(() => {
    let ticking = false;

    const updateScrollProgress = () => {
      const scrollY = window.scrollY;
      const rawP = Math.min(Math.max(scrollY / 90, 0), 1);
      const p = easeOutCubic(rawP);

      // Tuliskan ke CSS Variable --p pada elemen navbar secara langsung (tanpa re-render React)
      if (headerRef.current) {
        headerRef.current.style.setProperty("--p", p.toFixed(4));
      }

      // Deteksi warna teks dan tone latar:
      let currentDark = false;
      if (p >= 0.75) {
        currentDark = false; // Latar kaca putih -> selalu teks Deep Navy
      } else {
        // Cari elemen dengan data-navbar-tone pada posisi y=40
        const elements = document.elementsFromPoint(window.innerWidth / 2, 40);
        let foundTone: string | null = null;
        for (const el of elements) {
          const tone = el.getAttribute("data-navbar-tone");
          if (tone) {
            foundTone = tone;
            break;
          }
        }
        if (foundTone) {
          currentDark = foundTone === "dark";
        } else {
          currentDark = false; // Hero sekarang berlatar terang (#F7F8FA)
        }
      }

      // Hanya ubah state jika terjadi pergantian tone (mencegah loop re-render tiap scroll)
      if (currentDark !== darkToneRef.current) {
        darkToneRef.current = currentDark;
        setIsDarkTone(currentDark);
      }

      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollProgress);
        ticking = true;
      }
    };

    // Panggil sekali saat inisialisasi
    updateScrollProgress();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const menuItems = VARIANT_MENUS[variant] || VARIANT_MENUS.landing;
  const currentActive = activeItem || menuItems[0]?.label;
  const currentFacility = facilityName ?? DEFAULT_FACILITIES[variant];

  // Inisial avatar
  const avatarInitials = userName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleDaftarClick = useCallback(() => {
    const el = document.getElementById("masuk-peran");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  return (
    <>
      <div
        className={`${
          isFixed
            ? "fixed top-0 left-0 right-0 z-40 pointer-events-none"
            : "w-full"
        } flex justify-center ${className}`}
      >
        <header
          ref={headerRef}
          style={
            {
              "--p": "0",
              width: "calc(100% - (var(--p, 0) * 32px))",
              maxWidth: "min(100%, calc(1200px + (1 - var(--p, 0)) * 1200px))",
              marginTop: "calc(var(--p, 0) * 16px)",
              height: "calc(72px - (var(--p, 0) * 8px))",
              borderRadius: "calc(var(--p, 0) * 32px)",
              backgroundColor:
                "rgba(255, 255, 255, calc(var(--p, 0) * 0.62))",
              backdropFilter:
                "blur(calc(var(--p, 0) * 20px)) saturate(calc(100% + var(--p, 0) * 60%))",
              WebkitBackdropFilter:
                "blur(calc(var(--p, 0) * 20px)) saturate(calc(100% + var(--p, 0) * 60%))",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: isDarkTone
                ? "rgba(255, 255, 255, calc(0.08 + var(--p, 0) * 0.47))"
                : "rgba(15, 48, 64, calc(0.06 + var(--p, 0) * 0.15))",
              boxShadow:
                "0 calc(var(--p, 0) * 12px) calc(var(--p, 0) * 32px) -8px rgba(15, 48, 64, calc(var(--p, 0) * 0.18))",
              willChange: "width, max-width, height, border-radius, transform",
              transition:
                "color 300ms ease, background-color 120ms linear, border-color 120ms linear",
            } as React.CSSProperties
          }
          className="pointer-events-auto flex items-center justify-between px-4 sm:px-6"
        >
          <div className="w-full flex items-center justify-between gap-4">
            {/* SISI KIRI: Logo Lytera Terpadu */}
            <div className="flex items-center gap-6 shrink-0">
              <Logo
                tone={isDarkTone ? "dark" : "light"}
                hideText={hideLogoText}
                size="md"
              />
              <div
                className={`h-6 w-[1px] hidden lg:block transition-colors duration-300 ${
                  isDarkTone ? "bg-white/10" : "bg-slate-200"
                }`}
              />
            </div>

            {/* SISI TENGAH: Menu Navigasi Desktop */}
            <nav className="hidden md:flex items-center gap-1.5" aria-label="Navigasi Utama">
              {menuItems.map((item) => {
                const isActive = item.label === currentActive;
                return item.href ? (
                  <a
                    key={item.label}
                    href={item.href}
                    className={`px-3.5 py-1.5 rounded-full text-[13.5px] font-semibold transition-colors duration-300 ${
                      isActive
                        ? "bg-[#8F5A4E] text-white shadow-sm"
                        : isDarkTone
                        ? "text-slate-300 hover:text-white hover:bg-white/10"
                        : "text-[#464858] hover:text-[#0A2230] hover:bg-black/5"
                    }`}
                  >
                    {item.label}
                  </a>
                ) : (
                  <button
                    key={item.label}
                    onClick={() => onItemClick?.(item.label)}
                    type="button"
                    className={`px-3.5 py-1.5 rounded-full text-[13.5px] font-semibold transition-colors duration-300 ${
                      isActive
                        ? "bg-[#8F5A4E] text-white shadow-sm"
                        : isDarkTone
                        ? "text-slate-300 hover:text-white hover:bg-white/10"
                        : "text-[#464858] hover:text-[#0A2230] hover:bg-black/5"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* SISI KANAN: Aksi Peran atau Profil */}
            <div className="flex items-center gap-3 shrink-0">
              {variant === "landing" ? (
                <div className="hidden sm:flex items-center gap-2.5">
                  {/* Tombol Masuk: membuka RolePickerDialog mode masuk */}
                  <button
                    type="button"
                    onClick={() => setRolePickerOpen(true)}
                    className={`px-4 py-2 rounded-[12px] text-[13.5px] font-semibold transition-colors duration-300 ${
                      isDarkTone
                        ? "text-white hover:bg-white/10"
                        : "text-[#0A2230] hover:bg-black/5"
                    }`}
                  >
                    Masuk
                  </button>

                  {/* Tombol Daftar: Tone gelap = Soft Peach; Tone terang = Terracotta */}
                  <button
                    type="button"
                    onClick={handleDaftarClick}
                    className={`px-4 py-2 rounded-[12px] text-[13.5px] font-semibold transition-colors duration-300 shadow-sm ${
                      isDarkTone
                        ? "bg-[#D99B7F] text-[#0A2230] hover:bg-[#E4AE94]"
                        : "bg-[#8F5A4E] text-white hover:bg-[#A56F63]"
                    }`}
                  >
                    Daftar
                  </button>
                </div>
              ) : (
                /* Profil Pengguna untuk varian portal */
                <div className="flex items-center gap-3">
                  {currentFacility && (
                    <div
                      className={`hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-300 ${
                        isDarkTone
                          ? "bg-white/10 text-slate-200 border border-white/15"
                          : "bg-black/5 text-[#0A2230] border border-black/10"
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1B6B4D]" />
                      <span>{currentFacility}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#8F5A4E] text-white flex items-center justify-center text-xs font-bold shadow-sm">
                      {avatarInitials}
                    </div>
                    <div className="hidden sm:flex flex-col text-left leading-tight">
                      <span
                        className={`text-[13px] font-semibold transition-colors duration-300 ${
                          isDarkTone ? "text-white" : "text-[#0A2230]"
                        }`}
                      >
                        {userName}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {userRole || (variant === "pasien" ? "Pasien Mandiri" : "Tenaga Medis")}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tombol Hamburger Mobile (< 768px) */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`md:hidden p-2 rounded-lg transition-colors ${
                  isDarkTone
                    ? "text-white hover:bg-white/10"
                    : "text-[#0A2230] hover:bg-black/5"
                }`}
                aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu"}
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </header>
      </div>

      {/* MOBILE DRAWER PANEL */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-[#0A2230]/60 backdrop-blur-sm md:hidden animate-in fade-in duration-200">
          <div className="fixed top-0 right-0 bottom-0 w-[280px] bg-white p-6 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-250">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] mb-5">
                <Logo tone="light" size="sm" />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-[#0A2230] hover:bg-slate-100"
                  aria-label="Tutup menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {menuItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.href || "#"}
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3.5 py-2.5 rounded-xl text-sm font-semibold text-[#0A2230] hover:bg-[#FAF5F2] hover:text-[#8F5A4E] transition-colors"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>

            {variant === "landing" && (
              <div className="flex flex-col gap-2.5 pt-4 border-t border-[#E2E8F0]">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setRolePickerOpen(true);
                  }}
                  className="w-full py-2.5 rounded-[12px] border border-[#E2E8F0] text-[#0A2230] text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Masuk
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleDaftarClick();
                  }}
                  className="w-full py-2.5 rounded-[12px] bg-[#8F5A4E] text-white text-sm font-semibold hover:bg-[#A56F63] transition-colors"
                >
                  Daftar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DIALOG PEMILIH PERAN */}
      <RolePickerDialog
        isOpen={rolePickerOpen}
        onClose={() => setRolePickerOpen(false)}
        mode="masuk"
      />
    </>
  );
};
