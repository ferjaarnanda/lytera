"use client";

import React, { useEffect, useRef, useState, useCallback, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { RolePickerDialog } from "@/components/RolePickerDialog";
import { LogoutButton } from "@/components/LogoutButton";

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
  forceGlass?: boolean;
  customMenuItems?: { label: string; href?: string }[];
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
    { label: "Penjamin & Verifikasi" },
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
    { label: "Ringkasan" },
    { label: "Dokter & Petugas" },
    { label: "Daftar Rujukan" },
  ],
  verifikator: [{ label: "Verifikasi" }, { label: "Riwayat" }],
  dinkes: [
    { label: "Pemantauan", href: "/portal/dinkes/pemantauan" },
    { label: "Verifikasi Faskes", href: "/portal/dinkes/verifikasi-faskes" },
    { label: "Aturan Daerah", href: "/portal/dinkes/aturan-daerah" },
  ],
};

// External store subscriber untuk landing scroll ambang 10px
function subscribeLandingScroll(callback: () => void) {
  window.addEventListener("scroll", callback, { passive: true });
  window.addEventListener("resize", callback, { passive: true });
  return () => {
    window.removeEventListener("scroll", callback);
    window.removeEventListener("resize", callback);
  };
}

function getLandingScrollSnapshot() {
  return window.scrollY > 10;
}

function getLandingScrollServerSnapshot() {
  return false;
}

