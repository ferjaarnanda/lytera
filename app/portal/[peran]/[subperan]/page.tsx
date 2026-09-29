"use client";

import React, { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Info,
  Building,
  UserCheck,
  Plus,
} from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import { Navbar, NavbarVariant } from "@/components/Navbar";
import { Reveal } from "@/components/Reveal";
import { PasienDashboard } from "@/components/PasienDashboard";
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
        <p className="text-sm text-[#464858]">Memuat portal...</p>
      </div>
    );
  }

  // Jika peran adalah pasien, tampilkan Dashboard Pasien Asli terhubung ke Supabase
  if (peran === "pasien") {
    return <PasienDashboard subperan={subperan} />;
  }

  // Determine appropriate Navbar variant
  let navVariant: NavbarVariant = "landing";
  if (peran === "fasilitas") {
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
            <LogoutButton className="shrink-0 text-xs font-semibold text-[#1B6B4D] hover:underline inline-flex items-center gap-1" />
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

              <div className="flex flex-wrap items-center gap-2.5">
                {peran === "fasilitas" && (
                  <Link
                    href={`/portal/${peran}/${subperan}/staf`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold border border-[#E2E8F0] bg-white text-[#0F3040] hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    <UserCheck className="w-4 h-4 text-[#8F5A4E]" />
                    <span>Dokter & Petugas</span>
                  </Link>
                )}
                {(subperan === "puskesmas" || subperan === "klinik") && (
                  <Link
                    href={`/portal/${peran}/${subperan}/rujukan/baru`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold bg-[#8F5A4E] text-white hover:bg-[#A56F63] transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Buat Rujukan</span>
                  </Link>
                )}
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
            {peran === "fasilitas" ? (
              <>
                <div className="bg-white p-6 rounded-[24px] border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-2xl bg-[#EBF2F6] flex items-center justify-center text-[#0F3040] mb-4">
                      <Building className="w-5 h-5" />
                    </div>
                    <h2 className="text-base font-bold text-[#0F3040]">Pasien Menunggu Rujukan</h2>
                    <p className="text-xs text-slate-500 mt-1 mb-4">
                      Daftar antrean rujukan keluar menuju RS rujukan sekunder.
                    </p>
                  </div>
                  {subperan === "puskesmas" || subperan === "klinik" ? (
                    <div className="pt-2 flex flex-col gap-2">
                      <Link
                        href={`/portal/${peran}/${subperan}/rujukan/baru`}
                        className="w-full py-2.5 px-4 rounded-[12px] bg-[#8F5A4E] text-white text-xs font-semibold hover:bg-[#A56F63] transition-colors text-center inline-flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Buat Rujukan Baru</span>
                      </Link>
                      <Link
                        href={`/portal/${peran}/${subperan}/rujukan`}
                        className="w-full py-2 px-4 rounded-[12px] border border-[#E2E8F0] text-[#0F3040] text-xs font-semibold hover:bg-slate-50 transition-colors text-center"
                      >
                        Lihat Daftar Rujukan &rarr;
                      </Link>
                    </div>
                  ) : (
                    <div className="text-3xl font-bold text-[#0F3040] tabular-nums">
                      14 <span className="text-xs font-normal text-slate-500">pasien hari ini</span>
                    </div>
                  )}
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

                <div className="bg-white p-6 rounded-[24px] border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-2xl bg-[#EBF2F6] flex items-center justify-center text-[#0F3040] mb-4">
                      <UserCheck className="w-5 h-5 text-[#8F5A4E]" />
                    </div>
                    <h2 className="text-base font-bold text-[#0F3040]">Dokter & Petugas</h2>
                    <p className="text-xs text-slate-500 mt-1 mb-4">
                      Persetujuan dan kelola staf medis (dokter, petugas, apoteker) terafiliasi fasilitas ini.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Link
                      href={`/portal/${peran}/${subperan}/staf`}
                      className="w-full py-2.5 px-4 rounded-[12px] bg-[#0F3040] text-white text-xs font-semibold hover:bg-[#0A2230] transition-colors text-center inline-flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Kelola Dokter & Petugas &rarr;</span>
                    </Link>
                  </div>
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
