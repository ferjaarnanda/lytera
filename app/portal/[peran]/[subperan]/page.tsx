"use client";

import React, { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Clock,
  CheckCircle2,
  ArrowRight,
  LogOut,
  Sparkles,
  Info,
  ShieldCheck,
  Building,
  UserCheck,
  FileSpreadsheet,
} from "lucide-react";
import { Navbar, NavbarVariant } from "@/components/Navbar";
import { Reveal } from "@/components/Reveal";
import {
  isValidRole,
  isValidSubRole,
  getRoleMeta,
  getSubRoleMeta,
  RoleId,
} from "@/lib/roles";

interface PageProps {
  params: Promise<{
    peran: string;
    subperan: string;
  }>;
}

export default function PortalSimulasiPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { peran, subperan } = resolvedParams;

  const valid = isValidRole(peran) && isValidSubRole(peran as RoleId, subperan);

  useEffect(() => {
    if (!valid) {
      router.replace("/");
    }
  }, [valid, router]);

  const roleMeta = getRoleMeta(peran);
  const subRoleMeta = getSubRoleMeta(peran, subperan);

  if (!valid || !roleMeta || !subRoleMeta) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <p className="text-sm text-[#464858]">Memuat portal simulasi...</p>
      </div>
    );
  }

  // Determine appropriate Navbar variant
  let navVariant: NavbarVariant = "landing";
  if (peran === "pasien") {
    navVariant = "pasien";
  } else if (peran === "fasilitas") {
    if (subperan === "rumah-sakit") navVariant = "rumah-sakit";
    else if (subperan === "apotek") navVariant = "apoteker";
    else navVariant = "dokter-puskesmas";
  } else if (peran === "verifikator") {
    navVariant = "verifikator";
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#464858]" data-navbar-tone="light">
      {/* Top Navbar with active portal variant */}
      <Navbar
        variant={navVariant}
        facilityName={peran === "fasilitas" ? `Faskes Terdaftar (${subRoleMeta.name})` : undefined}
        userName="Akun Demo Lytera"
        userRole={subRoleMeta.name}
      />

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        {/* Simulation Notice Banner */}
        <Reveal>
          <div className="mb-8 p-4 rounded-[18px] bg-[#EDF7F2] border border-[#1B6B4D]/25 flex items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#1B6B4D] text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-xs sm:text-sm text-[#0F3040]">
                <span className="font-bold">Mode Simulasi Interaktif: </span>
                <span>
                  Portal ini menampilkan antarmuka kerja dan alur rujukan digital untuk peran{" "}
                  <strong>{subRoleMeta.name}</strong> tanpa penyimpanan database permanen.
                </span>
              </div>
            </div>
            <Link
              href="/"
              className="shrink-0 text-xs font-semibold text-[#1B6B4D] hover:underline inline-flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              Keluar
            </Link>
          </div>
        </Reveal>

        {/* Welcome Header */}
        <Reveal delayMs={100}>
          <div className="bg-white rounded-[24px] border border-[#E2E8F0] p-6 sm:p-8 shadow-sm mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-[#8F5A4E] uppercase tracking-wider">
                  {roleMeta.name} &bull; Wilayah Kota Semarang
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#0F3040] mt-1">
                  Portal Kerja {subRoleMeta.name}
                </h1>
                <p className="text-sm text-[#464858]/80 mt-1 max-w-2xl">
                  {subRoleMeta.description}. Kelola dan pantau seluruh transaksi rujukan, verifikasi berkas, dan interoperabilitas rekam medis.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#EDF7F2] text-[#1B6B4D]">
                  <span className="w-2 h-2 rounded-full bg-[#1B6B4D] animate-pulse" />
                  Sistem Aktif
                </span>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Role Specific Grid Cards */}
        <Reveal delayMs={200}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {peran === "pasien" ? (
              <>
                <div className="bg-white p-6 rounded-[24px] border border-[#E2E8F0] shadow-sm">
                  <div className="w-10 h-10 rounded-2xl bg-[#EBF2F6] flex items-center justify-center text-[#0F3040] mb-4">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h2 className="text-base font-bold text-[#0F3040]">Rujukan Aktif</h2>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    Pantau fasilitas tujuan rujukan dan status antrean konsultasi Anda.
                  </p>
                  <div className="p-3 rounded-xl bg-[#FAF5F2] border border-[#E2E8F0] text-xs space-y-1">
                    <div className="flex justify-between font-semibold text-[#0F3040]">
                      <span>RSUP Dr. Kariadi</span>
                      <span className="text-[#1B6B4D]">Terkonfirmasi</span>
                    </div>
                    <p className="text-slate-500">Poli Penyakit Dalam &bull; 24 Sep 2026</p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[24px] border border-[#E2E8F0] shadow-sm">
                  <div className="w-10 h-10 rounded-2xl bg-[#EDF7F2] flex items-center justify-center text-[#1B6B4D] mb-4">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h2 className="text-base font-bold text-[#0F3040]">Izin Akses Rekam Medis</h2>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    Atur izin fasilitas kesehatan yang dapat membaca ringkasan rekam medis Anda.
                  </p>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-[#0F3040]">Token Akses Satu Pintu</p>
                      <p className="text-slate-400">Kedaluwarsa dalam 12 jam</p>
                    </div>
                    <span className="font-mono text-xs font-bold text-[#8F5A4E] tabular-nums">
                      LYT-882
                    </span>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[24px] border border-[#E2E8F0] shadow-sm">
                  <div className="w-10 h-10 rounded-2xl bg-[#FFF4D6] flex items-center justify-center text-[#7A5200] mb-4">
                    <Clock className="w-5 h-5" />
                  </div>
                  <h2 className="text-base font-bold text-[#0F3040]">Riwayat Kunjungan</h2>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    Catatan ringkasan pemeriksaan dari Puskesmas Pandanaran.
                  </p>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <p className="font-semibold text-[#0F3040]">Diagnosis ICD-10: I10</p>
                    <p className="text-slate-500 mt-0.5">Hipertensi Primer (Esensial)</p>
                  </div>
                </div>
              </>
            ) : peran === "fasilitas" ? (
              <>
                <div className="bg-white p-6 rounded-[24px] border border-[#E2E8F0] shadow-sm">
                  <div className="w-10 h-10 rounded-2xl bg-[#EBF2F6] flex items-center justify-center text-[#0F3040] mb-4">
                    <Building className="w-5 h-5" />
                  </div>
                  <h2 className="text-base font-bold text-[#0F3040]">Pasien Menunggu Rujukan</h2>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    Daftar antrean rujukan keluar menuju RS rujukan sekunder.
                  </p>
                  <div className="text-3xl font-bold text-[#0F3040] tabular-nums">
                    14 <span className="text-xs font-normal text-slate-500">pasien hari ini</span>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[24px] border border-[#E2E8F0] shadow-sm">
                  <div className="w-10 h-10 rounded-2xl bg-[#EDF7F2] flex items-center justify-center text-[#1B6B4D] mb-4">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <h2 className="text-base font-bold text-[#0F3040]">Ketersediaan Ruang / Jadwal</h2>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    Sinkronisasi kuota tempat tidur dan poli spesialis realtime.
                  </p>
                  <div className="text-3xl font-bold text-[#1B6B4D] tabular-nums">
                    92% <span className="text-xs font-normal text-slate-500">kapasitas terisi</span>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[24px] border border-[#E2E8F0] shadow-sm">
                  <div className="w-10 h-10 rounded-2xl bg-[#FAF5F2] flex items-center justify-center text-[#8F5A4E] mb-4">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <h2 className="text-base font-bold text-[#0F3040]">Interoperabilitas SatuSehat</h2>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    Standar HL7 FHIR tersambung lancar ke Kemenkes RI.
                  </p>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#1B6B4D]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Terhubung & Terverifikasi
                  </span>
                </div>
              </>
            ) : (
              <>
                {/* Verifikator */}
                <div className="bg-white p-6 rounded-[24px] border border-[#E2E8F0] shadow-sm">
                  <div className="w-10 h-10 rounded-2xl bg-[#EBF2F6] flex items-center justify-center text-[#0F3040] mb-4">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <h2 className="text-base font-bold text-[#0F3040]">Berkas Domisili Masuk</h2>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    Pengajuan surat keterangan dan verifikasi domisili pasien.
                  </p>
                  <div className="text-3xl font-bold text-[#0F3040] tabular-nums">
                    8 <span className="text-xs font-normal text-slate-500">permohonan baru</span>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[24px] border border-[#E2E8F0] shadow-sm">
                  <div className="w-10 h-10 rounded-2xl bg-[#EDF7F2] flex items-center justify-center text-[#1B6B4D] mb-4">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <h2 className="text-base font-bold text-[#0F3040]">Diverifikasi Hari Ini</h2>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    Berkas SKTM dan kepesertaan jaminan kesehatan telah tervalidasi.
                  </p>
                  <div className="text-3xl font-bold text-[#1B6B4D] tabular-nums">
                    23 <span className="text-xs font-normal text-slate-500">berkas selesai</span>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[24px] border border-[#E2E8F0] shadow-sm">
                  <div className="w-10 h-10 rounded-2xl bg-[#FFF4D6] flex items-center justify-center text-[#7A5200] mb-4">
                    <Info className="w-5 h-5" />
                  </div>
                  <h2 className="text-base font-bold text-[#0F3040]">Wilayah Terintegrasi</h2>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    Kecamatan Semarang Tengah &bull; 8 Puskesmas binaan.
                  </p>
                  <span className="text-xs font-semibold text-[#0F3040]">
                    Semua sistem layanan sinkron
                  </span>
                </div>
              </>
            )}
          </div>
        </Reveal>

        {/* Back to Home CTA */}
        <Reveal delayMs={300}>
          <div className="mt-12 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-[14px] text-sm font-semibold bg-[#0F3040] text-white hover:bg-[#0A2230] transition-colors"
            >
              <span>Kembali ke Beranda Utama</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Reveal>
      </main>
    </div>
  );
}