function subscribeReducedMotion(callback: () => void) {
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", callback);
  return () => {
    mediaQuery.removeEventListener("change", callback);
  };
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

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
  forceGlass = false,
  customMenuItems,
}) => {
  const headerRef = useRef<HTMLElement>(null);
  const isLanding = variant === "landing";
  // Landing atau forceGlass: warna dikunci Deep Navy sejak render pertama (latar kaca putih konstan).
  // Variant lain tanpa forceGlass: deteksi dinamis berdasarkan tone section.
  const isNavyToneInitial = isLanding || forceGlass;
  const darkToneRef = useRef(!isNavyToneInitial);
  const [isDarkTone, setIsDarkTone] = useState(!isNavyToneInitial);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [rolePickerOpen, setRolePickerOpen] = useState(false);

  // State scroll landing berbasis useSyncExternalStore: reaktif ambang 10px tanpa setState effect
  const isLandingScrolled = useSyncExternalStore(
    subscribeLandingScroll,
    getLandingScrollSnapshot,
    getLandingScrollServerSnapshot
  );

  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  // glassAlpha: opacity latar kaca putih.
  // Landing = 0.48 (tipis, wallpaper samar terlihat). Variant lain = 0.62.
  const glassAlpha = isLanding ? 0.48 : 0.62;

  // easeOutCubic(t) = 1 - (1 - t)^3
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  // Scroll listener dengan requestAnimationFrame & passive listener untuk varian portal / non-landing
  useEffect(() => {
    if (isLanding) return;

    let ticking = false;

    // --- VARIANT PORTAL / NON-LANDING ---
    // Mempertahankan 100% perilaku awal portal pasien, dokter, RS, admin faskes, verifikator, dinkes
    let lastPShape = -1;
    let lastPColor = -1;
    let lastToneCheck = 0;

    const updateScrollProgress = () => {
      const scrollY = window.scrollY;
      const rawP = Math.min(Math.max(scrollY / 90, 0), 1);
      const pShape = easeOutCubic(rawP);
      const pColor = forceGlass ? 1 : pShape;

      // Hanya tulis ke CSS Variables bila nilainya benar-benar berubah (threshold 0.001)
      if (headerRef.current) {
        if (Math.abs(pShape - lastPShape) > 0.001) {
          lastPShape = pShape;
          headerRef.current.style.setProperty("--p-shape", pShape.toFixed(4));
        }
        if (Math.abs(pColor - lastPColor) > 0.001) {
          lastPColor = pColor;
          headerRef.current.style.setProperty("--p-color", pColor.toFixed(4));
        }
      }

      // Deteksi tone latar:
      if (forceGlass || pColor >= 0.75) {
        // Latar kaca putih -> selalu teks Deep Navy (darkTone = false)
        if (darkToneRef.current !== false) {
          darkToneRef.current = false;
          setIsDarkTone(false);
        }
      } else {
        // Throttle layout read (elementsFromPoint) maksimal 1x per 150ms saat pColor < 0.75
        const now = performance.now();
        if (now - lastToneCheck >= 150) {
          lastToneCheck = now;
          const elements = document.elementsFromPoint(window.innerWidth / 2, 40);
          let foundTone: string | null = null;
          for (const el of elements) {
            const tone = el.getAttribute("data-navbar-tone");
            if (tone) {
              foundTone = tone;
              break;
            }
          }
          const currentDark = foundTone === "dark";
          if (currentDark !== darkToneRef.current) {
            darkToneRef.current = currentDark;
            setIsDarkTone(currentDark);
          }
        }
      }

      ticking = false;
    };

    const onScrollNonLanding = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollProgress);
        ticking = true;
      }
    };

    // Panggil sekali saat inisialisasi
    updateScrollProgress();

    window.addEventListener("scroll", onScrollNonLanding, { passive: true });
    window.addEventListener("resize", onScrollNonLanding, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScrollNonLanding);
      window.removeEventListener("resize", onScrollNonLanding);
    };
  }, [forceGlass, isLanding]);

  const menuItems = customMenuItems || VARIANT_MENUS[variant] || VARIANT_MENUS.landing;
  const currentActive = activeItem || menuItems[0]?.label;
  const currentFacility = facilityName;

  // Identitas akun khusus faskes (Admin & Dokter)
  const isAdminFaskes = variant === "admin-faskes";
  const isDoctorRole = variant === "dokter-puskesmas" || variant === "rumah-sakit";
  const isFaskesPortal = isAdminFaskes || isDoctorRole;

  // Deteksi nilai email agar email tidak dipakai sebagai nama atau label peran di navbar
  const containsEmail = (str?: string | null) => Boolean(str && str.includes("@"));

  // Baris atas: Tampilkan nama pengguna nyata jika tersedia, fallback sesuai peran jika kosong
  const displayTopName =
    userName && userName.trim() && userName !== "Pengguna" && !containsEmail(userName)
      ? userName.trim()
      : isAdminFaskes
      ? "Admin Fasilitas"
      : variant === "pasien"
      ? "Pasien"
      : "Pengguna";

  // Baris bawah: Admin & Dokter menampilkan nama fasilitas yang terhubung atau label peran
  const rawRole = isFaskesPortal
    ? (facilityName || userRole || "Fasilitas Kesehatan")
    : (userRole || (variant === "pasien" ? "Pasien Pribadi" : "Petugas"));

  // Hilangkan bagian email jika terselip di userRole
  const displayBottomRole = rawRole
    ? rawRole
        .split(/[·•]/)[0]
        .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "")
        .trim() || (variant === "pasien" ? "Pasien Pribadi" : "Petugas")
    : (variant === "pasien" ? "Pasien Pribadi" : "Petugas");

  // Inisial avatar murni dari displayTopName (nama pasien / pengguna, bukan email)
  const avatarInitials = (displayTopName || "P")
    .trim()
    .split(/\s+/)
    .filter((w) => !w.includes("@"))
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "P";

  const router = useRouter();

  const handleDaftarClick = useCallback((e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const el = document.getElementById("masuk-peran");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      window.history.pushState(null, "", "#masuk-peran");
    } else {
      router.push("/#masuk-peran");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
          data-scrolled={isLanding ? (isLandingScrolled ? "true" : "false") : undefined}
          style={
            (isLanding
              ? {
                  // LANDING: transisi berbasis ambang scroll 10px
                  width: isLandingScrolled ? "calc(100% - 32px)" : "100%",
                  maxWidth: isLandingScrolled ? "1200px" : "100%",
                  marginTop: isLandingScrolled ? "16px" : "0px",
                  height: isLandingScrolled ? "64px" : "72px",
                  borderRadius: isLandingScrolled ? "32px" : "0px",
                  backgroundColor: "rgba(252, 254, 253, 0.82)",
                  backdropFilter: "blur(20px) saturate(160%)",
                  WebkitBackdropFilter: "blur(20px) saturate(160%)",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  borderColor: "rgba(46, 125, 81, 0.22)",
                  boxShadow: isLandingScrolled
                    ? "0 8px 28px -8px rgba(15, 45, 28, 0.15)"
                    : "0 4px 20px -4px rgba(15, 45, 28, 0.08)",
                  willChange: "width, max-width, height, border-radius, margin-top, box-shadow",
                  // Transisi CSS halus 280ms dengan cubic-bezier natural, nonaktif saat initial mount & reduced-motion
                  transition: prefersReducedMotion
                    ? "none"
                    : "width 280ms cubic-bezier(0.22, 1, 0.36, 1), max-width 280ms cubic-bezier(0.22, 1, 0.36, 1), margin-top 280ms cubic-bezier(0.22, 1, 0.36, 1), height 280ms cubic-bezier(0.22, 1, 0.36, 1), border-radius 280ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 280ms cubic-bezier(0.22, 1, 0.36, 1)",
                }
              : {
                  // NON-LANDING: perilaku lama — warna fade-in dari 0 ke 1 saat scroll.
                  "--p-shape": "0",
                  "--p-color": forceGlass ? "1" : "0",
                  width: "calc(100% - (var(--p-shape, 0) * 32px))",
                  maxWidth: "min(100%, calc(1200px + (1 - var(--p-shape, 0)) * 1200px))",
                  marginTop: "calc(var(--p-shape, 0) * 16px)",
                  height: "calc(72px - (var(--p-shape, 0) * 8px))",
                  borderRadius: "calc(var(--p-shape, 0) * 32px)",
                  backgroundColor:
                    `rgba(255, 255, 255, calc(var(--p-color, 0) * ${glassAlpha}))`,
                  backdropFilter:
                    "blur(calc(var(--p-color, 0) * 20px)) saturate(calc(100% + var(--p-color, 0) * 60%))",
                  WebkitBackdropFilter:
                    "blur(calc(var(--p-color, 0) * 20px)) saturate(calc(100% + var(--p-color, 0) * 60%))",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  borderColor:
                    "rgba(255, 255, 255, calc(0.08 + var(--p-color, 0) * 0.47))",
                  boxShadow:
                    "0 calc(var(--p-color, 0) * 12px) calc(var(--p-color, 0) * 32px) -8px rgba(15, 48, 64, calc(var(--p-color, 0) * 0.18))",
                  willChange: "width, max-width, height, border-radius, transform",
                  transition:
                    "color 300ms ease, background-color 120ms linear, border-color 120ms linear",
                }) as unknown as React.CSSProperties
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
                  isLanding
                    ? "bg-[#2E7D51]/20"
                    : isDarkTone
                    ? "bg-white/10"
                    : "bg-slate-200"
                }`}
              />
            </div>

            {/* SISI TENGAH: Menu Navigasi Desktop */}
            <nav className="hidden md:flex items-center gap-1.5" aria-label="Navigasi Utama">
              {menuItems.map((item) => {
                const isActive = item.label === currentActive;
                // Landing: font-bold (700) untuk keterbacaan di atas kaca transparan.
                // Variant lain: font-semibold (600) seperti semula.
                const fontWeight = isLanding ? "font-bold" : "font-semibold";
                return item.href ? (
                  <a
                    key={item.label}
                    href={item.href}
                    className={`px-3.5 py-1.5 rounded-full text-[13.5px] ${fontWeight} transition-colors duration-300 ${
                      isActive
                        ? "bg-[#2E7D51] text-white shadow-sm"
                        : isLanding
                        ? "text-[#1C3D2D] hover:text-[#2E7D51] hover:bg-[#E8F5EE]/70"
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
                    className={`px-3.5 py-1.5 rounded-full text-[13.5px] ${fontWeight} transition-colors duration-300 ${
                      isActive
                        ? "bg-[#2E7D51] text-white shadow-sm"
                        : isLanding
                        ? "text-[#1C3D2D] hover:text-[#2E7D51] hover:bg-[#E8F5EE]/70"
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
                  {/* Tombol Masuk: font-bold (700) untuk landing */}
                  <button
                    type="button"
                    onClick={() => setRolePickerOpen(true)}
                    className="px-4 py-2 rounded-[12px] text-[13.5px] font-bold transition-colors duration-200 text-[#0F3020] hover:text-[#2E7D51] hover:bg-[#E8F5EE]/70"
                  >
                    Masuk
                  </button>

                  {/* Tombol Daftar: font-extrabold (800) untuk landing */}
                  <button
                    type="button"
                    onClick={handleDaftarClick}
                    className="px-4 py-2 rounded-[12px] text-[13.5px] font-extrabold transition-colors duration-200 shadow-sm bg-[#2E7D51] text-white hover:bg-[#246843] cursor-pointer"
                  >
                    Daftar
                  </button>
                </div>
              ) : (
                /* Profil Pengguna untuk varian portal */
                <div className="flex items-center gap-3">
                  {currentFacility && !isFaskesPortal && (
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
                        {displayTopName}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {displayBottomRole}
                      </span>
                    </div>
                  </div>

                  {/* Tombol Keluar resmi di navigasi akun */}
                  <div className="hidden sm:block pl-2 border-l border-slate-200">
                    <LogoutButton className="px-3 py-1.5 rounded-full border border-[#E2E8F0] bg-white/80 text-[11px] font-semibold text-[#0F3040] hover:bg-[#FDECEA] hover:text-[#B3261E] hover:border-[#B3261E]/30 transition-colors shadow-2xs inline-flex items-center gap-1" />
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
                    className="px-3.5 py-2.5 rounded-xl text-sm font-semibold text-[#0A2230] hover:bg-[#E8F5EE] hover:text-[#2E7D51] transition-colors"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>

            {variant === "landing" ? (
              <div className="flex flex-col gap-2.5 pt-4 border-t border-[#E2E8F0]">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setRolePickerOpen(true);
                  }}
                  className="w-full py-2.5 rounded-[12px] border border-[#2E7D51]/30 text-[#0F3020] text-sm font-semibold hover:bg-[#E8F5EE]/60 transition-colors"
                >
                  Masuk
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleDaftarClick();
                  }}
                  className="w-full py-2.5 rounded-[12px] bg-[#2E7D51] text-white text-sm font-semibold hover:bg-[#246843] transition-colors"
                >
                  Daftar
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 pt-4 border-t border-[#E2E8F0]">
                {isFaskesPortal ? (
                  <div className="px-3 py-2 rounded-xl bg-slate-50 text-xs font-medium text-slate-600">
                    <span className="font-semibold block text-[#0F3040]">{displayTopName}</span>
                    <span>{displayBottomRole}</span>
                  </div>
                ) : currentFacility ? (
                  <div className="px-3 py-2 rounded-xl bg-slate-50 text-xs font-medium text-slate-600">
                    <span className="font-semibold block text-[#0F3040]">{currentFacility}</span>
                    <span>{userName} &bull; {userRole || "Staf"}</span>
                  </div>
                ) : null}
                <LogoutButton className="w-full py-2.5 rounded-[12px] border border-[#B3261E]/30 text-[#B3261E] text-sm font-semibold hover:bg-[#FDECEA] transition-colors inline-flex items-center justify-center gap-2" />
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
