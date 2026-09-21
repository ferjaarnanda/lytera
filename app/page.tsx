"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  UserRound,
  Hospital,
  ShieldCheck,
  Landmark,
  ArrowLeftRight,
  KeyRound,
  AlertTriangle,
  Bed,
  History,
  Sparkles,
  Eye,
  CheckCircle2,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Logo } from "@/components/Logo";
import { Reveal } from "@/components/Reveal";
import { HeroSection } from "@/components/HeroSection";
import { RolePickerDialog } from "@/components/RolePickerDialog";
import { RoleId } from "@/lib/roles";

export default function HomePage() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<"daftar" | "masuk">("daftar");
  const [pickerRole, setPickerRole] = useState<RoleId | null>(null);

  const openPicker = (role: RoleId, mode: "daftar" | "masuk") => {
    setPickerRole(role);
    setPickerMode(mode);
    setPickerOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0A2230] text-[#464858] font-sans antialiased selection:bg-[#8F5A4E] selection:text-white">
      {/* 1. NAVBAR KONTINU DINAMIS */}
      <Navbar variant="landing" activeItem="Beranda" />

      <main className="w-full bg-[#0A2230]">
        <div className="flex flex-col w-full">
          {/* ============================================================ */}
          {/* SECTION 1: HERO SECTION (TYPEWRITER & SEQUENTIAL STAGGER) */}
          {/* ============================================================ */}
          <HeroSection />

          {/* ============================================================ */}
          {/* SECTION 2: MASUK SESUAI PERAN */}
          {/* ============================================================ */}
          <section
            id="masuk-peran"
            data-navbar-tone="light"
            className="w-full bg-[#FAF5F2] py-[96px] text-left scroll-mt-20"
          >
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
              <Reveal>
                <div className="flex flex-col text-left mb-12">
                  <h2 className="text-3xl sm:text-[32px] font-bold text-[#0A2230] tracking-tight">
                    Masuk sesuai peran
                  </h2>
                  <p className="text-base text-slate-600 mt-2">
                    Pilih peranmu untuk masuk ke ruang kerja yang dirancang khusus
                    sesuai kebutuhan.
                  </p>
                </div>
              </Reveal>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Kartu 1: Pasien */}
                <Reveal delay={0}>
                  <div className="group bg-white rounded-[24px] p-6 flex flex-col justify-between h-full text-center border border-[#E2E8F0] hover:border-[#8F5A4E]/35 shadow-sm hover:shadow-md transition-all duration-[220ms] ease-out hover:-translate-y-1">
                    <div>
                      <div className="w-12 h-12 rounded-full bg-[#EBF2F6] text-[#0A2230] flex items-center justify-center mb-4 mx-auto transition-transform duration-[220ms] group-hover:scale-[1.06]">
                        <UserRound className="w-6 h-6 text-[#0A2230]" strokeWidth={1.75} />
                      </div>
                      <h3 className="text-lg font-bold text-[#0A2230] mb-1 text-center">
                        Pasien
                      </h3>
                      <p className="text-[13px] text-slate-600 mb-4 min-h-[40px] text-center">
                        Pantau rujukan dan atur siapa yang boleh membuka rekam
                        medismu.
                      </p>
                      <div className="flex flex-wrap justify-center gap-1.5 mb-6">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-medium bg-[#EBF2F6] text-slate-700">
                          Pribadi
                        </span>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-medium bg-[#EBF2F6] text-slate-700">
                          Keluarga
                        </span>
                      </div>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => openPicker("pasien", "daftar")}
                        className="w-full inline-flex items-center justify-center py-3 px-4 rounded-[14px] bg-[#8F5A4E] hover:bg-[#A56F63] text-white text-sm font-semibold transition-all duration-200 hover:-translate-y-[1px] active:scale-[0.98] text-center"
                      >
                        Daftar sebagai Pasien
                      </button>
                      <div className="text-center mt-3">
                        <button
                          type="button"
                          onClick={() => openPicker("pasien", "masuk")}
                          className="text-xs text-slate-500 hover:text-[#0A2230] transition-colors"
                        >
                          Sudah punya akun?{" "}
                          <span className="text-[#8F5A4E] font-semibold">
                            Masuk
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </Reveal>

                {/* Kartu 2: Fasilitas Kesehatan */}
                <Reveal delay={80}>
                  <div className="group bg-white rounded-[24px] p-6 flex flex-col justify-between h-full text-center border border-[#E2E8F0] hover:border-[#8F5A4E]/35 shadow-sm hover:shadow-md transition-all duration-[220ms] ease-out hover:-translate-y-1">
                    <div>
                      <div className="w-12 h-12 rounded-full bg-[#EBF2F6] text-[#0A2230] flex items-center justify-center mb-4 mx-auto transition-transform duration-[220ms] group-hover:scale-[1.06]">
                        <Hospital className="w-6 h-6 text-[#0A2230]" strokeWidth={1.75} />
                      </div>
                      <h3 className="text-lg font-bold text-[#0A2230] mb-1 text-center">
                        Fasilitas Kesehatan
                      </h3>
                      <p className="text-[13px] text-slate-600 mb-4 min-h-[40px] text-center">
                        Dokter, petugas, dan apoteker bekerja dari satu tempat.
                      </p>
                      <div className="flex flex-wrap justify-center gap-1.5 mb-6">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#EBF2F6] text-slate-700">
                          Puskesmas
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#EBF2F6] text-slate-700">
                          Klinik
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#EBF2F6] text-slate-700">
                          Rumah Sakit
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#EBF2F6] text-slate-700">
                          Apotek
                        </span>
                      </div>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => openPicker("fasilitas", "daftar")}
                        className="w-full inline-flex items-center justify-center py-3 px-4 rounded-[14px] bg-[#8F5A4E] hover:bg-[#A56F63] text-white text-sm font-semibold transition-all duration-200 hover:-translate-y-[1px] active:scale-[0.98] text-center"
                      >
                        Daftar Fasilitas
                      </button>
                      <div className="text-center mt-3">
                        <button
                          type="button"
                          onClick={() => openPicker("fasilitas", "masuk")}
                          className="text-xs text-slate-500 hover:text-[#0A2230] transition-colors"
                        >
                          Sudah punya akun?{" "}
                          <span className="text-[#8F5A4E] font-semibold">
                            Masuk
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </Reveal>

                {/* Kartu 3: Verifikasi Administrasi */}
                <Reveal delay={160}>
                  <div className="group bg-white rounded-[24px] p-6 flex flex-col justify-between h-full text-center border border-[#E2E8F0] hover:border-[#8F5A4E]/35 shadow-sm hover:shadow-md transition-all duration-[220ms] ease-out hover:-translate-y-1">
                    <div>
                      <div className="w-12 h-12 rounded-full bg-[#EBF2F6] text-[#0A2230] flex items-center justify-center mb-4 mx-auto transition-transform duration-[220ms] group-hover:scale-[1.06]">
                        <ShieldCheck className="w-6 h-6 text-[#0A2230]" strokeWidth={1.75} />
                      </div>
                      <h3 className="text-lg font-bold text-[#0A2230] mb-1 text-center">
                        Verifikasi Administrasi
                      </h3>
                      <p className="text-[13px] text-slate-600 mb-4 min-h-[40px] text-center">
                        Periksa berkas domisili dan keterangan tidak mampu.
                      </p>
                      <div className="flex flex-wrap justify-center gap-1.5 mb-6">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#EBF2F6] text-slate-700">
                          Kelurahan
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#EBF2F6] text-slate-700">
                          Kecamatan
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#EBF2F6] text-slate-700">
                          Dinas Sosial
                        </span>
                      </div>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => openPicker("verifikator", "daftar")}
                        className="w-full inline-flex items-center justify-center py-3 px-4 rounded-[14px] bg-[#8F5A4E] hover:bg-[#A56F63] text-white text-sm font-semibold transition-all duration-200 hover:-translate-y-[1px] active:scale-[0.98] text-center"
                      >
                        Daftar Verifikator
                      </button>
                      <div className="text-center mt-3">
                        <button
                          type="button"
                          onClick={() => openPicker("verifikator", "masuk")}
                          className="text-xs text-slate-500 hover:text-[#0A2230] transition-colors"
                        >
                          Sudah punya akun?{" "}
                          <span className="text-[#8F5A4E] font-semibold">
                            Masuk
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </Reveal>

                {/* Kartu 4: Dinas Kesehatan */}
                <Reveal delay={240}>
                  <div className="group bg-white rounded-[24px] p-6 flex flex-col justify-between h-full text-center border border-[#E2E8F0] hover:border-[#8F5A4E]/35 shadow-sm hover:shadow-md transition-all duration-[220ms] ease-out hover:-translate-y-1">
                    <div>
                      <div className="w-12 h-12 rounded-full bg-[#EBF2F6] text-[#0A2230] flex items-center justify-center mb-4 mx-auto transition-transform duration-[220ms] group-hover:scale-[1.06]">
                        <Landmark className="w-6 h-6 text-[#0A2230]" strokeWidth={1.75} />
                      </div>
                      <h3 className="text-lg font-bold text-[#0A2230] mb-1 text-center">
                        Dinas Kesehatan
                      </h3>
                      <p className="text-[13px] text-slate-600 mb-4 min-h-[40px] text-center">
                        Verifikasi fasilitas, atur aturan daerah, dan pantau
                        rujukan.
                      </p>
                      <div className="flex flex-wrap justify-center gap-1.5 mb-6">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#EBF2F6] text-slate-700">
                          Dinkes Kota/Kab
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#EBF2F6] text-slate-700">
                          Provinsi
                        </span>
                      </div>
                    </div>
                    <div>
                      <Link
                        href="/masuk/dinkes"
                        className="w-full inline-flex items-center justify-center py-3 px-4 rounded-[14px] bg-[#8F5A4E] hover:bg-[#A56F63] text-white text-sm font-semibold transition-all duration-200 hover:-translate-y-[1px] active:scale-[0.98] text-center"
                      >
                        Masuk
                      </Link>
                      <div className="text-center mt-3">
                        <span className="text-[12px] text-slate-400 block truncate text-center">
                          Akun diterbitkan admin sistem.
                        </span>
                      </div>
                    </div>
                  </div>
                </Reveal>
              </div>
            </div>
          </section>

          {/* ============================================================ */}
          {/* SECTION 3: CARA KERJA */}
          {/* ============================================================ */}
          <section
            id="cara-kerja"
            data-navbar-tone="light"
            className="w-full bg-white py-[96px] text-left border-y border-[#E2E8F0] scroll-mt-20"
          >
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
              <Reveal>
                <div className="flex flex-col text-left mb-14">
                  <h2 className="text-3xl sm:text-[32px] font-bold text-[#0A2230] tracking-tight">
                    Cara kerja
                  </h2>
                  <p className="text-base text-slate-600 mt-2">
                    Alur rujukan berjenjang yang tertib, transparan, dan terhubung
                    antar faskes.
                  </p>
                </div>
              </Reveal>

              <div className="relative">
                <div className="hidden lg:block absolute top-[28px] left-[40px] right-[40px] h-[2px] bg-[#E2E8F0] z-0" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                  {/* Langkah 1 */}
                  <Reveal delay={0}>
                    <div className="flex flex-col items-start bg-white p-4 rounded-[20px] border border-[#E2E8F0]/80 h-full">
                      <div className="w-14 h-14 rounded-full bg-[#EBF2F6] text-[#8F5A4E] flex items-center justify-center text-xl font-bold mb-4">
                        1
                      </div>
                      <h3 className="text-[17px] text-[#0A2230] mb-1 font-bold">
                        Faskes membuat rujukan
                      </h3>
                      <p className="text-[13px] text-slate-600 leading-relaxed">
                        Dokter faskes setelah memeriksa pasien, mengisi anamnesis,
                        dan menerbitkan rujukan digital.
                      </p>
                    </div>
                  </Reveal>

                  {/* Langkah 2 */}
                  <Reveal delay={80}>
                    <div className="flex flex-col items-start bg-white p-4 rounded-[20px] border border-[#E2E8F0]/80 h-full">
                      <div className="w-14 h-14 rounded-full bg-[#EBF2F6] text-[#8F5A4E] flex items-center justify-center text-xl font-bold mb-4">
                        2
                      </div>
                      <h3 className="text-[17px] text-[#0A2230] mb-1 font-bold">
                        Verifikasi administrasi
                      </h3>
                      <p className="text-[13px] text-slate-600 leading-relaxed">
                        Kelurahan atau Dinsos memverifikasi syarat domisili dan
                        SKTM secara paralel bila diperlukan.
                      </p>
                    </div>
                  </Reveal>

                  {/* Langkah 3 */}
                  <Reveal delay={160}>
                    <div className="flex flex-col items-start bg-white p-4 rounded-[20px] border border-[#E2E8F0]/80 h-full">
                      <div className="w-14 h-14 rounded-full bg-[#EBF2F6] text-[#8F5A4E] flex items-center justify-center text-xl font-bold mb-4">
                        3
                      </div>
                      <h3 className="text-[17px] text-[#0A2230] mb-1 font-bold">
                        Rumah sakit menjadwalkan
                      </h3>
                      <p className="text-[13px] text-slate-600 leading-relaxed">
                        Fasilitas rujukan menerima dokumen klinis dan menetapkan
                        tanggal serta jam temu dokter spesialis.
                      </p>
                    </div>
                  </Reveal>

                  {/* Langkah 4 */}
                  <Reveal delay={240}>
                    <div className="flex flex-col items-start bg-white p-4 rounded-[20px] border border-[#E2E8F0]/80 h-full">
                      <div className="w-14 h-14 rounded-full bg-[#EBF2F6] text-[#8F5A4E] flex items-center justify-center text-xl font-bold mb-4">
                        4
                      </div>
                      <h3 className="text-[17px] text-[#0A2230] mb-1 font-bold">
                        Hasil dikirim balik
                      </h3>
                      <p className="text-[13px] text-slate-600 leading-relaxed">
                        Setelah penanganan di rumah sakit, laporan resume medis
                        dikirimkan kembali ke puskesmas perujuk.
                      </p>
                    </div>
                  </Reveal>
                </div>
              </div>
            </div>
          </section>

          {/* ============================================================ */}
          {/* SECTION 4: FITUR UTAMA PLATFORM LYTERA */}
          {/* ============================================================ */}
          <section
            id="fitur"
            data-navbar-tone="light"
            className="w-full bg-[#F8FAFC] py-[96px] overflow-x-clip text-left scroll-mt-20"
          >
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
              <Reveal>
                <div className="flex flex-col text-left mb-12">
                  <h2 className="text-3xl sm:text-[36px] font-extrabold text-[#0A2230] leading-tight mb-2 tracking-tight">
                    Fitur utama platform Lytera
                  </h2>
                  <p className="text-base text-slate-600 max-w-[640px]">
                    Dirancang khusus untuk keandalan klinis, kepatuhan regulasi,
                    serta kemudahan adopsi tenaga medis.
                  </p>
                </div>
              </Reveal>

              {/* PEMBUNGKUS BARIS ATAS: Geser 32px ke KIRI di layar lg ke atas */}
              <div className="lg:-translate-x-8 transition-transform duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {/* Fitur 1 */}
                  <Reveal delay={0}>
                    <div className="bg-white rounded-[20px] p-6 border border-[#E2E8F0] shadow-sm flex flex-col justify-start h-full">
                      <div className="w-11 h-11 rounded-[12px] bg-[#EBF2F6] text-[#0A2230] flex items-center justify-center mb-3.5">
                        <ArrowLeftRight className="w-5 h-5 text-[#0A2230]" strokeWidth={1.75} />
                      </div>
                      <h3 className="text-[18px] leading-[26px] text-[#0A2230] mb-1.5 font-bold">
                        Rujukan digital terintegrasi
                      </h3>
                      <p className="text-[13.5px] text-slate-600 leading-relaxed">
                        Tanpa dokumen fisik, berkas klinis terkirim instan antar
                        fasilitas kesehatan lintas jenjang dengan protokol keamanan
                        terenkripsi.
                      </p>
                    </div>
                  </Reveal>

                  {/* Fitur 2 */}
                  <Reveal delay={80}>
                    <div className="bg-white rounded-[20px] p-6 border border-[#E2E8F0] shadow-sm flex flex-col justify-start h-full">
                      <div className="w-11 h-11 rounded-[12px] bg-[#EBF2F6] text-[#0A2230] flex items-center justify-center mb-3.5">
                        <KeyRound className="w-5 h-5 text-[#0A2230]" strokeWidth={1.75} />
                      </div>
                      <h3 className="text-[18px] leading-[26px] text-[#0A2230] mb-1.5 font-bold">
                        Rekam medis dengan izin pasien
                      </h3>
                      <p className="text-[13.5px] text-slate-600 leading-relaxed">
                        Pasien mengontrol penuh siapa dan berapa lama data dibuka
                        melalui mekanisme token 6-digit dengan batas kedaluwarsa
                        ketat.
                      </p>
                    </div>
                  </Reveal>

                  {/* Fitur 3 */}
                  <Reveal delay={160}>
                    <div className="bg-white rounded-[20px] p-6 border border-[#E2E8F0] shadow-sm flex flex-col justify-start h-full">
                      <div className="w-11 h-11 rounded-[12px] bg-[#EBF2F6] text-[#0A2230] flex items-center justify-center mb-3.5">
                        <AlertTriangle className="w-5 h-5 text-[#0A2230]" strokeWidth={1.75} />
                      </div>
                      <h3 className="text-[18px] leading-[26px] text-[#0A2230] mb-1.5 font-bold">
                        Antrean berdasarkan prioritas
                      </h3>
                      <p className="text-[13.5px] text-slate-600 leading-relaxed">
                        Triase cerdas membagi kasus Gawat Darurat, Urgent, dan
                        Elektif secara transparan sehingga penanganan kritis tidak
                        tertunda.
                      </p>
                    </div>
                  </Reveal>
                </div>
              </div>

              {/* PEMBUNGKUS BARIS BAWAH: Geser 32px ke KANAN di layar lg ke atas */}
              <div className="mt-5 lg:translate-x-8 transition-transform duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {/* Fitur 4 */}
                  <Reveal delay={0}>
                    <div className="bg-white rounded-[20px] p-6 border border-[#E2E8F0] shadow-sm flex flex-col justify-start h-full">
                      <div className="w-11 h-11 rounded-[12px] bg-[#EBF2F6] text-[#0A2230] flex items-center justify-center mb-3.5">
                        <Bed className="w-5 h-5 text-[#0A2230]" strokeWidth={1.75} />
                      </div>
                      <h3 className="text-[18px] leading-[26px] text-[#0A2230] mb-1.5 font-bold">
                        Kuota dokter &amp; kapasitas RS
                      </h3>
                      <p className="text-[13.5px] text-slate-600 leading-relaxed">
                        Informasi ketersediaan jadwal dokter spesialis dan tempat
                        tidur rawat inap disajikan transparan untuk mencegah penumpukan
                        antrean.
                      </p>
                    </div>
                  </Reveal>

                  {/* Fitur 5 */}
                  <Reveal delay={80}>
                    <div className="bg-white rounded-[20px] p-6 border border-[#E2E8F0] shadow-sm flex flex-col justify-start h-full">
                      <div className="w-11 h-11 rounded-[12px] bg-[#EBF2F6] text-[#0A2230] flex items-center justify-center mb-3.5">
                        <History className="w-5 h-5 text-[#0A2230]" strokeWidth={1.75} />
                      </div>
                      <h3 className="text-[18px] leading-[26px] text-[#0A2230] mb-1.5 font-bold">
                        Log akses transparan
                      </h3>
                      <p className="text-[13.5px] text-slate-600 leading-relaxed">
                        Pasien menerima catatan riwayat akses setiap kali fasilitas
                        atau dokter membuka rekam medisnya.
                      </p>
                    </div>
                  </Reveal>

                  {/* Fitur 6 */}
                  <Reveal delay={160}>
                    <div className="bg-white rounded-[20px] p-6 border border-[#E2E8F0] shadow-sm flex flex-col justify-start h-full">
                      <div className="w-11 h-11 rounded-[12px] bg-[#EBF2F6] text-[#0A2230] flex items-center justify-center mb-3.5">
                        <Sparkles className="w-5 h-5 text-[#0A2230]" strokeWidth={1.75} />
                      </div>
                      <h3 className="text-[18px] leading-[26px] text-[#0A2230] mb-1.5 font-bold">
                        Asisten Lytera AI
                      </h3>
                      <p className="text-[13.5px] text-slate-600 leading-relaxed">
                        Panduan rujukan praktis, penjelasan istilah medis berbahasa
                        mudah, dan info persiapan faskes tanpa diagnosis mandiri.
                      </p>
                    </div>
                  </Reveal>
                </div>
              </div>
            </div>
          </section>

          {/* ============================================================ */}
          {/* SECTION 5: DAN KENAPA LYTERA? */}
          {/* ============================================================ */}
          <section
            id="kenapa-lytera"
            data-navbar-tone="light"
            className="w-full bg-[#FAF5F2] py-[96px] text-left scroll-mt-20"
          >
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
              <Reveal>
                <div className="flex flex-col text-left mb-16">
                  <h2 className="text-3xl sm:text-[32px] font-bold text-[#0A2230] tracking-tight">
                    Dan kenapa Lytera?
                  </h2>
                  <p className="text-base text-slate-600 mt-2 max-w-3xl">
                    Lytera hadir untuk membantu mengatasi berbagai permasalahan
                    dalam proses rujukan dan pengelolaan rekam medis. Selain
                    mengurangi penumpukan rujukan dan risiko tercecernya rekam
                    medis, Lytera juga mempermudah proses pembuatan dan
                    pengelolaan surat rujukan secara lebih cepat, terstruktur, dan
                    efisien.
                  </p>
                </div>
              </Reveal>

              <div className="space-y-16">
                {/* Baris 1: Pasien yang pegang kendali */}
                <Reveal>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    <div className="lg:col-span-6">
                      <h3 className="text-2xl font-bold text-[#0A2230] mb-3">
                        Pasien yang pegang kendali
                      </h3>
                      <p className="text-base text-slate-600 leading-relaxed">
                        Rekam medismu dilindungi token 6 digit yang bisa kamu
                        berikan saat periksa dan cabut kapan saja. Setiap pembukaan
                        data tercatat rapi di log akses.
                      </p>
                    </div>
                    <div className="lg:col-span-6">
                      <div className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E2E8F0]">
                        <div className="flex items-center justify-between pb-2 mb-4 border-b border-[#E2E8F0]/60">
                          <span className="text-[16px] font-bold text-[#0A2230]">
                            Otorisasi Akses Pasien
                          </span>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-medium bg-[#FAF5F2] text-[#8F5A4E]">
                            Aman &amp; Terenkripsi
                          </span>
                        </div>
                        <div className="bg-[#FAF5F2] rounded-[16px] p-4 flex items-center justify-between mb-4">
                          <div>
                            <span className="text-[12px] text-slate-500 block">
                              Token Sesi Pemeriksaan
                            </span>
                            <span className="text-[26px] font-bold text-[#0A2230] tabular-nums">
                              492 810
                            </span>
                          </div>
                          <button
                            type="button"
                            className="px-4 py-2 bg-white text-[#B3261E] rounded-[12px] text-[13px] font-semibold hover:bg-[#FDECEA] transition-colors border border-[#E2E8F0]"
                          >
                            Cabut Izin
                          </button>
                        </div>
                        <div className="space-y-2">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                            Catatan Akses Terakhir
                          </span>
                          <div className="flex items-center justify-between py-2 text-[13px] text-slate-600 border-b border-[#E2E8F0]/40">
                            <div className="flex items-center gap-2">
                              <Eye className="w-4 h-4 text-[#1B6B4D] shrink-0" />
                              <span>dr. Anita Wijaya (Poli Jantung RSUD)</span>
                            </div>
                            <span className="tabular-nums text-slate-400">
                              10:14 WIB
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-2 text-[13px] text-slate-600">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0" />
                              <span>Petugas Adm. Kelurahan Sukamaju</span>
                            </div>
                            <span className="tabular-nums text-slate-400">
                              09:12 WIB
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Reveal>

                {/* Baris 2: Prioritas dan kuota terlihat */}
                <Reveal>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    <div className="lg:col-span-6 lg:order-2">
                      <h3 className="text-2xl font-bold text-[#0A2230] mb-3">
                        Prioritas dan kuota terlihat
                      </h3>
                      <p className="text-base text-slate-600 leading-relaxed">
                        Sistem triase terstandarisasi (Gawat Darurat, Urgent,
                        Elektif) dan informasi ketersediaan jadwal dokter
                        disajikan transparan agar penanganan pasien lebih terarah.
                      </p>
                    </div>
                    <div className="lg:col-span-6 lg:order-1">
                      <div className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E2E8F0]">
                        <div className="flex items-center justify-between pb-2 mb-4 border-b border-[#E2E8F0]/60">
                          <span className="text-[16px] font-bold text-[#0A2230]">
                            Ketersediaan &amp; Triase
                          </span>
                          <span className="text-[12px] text-slate-400">
                            RSUD Kartika Husada
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-4">
                          <div className="p-2.5 rounded-[12px] bg-[#FDECEA] border-l-4 border-[#B3261E]">
                            <span className="text-[11px] font-bold text-[#B3261E] block">
                              Gawat Darurat
                            </span>
                            <span className="text-[12px] text-slate-700">
                              Langsung IGD
                            </span>
                          </div>
                          <div className="p-2.5 rounded-[12px] bg-[#FFF4D6] border-l-4 border-[#E0A100]">
                            <span className="text-[11px] font-bold text-[#7A5200] block">
                              Urgen
                            </span>
                            <span className="text-[12px] text-slate-700">
                              &lt; 24 Jam
                            </span>
                          </div>
                          <div className="p-2.5 rounded-[12px] bg-white border border-[#E2E8F0]">
                            <span className="text-[11px] font-bold text-slate-700 block">
                              Elektif
                            </span>
                            <span className="text-[12px] text-slate-600">
                              Sesuai Jadwal
                            </span>
                          </div>
                        </div>
                        <div className="p-4 rounded-[16px] bg-[#FAF5F2] space-y-3">
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[14px] font-semibold text-[#0A2230]">
                                Poli Jantung &amp; Pembuluh Darah
                              </span>
                              <span className="text-[12px] font-semibold text-[#1B6B4D] tabular-nums">
                                Tersisa 8 Kuota
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                              <div
                                className="h-full bg-[#8F5A4E] rounded-full"
                                style={{ width: "73%" }}
                              />
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-[12px] text-slate-500 pt-1">
                            <span>dr. Anita Wijaya, Sp.JP</span>
                            <span className="tabular-nums">
                              Jadwal: Besok, 09:00 - 13:00
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Reveal>

                {/* Baris 3: Asisten Lytera AI */}
                <Reveal>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    <div className="lg:col-span-6">
                      <h3 className="text-2xl font-bold text-[#0A2230] mb-3">
                        Asisten Lytera AI
                      </h3>
                      <p className="text-base text-slate-600 leading-relaxed">
                        Membantu pasien memahami istilah resume medis, jadwal
                        rujukan, dan dokumen yang harus disiapkan. Lytera AI
                        menjawab pertanyaan panduan tanpa pernah menggantikan
                        diagnosis dokter.
                      </p>
                    </div>
                    <div className="lg:col-span-6">
                      <div className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E2E8F0]">
                        <div className="flex items-center gap-3 pb-2 mb-4 border-b border-[#E2E8F0]/60">
                          <div className="w-8 h-8 rounded-full bg-[#8F5A4E] text-white flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <span className="text-[15px] text-[#0A2230] block font-semibold">
                              Asisten Panduan Lytera
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Bukan pengganti saran medis langsung dokter
                            </span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="bg-[#FAF5F2] rounded-[16px] p-3 text-left">
                            <p className="text-[13px] text-[#0A2230]">
                              &ldquo;Halo! Saya menerima rujukan ke Poli Jantung
                              besok. Apa saja berkas yang wajib saya bawa?&rdquo;
                            </p>
                          </div>
                          <div className="bg-[#EBF2F6] rounded-[16px] p-3 text-left">
                            <p className="text-[13px] text-[#0A2230] leading-relaxed">
                              Siapkan 3 hal berikut:
                              <br />
                              1. KTP fisik asli
                              <br />
                              2. Surat Rujukan Digital (buka di aplikasi Lytera)
                              <br />
                              3. Token Akses Medis aktif yang bisa kamu bagikan di
                              meja administrasi rumah sakit.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Reveal>
              </div>
            </div>
          </section>

          {/* ============================================================ */}
          {/* SECTION 6: CTA CONTAINER */}
          {/* ============================================================ */}
          <section data-navbar-tone="light" className="w-full py-[96px] bg-[#F8FAFC]">
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
              <Reveal>
                <div className="w-full rounded-[24px] bg-[#0A2230] p-10 sm:p-14 text-center flex flex-col items-center">
                  <h2 className="text-3xl sm:text-[36px] leading-[44px] font-extrabold text-white tracking-tight">
                    Mulai dari peranmu
                  </h2>
                  <p className="text-base text-slate-300 max-w-xl mx-auto mt-3">
                    Pilih peranmu, lalu mulai dari rujukan pertama.
                  </p>
                  <Link
                    href="#masuk-peran"
                    className="inline-flex items-center justify-center px-8 py-4 rounded-[14px] bg-[#D99B7F] text-[#0A2230] font-bold text-[15px] hover:bg-[#E4AE94] hover:-translate-y-[1px] active:scale-[0.98] transition-all mt-6 shadow-none"
                  >
                    Mulai Sekarang
                  </Link>
                </div>
              </Reveal>
            </div>
          </section>
        </div>
      </main>

      {/* FOOTER */}
      <footer
        data-navbar-tone="dark"
        className="w-full bg-[#0A2230] border-t border-white/[0.08] py-8 text-left"
      >
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6">
            <div className="flex items-center gap-3">
              <Logo tone="dark" size="sm" />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6">
              <a
                className="text-xs text-slate-300 hover:text-white transition-colors"
                href="#fitur"
              >
                Fitur Layanan
              </a>
              <a
                className="text-xs text-slate-300 hover:text-white transition-colors"
                href="#cara-kerja"
              >
                Cara Kerja
              </a>
              <a
                className="text-xs text-slate-300 hover:text-white transition-colors"
                href="#kenapa-lytera"
              >
                Kenapa Lytera?
              </a>
            </div>
          </div>
          <div className="border-t border-white/[0.08] pt-4 text-center">
            <p className="text-xs text-slate-400">
              Prototipe sistem rujukan dan rekam medis digital. Seluruh data adalah data simulasi.
            </p>
          </div>
        </div>
      </footer>

      {/* MODAL PEMILIH PERAN */}
      <RolePickerDialog
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        mode={pickerMode}
        initialRole={pickerRole}
      />
    </div>
  );
}
