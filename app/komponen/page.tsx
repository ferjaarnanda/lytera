"use client";

import React, { useState } from "react";
import {
  Navbar,
  NavbarVariant,
  Button,
  Card,
  CardInner,
  Badge,
  StatusIcon,
  Stepper,
  StepItem,
  Timeline,
  TimelineItemData,
  BackButton,
  IntegrationStatusCard,
} from "@/components";

export default function KomponenPage() {
  // State untuk mengontrol Navbar utama di bagian atas secara langsung
  const [activeVariant, setActiveVariant] = useState<NavbarVariant>("pasien");
  const [currentActiveMenu, setCurrentActiveMenu] = useState<string>("Beranda");

  // Varian Navbar yang didukung
  const navbarVariants: { id: NavbarVariant; label: string; desc: string }[] = [
    { id: "landing", label: "Landing Page", desc: "Fitur, Cara Kerja, Privasi | Masuk, Daftar" },
    { id: "pasien", label: "Pasien", desc: "Beranda, Rujukan Saya, Riwayat Medis, Izin Akses | AI, Avatar" },
    { id: "dokter-puskesmas", label: "Dokter Puskesmas", desc: "Buat Rujukan, Riwayat Rujukan, Rekam Medis | Puskesmas Sukamaju" },
    { id: "rumah-sakit", label: "Rumah Sakit", desc: "Rujukan Masuk, Jadwal Saya, Rekam Medis | RSUD Kartika Husada" },
    { id: "apoteker", label: "Apoteker", desc: "E-Resep, Riwayat | Instalasi Farmasi RSUD" },
    { id: "admin-faskes", label: "Admin Faskes", desc: "Dokter & Petugas, Kuota & Jadwal, Profil Faskes | Klinik Pratama Sehat" },
    { id: "verifikator", label: "Verifikator", desc: "Verifikasi, Riwayat | Kelurahan Sukamaju • Verifikator" },
    { id: "dinkes", label: "Dinas Kesehatan", desc: "Pemantauan, Verifikasi Faskes, Aturan Daerah | Dinkes Kab/Kota" },
  ];

  // Data contoh untuk Stepper
  const registrationSteps: StepItem[] = [
    { id: 1, title: "Verifikasi HP", subtitle: "Nomor terverifikasi OTP", status: "selesai" },
    { id: 2, title: "Biodata Diri", subtitle: "Pengisian NIK & KTP", status: "proses" },
    { id: 3, title: "Persetujuan", subtitle: "Informed consent digital", status: "belum" },
  ];

  const referralFlowSteps: StepItem[] = [
    { id: "r1", title: "Faskes 1 (Puskesmas)", subtitle: "Diagnosa awal & resume", status: "selesai" },
    { id: "r2", title: "Verifikasi BPJS", subtitle: "Validasi otomatis sistem", status: "selesai" },
    { id: "r3", title: "Admisi RSUD", subtitle: "Penjadwalan antrean poli", status: "proses" },
    { id: "r4", title: "Pemeriksaan Spesialis", subtitle: "Dokter Sp.JP", status: "belum" },
  ];

  // Data contoh untuk Timeline riwayat rujukan
  const timelineItems: TimelineItemData[] = [
    {
      id: "t1",
      title: "Rujukan Diterbitkan di Puskesmas Sukamaju",
      time: "16 Apr 2025, 08:30 WIB",
      status: "selesai",
      badgeText: "Terkirim",
      badgeVariant: "selesai",
      facility: "Puskesmas Sukamaju (Faskes 1)",
      doctor: "dr. Andi Pratama",
      description:
        "Diagnosa awal: Angina Pectoris Unstable (ICD-10 I20.0). Rekomendasi rujukan berjenjang ke Poli Jantung & Pembuluh Darah.",
    },
    {
      id: "t2",
      title: "Verifikasi Administrasi & Kepesertaan BPJS",
      time: "16 Apr 2025, 08:32 WIB",
      status: "selesai",
      badgeText: "Valid",
      badgeVariant: "selesai",
      facility: "Sistem Integrasi BPJS Kesehatan",
      description:
        "Status kepesertaan BPJS PBI aktif. Hak kelas rawat terverifikasi Kelas 3. Kuota rujukan faskes tujuan tersedia.",
    },
    {
      id: "t3",
      title: "Diterima oleh Admisi RSUD Kartika Husada",
      time: "16 Apr 2025, 09:15 WIB",
      status: "selesai",
      badgeText: "Terkonfirmasi",
      badgeVariant: "selesai",
      facility: "RSUD Kartika Husada",
      doctor: "Petugas Admisi Rujukan",
      description:
        "Berkas rujukan digital telah disahkan. Nomor rekam medis rumah sakit dikaitkan secara otomatis.",
    },
    {
      id: "t4",
      title: "Jadwal Pemeriksaan Poli Jantung",
      time: "19 Apr 2025, 10:30 WIB",
      status: "proses",
      badgeText: "Dalam Proses",
      badgeVariant: "proses",
      facility: "Poliklinik Jantung RSUD Kartika Husada",
      doctor: "dr. Hendra Wijaya, Sp.JP",
      description:
        "Nomor antrean: JTG-014. Pasien dimohon hadir 30 menit lebih awal untuk pencatatan tanda vital awal.",
    },
    {
      id: "t5",
      title: "Resume Medis & Keputusan Rujuk Balik (PRB)",
      time: "Estimasi: 19 Apr 2025",
      status: "belum",
      badgeText: "Menunggu",
      badgeVariant: "netral",
      facility: "Puskesmas Sukamaju",
      description:
        "Evaluasi berkala dan pengembalian resume medis perawatan ke dokter keluarga Puskesmas Sukamaju.",
    },
  ];

  // Palet Warna Resmi Lytera
  const colorPalette = [
    { name: "Night", hex: "#0A2230", desc: "Navigasi global & struktur", textLight: true },
    { name: "Deep Navy", hex: "#0F3040", desc: "Judul & aksen gelap", textLight: true },
    { name: "Terracotta", hex: "#8F5A4E", desc: "Aksi primer terang", textLight: true },
    { name: "Soft Peach", hex: "#D99B7F", desc: "Aksen/CTA pada latar Night", textLight: false },
    { name: "Slate", hex: "#464858", desc: "Teks bodi dokumen", textLight: true },
    { name: "Canvas", hex: "#F8FAFC", desc: "Latar aplikasi dasar", textLight: false, border: true },
    { name: "Cream", hex: "#FAF5F2", desc: "Permukaan kartu hangat", textLight: false, border: true },
    { name: "Mist", hex: "#EBF2F6", desc: "Sorotan baris & info", textLight: false, border: true },
    { name: "Border", hex: "#E2E8F0", desc: "Garis batas universal", textLight: false, border: true },
    { name: "Hijau Sukses", hex: "#1B6B4D", desc: "Status selesai & valid", textLight: true },
    { name: "Kuning Proses", hex: "#E0A100", desc: "Status sedang berlangsung", textLight: false },
    { name: "Merah Bahaya", hex: "#B3261E", desc: "Peringatan & gawat darurat", textLight: true },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#464858]" data-navbar-tone="light">
      {/* 1. NAVBAR KONTINU AKTIF (MENGILKUTI PROGRES SCROLL SECARA MULUS) */}
      <Navbar
        variant={activeVariant}
        activeItem={currentActiveMenu}
        onItemClick={(item) => setCurrentActiveMenu(item)}
      />

      {/* Konten Halaman dengan padding atas agar tidak tertutup Navbar fixed */}
      <main className="w-full pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-[1200px] mx-auto">
        {/* Header Penjelas Halaman Pratinjau */}
        <div className="mb-10 pb-6 border-b border-[#E2E8F0]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0F3040] tracking-tight">
                Katalog Fondasi Komponen Sistem Desain
              </h1>
              <p className="text-sm text-slate-500 mt-1.5">
                Pemeriksaan komponen antarmuka digital bersama untuk rujukan pasien & rekam medis.
              </p>g
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="info">Next.js 16 + Tailwind v4</Badge>
              <Badge variant="selesai">Plus Jakarta Sans</Badge>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* BAGIAN 1: PENGONTROL INTERAKTIF NAVBAR LIVE */}
        {/* ============================================================ */}
        <section className="mb-12">
          <Card variant="white" padding="lg" className="border border-[#E2E8F0] shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-5 border-b border-[#E2E8F0]">
              <div>
                <h2 className="text-lg font-bold text-[#0F3040]">
                  1. Pengontrol Navbar Interaktif (Varian Menu & Progres Scroll)
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Navbar bergerak kontinu mengikuti scroll: lebar, radius pil, kaca transparan, dan tone warna teks.
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-[#FAF5F2] px-3 py-1.5 rounded-full border border-[#E2E8F0] shrink-0 text-xs font-semibold text-[#8F5A4E]">
                <span>Scroll halaman untuk melihat interpolasi p</span>
              </div>
            </div>

            {/* Pilihan 8 Varian Menu Peran */}
            <div>
              <label className="block text-xs font-bold text-[#0F3040] uppercase tracking-wider mb-2.5">
                Pilih Varian Menu Navbar:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {navbarVariants.map((v) => {
                  const isSelected = activeVariant === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setActiveVariant(v.id);
                        // Reset item aktif pertama
                        const firstItem =
                          v.id === "landing"
                            ? "Fitur"
                            : v.id === "pasien"
                            ? "Beranda"
                            : v.id === "dokter-puskesmas"
                            ? "Buat Rujukan"
                            : v.id === "rumah-sakit"
                            ? "Rujukan Masuk"
                            : v.id === "apoteker"
                            ? "E-Resep"
                            : v.id === "admin-faskes"
                            ? "Dokter & Petugas"
                            : v.id === "verifikator"
                            ? "Verifikasi"
                            : "Pemantauan";
                        setCurrentActiveMenu(firstItem);
                      }}
                      className={`text-left p-3 rounded-[16px] border transition-all text-xs cursor-pointer ${
                        isSelected
                          ? "bg-[#0A2230] text-white border-[#0A2230] shadow-sm ring-2 ring-[#D99B7F]"
                          : "bg-white text-[#464858] border-[#E2E8F0] hover:bg-[#FAF5F2]"
                      }`}
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span>{v.label}</span>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-[#D99B7F]" />
                        )}
                      </div>
                      <p
                        className={`text-[11px] mt-1 leading-snug line-clamp-1 ${
                          isSelected ? "text-slate-300" : "text-slate-400"
                        }`}
                      >
                        {v.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Penjelasan Spesifikasi Kedua Keadaan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-5 border-t border-[#E2E8F0]">
              <CardInner variant="mist" padding="md">
                <span className="text-xs font-bold text-[#0F3040] uppercase tracking-wide">
                  Spesifikasi Keadaan A (Di Paling Atas)
                </span>
                <ul className="text-xs text-slate-600 mt-2 space-y-1 list-disc list-inside">
                  <li>Bar selebar penuh (<code>w-full</code>), tinggi 72px</li>
                  <li>Warna solid Night <code>#0A2230</code>, sudut siku (tidak membulat)</li>
                  <li>Border bawah 1px <code>rgba(255,255,255,0.08)</code></li>
                </ul>
              </CardInner>

              <CardInner variant="cream" padding="md">
                <span className="text-xs font-bold text-[#0F3040] uppercase tracking-wide">
                  Spesifikasi Keadaan B (Gulir {">"} 24px)
                </span>
                <ul className="text-xs text-slate-600 mt-2 space-y-1 list-disc list-inside">
                  <li>Pil melayang di tengah, lebar maksimal 1200px, jarak 16px dari atas</li>
                  <li>Sudut bulat penuh (<code>rounded-full</code>), tinggi 64px</li>
                  <li>Warna Night opacity 70%, backdrop-blur 16px, border 1px <code>rgba(255,255,255,0.12)</code></li>
                  <li>Bayangan lembut sehingga konten di belakang terlihat buram halus</li>
                </ul>
              </CardInner>
            </div>
          </Card>
        </section>

        {/* ============================================================ */}
        {/* BAGIAN 2: TOMBOL (BUTTON) */}
        {/* ============================================================ */}
        <section className="mb-12">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-[#0F3040]">2. Komponen Tombol (Button)</h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Sudut membulat 14px (<code>rounded-[14px]</code>), teks 15px/600 (tanpa uppercase), palet resmi.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Varian Standar di atas Latar Terang */}
            <Card variant="white" padding="lg">
              <h3 className="text-sm font-bold text-[#0F3040] mb-4 uppercase tracking-wider">
                Varian Dasar (Latar Terang)
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">Primary (Terracotta)</Button>
                <Button variant="secondary">Secondary (White)</Button>
                <Button variant="ghost">Ghost (Deep Navy)</Button>
              </div>

              <div className="mt-6 pt-4 border-t border-[#E2E8F0]">
                <span className="text-xs font-semibold text-slate-500 block mb-2">
                  Status Dinonaktifkan (Disabled)
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="primary" disabled>Primary Disabled</Button>
                  <Button variant="secondary" disabled>Secondary Disabled</Button>
                  <Button variant="ghost" disabled>Ghost Disabled</Button>
                </div>
              </div>
            </Card>

            {/* Tombol pada Latar Gelap (Night) & Ukuran */}
            <Card variant="white" padding="lg">
              <h3 className="text-sm font-bold text-[#0F3040] mb-3 uppercase tracking-wider">
                Varian Pada Latar Gelap (Night)
              </h3>
              <div className="bg-[#0A2230] p-4 rounded-[16px] flex flex-wrap items-center gap-3 mb-6">
                <Button variant="peach">Soft Peach (#D99B7F)</Button>
                <button className="h-12 px-6 rounded-[14px] text-white text-[15px] font-semibold hover:bg-white/10 transition-colors">
                  Ghost Putih
                </button>
              </div>

              <span className="text-xs font-semibold text-slate-500 block mb-2">
                Pilihan Ukuran (sm: 36px, md: 48px, lg: 56px)
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm" variant="primary">Kecil (sm)</Button>
                <Button size="md" variant="primary">Standar (md)</Button>
                <Button size="lg" variant="primary">Besar (lg)</Button>
              </div>
            </Card>
          </div>
        </section>

        {/* ============================================================ */}
        {/* BAGIAN 3: KARTU (CARD) & SURFACES */}
        {/* ============================================================ */}
        <section className="mb-12">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-[#0F3040]">3. Komponen Kartu (Card)</h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Sudut 24px (<code>rounded-[24px]</code>), border 1px <code>#E2E8F0</code>, padding standar 24px, sub-wadah 16px.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Kartu Dasar (White) */}
            <Card variant="white">
              <Badge variant="netral" className="mb-3">Kartu Standar</Badge>
              <h3 className="text-base font-bold text-[#0F3040] mb-2">Permukaan Dasar (White)</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Wadah data utama untuk daftar rujukan, hasil laboratorium, dan rincian pasien.
              </p>
              <CardInner variant="cream">
                <p className="text-xs font-semibold text-[#0F3040]">Nested Surface (Radius 16px)</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Warna Cream (#FAF5F2) untuk info ringkas.</p>
              </CardInner>
            </Card>

            {/* Kartu Cream */}
            <Card variant="cream">
              <Badge variant="info" className="mb-3">Kartu Sekunder</Badge>
              <h3 className="text-base font-bold text-[#0F3040] mb-2">Permukaan Cream (#FAF5F2)</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Digunakan untuk bagian pendukung, catatan klinis penting, dan callout konteks pasien.
              </p>
              <CardInner variant="white">
                <p className="text-xs font-semibold text-[#0F3040]">Nested Surface (Radius 16px)</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Warna Putih dengan border #E2E8F0.</p>
              </CardInner>
            </Card>

            {/* Kartu Mist */}
            <Card variant="mist">
              <Badge variant="selesai" className="mb-3">Kartu Sorotan</Badge>
              <h3 className="text-base font-bold text-[#0F3040] mb-2">Permukaan Mist (#EBF2F6)</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Digunakan untuk baris data terpilih, container riwayat aktif, dan pengumuman sistem.
              </p>
              <CardInner variant="cream">
                <p className="text-xs font-semibold text-[#0F3040]">Nested Surface (Radius 16px)</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Kontras seimbang antara Mist dan Cream.</p>
              </CardInner>
            </Card>
          </div>
        </section>

        {/* ============================================================ */}
        {/* BAGIAN 4: LENCANA (BADGE) */}
        {/* ============================================================ */}
        <section className="mb-12">
          <Card variant="white" padding="lg">
            <div className="mb-4 pb-3 border-b border-[#E2E8F0]">
              <h2 className="text-xl font-bold text-[#0F3040]">4. Komponen Lencana (Badge)</h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Bulat penuh (<code>rounded-full</code>), teks 13px medium, pasangan warna semantik resmi.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="selesai" showDot>Selesai (Success)</Badge>
              <Badge variant="proses" showDot>Dalam Proses (Warning)</Badge>
              <Badge variant="bahaya" showDot>Ditolak / Bahaya (Alert)</Badge>
              <Badge variant="netral">Elektif / Netral</Badge>
              <Badge variant="info">Info / Mist</Badge>
            </div>

            <div className="mt-6 pt-4 border-t border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 rounded-[16px] bg-[#EDF7F2] text-xs">
                <strong className="text-[#1B6B4D] block mb-1">Hijau Sukses (#1B6B4D)</strong>
                <p className="text-[#1B6B4D]/80 text-[11px]">Rujukan selesai, transfer disahkan, sync aktif.</p>
              </div>
              <div className="p-3 rounded-[16px] bg-[#FFF4D6] text-xs">
                <strong className="text-[#7A5200] block mb-1">Kuning Proses (#E0A100)</strong>
                <p className="text-[#7A5200]/80 text-[11px]">Sedang diperiksa, antrean jadwal, verifikasi nakes.</p>
              </div>
              <div className="p-3 rounded-[16px] bg-[#FDECEA] text-xs">
                <strong className="text-[#B3261E] block mb-1">Merah Bahaya (#B3261E)</strong>
                <p className="text-[#B3261E]/80 text-[11px]">Gawat darurat, alergi berat, rujukan batal.</p>
              </div>
            </div>
          </Card>
        </section>

        {/* ============================================================ */}
        {/* BAGIAN 5: IKON STATUS (STATUSICON) */}
        {/* ============================================================ */}
        <section className="mb-12">
          <Card variant="white" padding="lg">
            <div className="mb-4 pb-3 border-b border-[#E2E8F0]">
              <h2 className="text-xl font-bold text-[#0F3040]">5. Komponen Ikon Status (StatusIcon)</h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Selesai (lingkaran hijau bercentang), Proses (lingkaran kuning berjam), Belum (lingkaran putih garis abu-abu).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Selesai */}
              <div className="flex items-center gap-3 p-4 rounded-[16px] bg-[#EDF7F2]">
                <StatusIcon status="selesai" size="lg" />
                <div>
                  <span className="text-sm font-bold text-[#1B6B4D] block">Status: Selesai</span>
                  <span className="text-xs text-[#1B6B4D]/80">Lingkaran hijau bercentang putih</span>
                </div>
              </div>

              {/* Proses */}
              <div className="flex items-center gap-3 p-4 rounded-[16px] bg-[#FFF4D6]">
                <StatusIcon status="proses" size="lg" />
                <div>
                  <span className="text-sm font-bold text-[#7A5200] block">Status: Proses</span>
                  <span className="text-xs text-[#7A5200]/80">Lingkaran kuning berjam putih</span>
                </div>
              </div>

              {/* Belum */}
              <div className="flex items-center gap-3 p-4 rounded-[16px] bg-white border border-[#E2E8F0]">
                <StatusIcon status="belum" size="lg" stepNumber={3} />
                <div>
                  <span className="text-sm font-bold text-slate-600 block">Status: Belum</span>
                  <span className="text-xs text-slate-400">Lingkaran putih garis abu-abu</span>
                </div>
              </div>
            </div>

            {/* Perbandingan Ukuran */}
            <div className="mt-6 pt-4 border-t border-[#E2E8F0] flex flex-wrap items-center gap-6">
              <span className="text-xs font-semibold text-slate-500">Pilihan Ukuran:</span>
              <div className="flex items-center gap-2">
                <StatusIcon status="selesai" size="sm" />
                <span className="text-xs text-slate-400">sm (20px)</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon status="proses" size="md" />
                <span className="text-xs text-slate-400">md (24px)</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon status="belum" size="lg" stepNumber={1} />
                <span className="text-xs text-slate-400">lg (32px)</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon status="selesai" size="xl" />
                <span className="text-xs text-slate-400">xl (40px)</span>
              </div>
            </div>
          </Card>
        </section>

        {/* ============================================================ */}
        {/* BAGIAN 6: ALUR LANGKAH (STEPPER) */}
        {/* ============================================================ */}
        <section className="mb-12">
          <Card variant="white" padding="lg">
            <div className="mb-5 pb-3 border-b border-[#E2E8F0]">
              <h2 className="text-xl font-bold text-[#0F3040]">6. Komponen Alur Langkah (Stepper)</h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Indikator progres horizontal berbasis StatusIcon untuk pendaftaran dan tahapan rujukan berjenjang.
              </p>
            </div>

            {/* Stepper 1: 3 Langkah Pendaftaran */}
            <div className="mb-8">
              <span className="text-xs font-bold text-[#0F3040] uppercase tracking-wide block mb-3">
                Contoh 1: Alur Pendaftaran Pasien Baru (3 Langkah)
              </span>
              <div className="bg-[#FAF5F2] p-5 rounded-[16px] border border-[#E2E8F0]">
                <Stepper steps={registrationSteps} orientation="horizontal" />
              </div>
            </div>

            {/* Stepper 2: 4 Langkah Alur Rujukan */}
            <div>
              <span className="text-xs font-bold text-[#0F3040] uppercase tracking-wide block mb-3">
                Contoh 2: Alur Rujukan Berjenjang Faskes (4 Langkah)
              </span>
              <div className="bg-white p-5 rounded-[16px] border border-[#E2E8F0]">
                <Stepper steps={referralFlowSteps} orientation="horizontal" />
              </div>
            </div>
          </Card>
        </section>

        {/* ============================================================ */}
        {/* BAGIAN 7: LINIMASA (TIMELINE) */}
        {/* ============================================================ */}
        <section className="mb-12">
          <Card variant="white" padding="lg">
            <div className="mb-6 pb-3 border-b border-[#E2E8F0]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold text-[#0F3040]">
                    7. Komponen Linimasa (Timeline)
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Jejak vertikal riwayat medis terstruktur dengan garis kontinu dan angka tabular (<code>tabular-nums</code>).
                  </p>
                </div>
                <Badge variant="info">Sinkronisasi Realtime: 2 mnt lalu</Badge>
              </div>
            </div>

            <Timeline items={timelineItems} />
          </Card>
        </section>

        {/* ============================================================ */}
        {/* BAGIAN 8: TOMBOL KEMBALI HALAMAN AUTH (BACKBUTTON) */}
        {/* ============================================================ */}
        <section className="mb-12">
          <Card variant="cream" padding="lg">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-[#0F3040]">
                8. Tombol Navigasi Halaman Login / Registrasi (BackButton)
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Sesuai aturan: Halaman login dan pendaftaran TIDAK memakai navbar; hanya tombol ghost berbentuk pil
                &ldquo;← Kembali ke Beranda&rdquo; di pojok kiri atas.
              </p>
            </div>

            <div className="p-6 rounded-[16px] bg-white border border-[#E2E8F0] flex items-center justify-start">
              <BackButton href="/" label="← Kembali ke Beranda" />
            </div>
          </Card>
        </section>

        {/* ============================================================ */}
        {/* BAGIAN 9: REFERENSI PALET WARNA RESMI LYTERA */}
        {/* ============================================================ */}
        <section>
          <Card variant="white" padding="lg">
            <div className="mb-4 pb-3 border-b border-[#E2E8F0]">
              <h2 className="text-xl font-bold text-[#0F3040]">9. Palet Warna Resmi Lytera</h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Semua warna di bawah ini telah terpasang di Tailwind v4 (<code>@theme</code>) dan <strong>tidak ada warna ungu</strong>.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {colorPalette.map((col) => (
                <div
                  key={col.name}
                  className={`p-3 rounded-[16px] flex flex-col justify-between h-24 ${
                    col.border ? "border border-[#E2E8F0]" : ""
                  }`}
                  style={{ backgroundColor: col.hex }}
                >
                  <span
                    className={`text-xs font-bold leading-tight ${
                      col.textLight ? "text-white" : "text-[#0A2230]"
                    }`}
                  >
                    {col.name}
                  </span>
                  <div>
                    <span
                      className={`text-[11px] font-mono block ${
                        col.textLight ? "text-slate-200" : "text-slate-700"
                      }`}
                    >
                      {col.hex}
                    </span>
                    <span
                      className={`text-[10px] block leading-tight mt-0.5 line-clamp-1 ${
                        col.textLight ? "text-slate-300" : "text-slate-600"
                      }`}
                    >
                      {col.desc}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* ============================================================ */}
        {/* BAGIAN 10: KARTU STATUS INTEGRASI TERKINI (SIMULASI REAL-TIME) */}
        {/* ============================================================ */}
        <section className="mt-12">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-[#0F3040]">
              10. Kartu Status Integrasi Terkini (Simulasi Real-time)
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Kartu interaktif di landing page dengan rotasi 6 detik, animasi fade 450ms, jam real-time perangkat, dan nama fasilitas terlindungi.
            </p>
          </div>

          <div className="bg-[#0A2230] p-6 sm:p-10 rounded-[24px]">
            <IntegrationStatusCard />
          </div>
        </section>
      </main>
    </div>
  );
}
