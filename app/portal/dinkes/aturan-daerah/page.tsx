"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Landmark,
  ShieldCheck,
  Clock,
  AlertTriangle,
  UserCheck,
  Hospital,
  KeyRound,
  CheckCircle2,
  Building,
  Info,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { Navbar } from "@/components/Navbar";
import { Reveal } from "@/components/Reveal";
import { LogoutButton } from "@/components/LogoutButton";

interface CurrentUserProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
}

export default function DinkesAturanDaerahPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  // Data Riil dari Supabase
  const [activeVerifiersCount, setActiveVerifiersCount] = useState(0);
  const [activeHospitalsCount, setActiveHospitalsCount] = useState(0);
  const [activeClinicsCount, setActiveClinicsCount] = useState(0);

  // 1. Verifikasi Autentikasi & Peran Dinkes
  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient();
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setAccessDenied(true);
          setAuthLoading(false);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, email, role, status")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError || !profile || profile.role !== "dinkes") {
          setAccessDenied(true);
          setAuthLoading(false);
          return;
        }

        setCurrentUser({
          id: profile.id,
          full_name: profile.full_name || "Petugas Dinkes",
          email: profile.email || user.email || "",
          role: profile.role,
          status: profile.status,
        });

        // Ambil data statistik pendukung regulasi
        const { data: verifiers } = await supabase
          .from("verifier_profiles")
          .select("id, status")
          .eq("status", "aktif");

        const { data: facs } = await supabase
          .from("facilities")
          .select("id, type, status")
          .eq("status", "aktif");

        if (verifiers) {
          setActiveVerifiersCount(verifiers.length);
        }
        if (facs) {
          setActiveHospitalsCount(facs.filter((f) => f.type === "rumah_sakit").length);
          setActiveClinicsCount(facs.filter((f) => f.type === "puskesmas" || f.type === "klinik").length);
        }

        setAuthLoading(false);
      } catch (err) {
        console.error("Gagal memeriksa sesi Dinkes:", err);
        setAccessDenied(true);
        setAuthLoading(false);
      }
    }

    checkAuth();
  }, []);

  // Render Loading
  if (authLoading) {
    return (
      <div className="min-h-screen text-[#464858]" data-navbar-tone="light">
        <Navbar variant="dinkes" userName="Memuat Profil..." userRole="Dinas Kesehatan" forceGlass={true} />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-16">
          <Card variant="white" className="p-12 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-[#EBF2F6] flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Clock className="w-6 h-6 text-[#0F3040]" />
            </div>
            <h2 className="text-lg font-bold text-[#0F3040]">Memeriksa Hak Akses Regulasi Daerah...</h2>
            <p className="text-xs text-slate-500 mt-1">Memuat basis data kebijakan rujukan Dinas Kesehatan.</p>
          </Card>
        </main>
      </div>
    );
  }

  // Render Access Denied
  if (accessDenied || !currentUser) {
    return (
      <div className="min-h-screen text-[#464858]" data-navbar-tone="light">
        <Navbar variant="landing" forceGlass={true} />
        <main className="max-w-xl mx-auto px-4 pt-32 pb-16 text-center">
          <Card variant="white" className="p-8 border-[#FDECEA] shadow-md">
            <div className="w-12 h-12 rounded-full bg-[#FDECEA] text-[#B3261E] flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-[#0F3040] mb-2">Akses Terbatas Dinas Kesehatan</h1>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              Halaman aturan dan regulasi daerah hanya dapat diakses oleh akun resmi Dinas Kesehatan.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/masuk/dinkes"
                className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-[#0F3040] text-white text-xs font-semibold hover:bg-[#0A2230] transition-colors"
              >
                Masuk sebagai Dinas Kesehatan
              </Link>
              <LogoutButton />
            </div>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[#464858]" data-navbar-tone="light" data-portal-wallpaper="true">
      {/* Navbar Resmi Dinkes */}
      <Navbar
        variant="dinkes"
        activeItem="Aturan Daerah"
        userName={currentUser.full_name}
        userRole="Dinas Kesehatan"
        forceGlass={true}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        {/* HEADER ATURAN DAERAH */}
        <Reveal>
          <div className="bg-white rounded-[24px] border border-[#E2E8F0] p-6 sm:p-8 shadow-sm mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EBF2F6] text-[#0F3040] mb-2">
                  <Landmark className="w-3.5 h-3.5 text-[#8F5A4E]" />
                  <span>Dinas Kesehatan • Regulasi Wilayah</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F3040] tracking-tight">
                  Aturan &amp; Regulasi Rujukan Daerah
                </h1>
                <p className="text-xs sm:text-sm text-[#464858]/80 mt-1 max-w-2xl leading-relaxed">
                  Standar operasional alur verifikasi penjaminan daerah (SKTM), kepatuhan izin rekam medis privasi PDP, dan penjenjangan rujukan faskes di wilayah kerja.
                </p>
              </div>

              {/* Status Kebijakan Pill */}
              <div className="flex items-center gap-2.5 bg-[#E8F5EE] border border-[#2E7D51]/30 px-4 py-2.5 rounded-[16px] shrink-0">
                <ShieldCheck className="w-5 h-5 text-[#2E7D51]" />
                <div>
                  <span className="text-[11px] text-slate-500 block leading-tight">Status Regulasi</span>
                  <span className="text-xs font-bold text-[#1C3D2D]">Aktif &amp; Terdistribusi</span>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* SECTION 1: VERIFIKASI PENJAMINAN DAERAH (SKTM & DOMISILI) */}
        <Reveal delay={40}>
          <div className="bg-white rounded-[24px] border border-[#E2E8F0] p-6 sm:p-8 shadow-sm mb-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-[#8F5A4E] uppercase tracking-wider mb-1">
                  <span>Regulasi 01</span>
                  <span>•</span>
                  <span>Verifikasi Bertingkat</span>
                </div>
                <h2 className="text-xl font-bold text-[#0F3040]">
                  Alur Verifikasi Penjaminan Daerah (SKTM &amp; Domisili)
                </h2>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                  Penetapan kewenangan pemeriksaan berkas administratif jaminan bantuan kesehatan daerah untuk masyarakat kurang mampu.
                </p>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EBF2F6] text-[#0F3040] shrink-0">
                <UserCheck className="w-3.5 h-3.5 text-[#2E7D51]" />
                {activeVerifiersCount} Petugas Aktif
              </span>
            </div>

            {/* 3 Langkah Alur Verifikasi */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
              <div className="p-4 rounded-[18px] bg-[#F8FCFA] border border-[#E2E8F0]">
                <div className="flex items-center justify-between mb-2">
                  <span className="w-6 h-6 rounded-full bg-[#0F3040] text-white text-xs font-bold flex items-center justify-center">
                    1
                  </span>
                  <Badge variant="selesai">Tingkat 1</Badge>
                </div>
                <h3 className="text-sm font-bold text-[#0F3040] mb-1">Tingkat Kelurahan</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Pemeriksaan dokumen identitas dasar (KTP, Kartu Keluarga, dan Surat Pengantar Domisili).
                </p>
              </div>

              <div className="p-4 rounded-[18px] bg-[#F8FCFA] border border-[#E2E8F0]">
                <div className="flex items-center justify-between mb-2">
                  <span className="w-6 h-6 rounded-full bg-[#0F3040] text-white text-xs font-bold flex items-center justify-center">
                    2
                  </span>
                  <Badge variant="selesai">Tingkat 2</Badge>
                </div>
                <h3 className="text-sm font-bold text-[#0F3040] mb-1">Tingkat Kecamatan</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Validasi Surat Keterangan Tidak Mampu (SKTM) dan sinkronisasi data kependudukan wilayah.
                </p>
              </div>

              <div className="p-4 rounded-[18px] bg-[#F8FCFA] border border-[#E2E8F0]">
                <div className="flex items-center justify-between mb-2">
                  <span className="w-6 h-6 rounded-full bg-[#0F3040] text-white text-xs font-bold flex items-center justify-center">
                    3
                  </span>
                  <Badge variant="selesai">Tingkat 3</Badge>
                </div>
                <h3 className="text-sm font-bold text-[#0F3040] mb-1">Dinas Sosial</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Pengesahan rekomendasi pembebasan/bantuan biaya pengobatan bagi pasien kategori jaminan daerah.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-[14px] bg-[#E8F5EE] border border-[#2E7D51]/20 flex items-center gap-2.5 text-xs text-[#1C3D2D]">
              <CheckCircle2 className="w-4 h-4 text-[#2E7D51] shrink-0" />
              <span>
                <strong>Prinsip Non-Blocking: </strong>
                Verifikasi administratif penjaminan daerah bersifat asinkron dan tidak pernah menghambat proses terbitnya rujukan medis ke rumah sakit.
              </span>
            </div>
          </div>
        </Reveal>

        {/* SECTION 2: KEBIJAKAN IZIN AKSES REKAM MEDIS (UU PDP) */}
        <Reveal delay={80}>
          <div className="bg-white rounded-[24px] border border-[#E2E8F0] p-6 sm:p-8 shadow-sm mb-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-[#8F5A4E] uppercase tracking-wider mb-1">
                  <span>Regulasi 02</span>
                  <span>•</span>
                  <span>Kepatuhan UU PDP No. 27/2022</span>
                </div>
                <h2 className="text-xl font-bold text-[#0F3040]">
                  Kebijakan Kode Akses Pasien 6-Digit (Zero-Trust)
                </h2>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                  Standar pengamanan akses data medis personal untuk seluruh dokter dan rumah sakit perujuk.
                </p>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E8F5EE] text-[#1C3D2D] shrink-0">
                <KeyRound className="w-3.5 h-3.5 text-[#2E7D51]" />
                Enkripsi Aktif
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
              <div className="p-4 rounded-[16px] border border-[#E2E8F0] bg-white">
                <h4 className="text-xs font-bold text-[#0F3040] mb-1">Masa Berlaku 60 Menit</h4>
                <p className="text-xs text-slate-600">
                  Kode sesi otomatis kedaluwarsa setelah 60 menit sejak dibuat oleh pasien di portal.
                </p>
              </div>

              <div className="p-4 rounded-[16px] border border-[#E2E8F0] bg-white">
                <h4 className="text-xs font-bold text-[#0F3040] mb-1">Batas 5x Percobaan Salah</h4>
                <p className="text-xs text-slate-600">
                  Sistem otomatis mengunci akses jika terjadi 5 kali kesalahan input kode untuk mencegah brute force.
                </p>
              </div>

              <div className="p-4 rounded-[16px] border border-[#E2E8F0] bg-white">
                <h4 className="text-xs font-bold text-[#0F3040] mb-1">Pencabutan Izin Instan</h4>
                <p className="text-xs text-slate-600">
                  Pasien berhak mencabut izin kapan saja; dokter seketika kehilangan hak baca rekam medis.
                </p>
              </div>
            </div>
          </div>
        </Reveal>

        {/* SECTION 3: PENJENJANGAN RUJUKAN & OTORISASI DPJP */}
        <Reveal delay={120}>
          <div className="bg-white rounded-[24px] border border-[#E2E8F0] p-6 sm:p-8 shadow-sm mb-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-[#8F5A4E] uppercase tracking-wider mb-1">
                  <span>Regulasi 03</span>
                  <span>•</span>
                  <span>Sistem Rujukan Berjenjang</span>
                </div>
                <h2 className="text-xl font-bold text-[#0F3040]">
                  Penjenjangan Fasilitas &amp; Validasi DPJP Spesialis
                </h2>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                  Protokol rujukan dari Fasilitas Kesehatan Tingkat Pertama (FKTP) menuju Fasilitas Kesehatan Tingkat Lanjutan (FKTL).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EBF2F6] text-[#0F3040]">
                  <Building className="w-3.5 h-3.5 text-[#0F3040]" />
                  {activeClinicsCount} FKTP Primer
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E8F5EE] text-[#1C3D2D]">
                  <Hospital className="w-3.5 h-3.5 text-[#2E7D51]" />
                  {activeHospitalsCount} RS Rujukan
                </span>
              </div>
            </div>

            <div className="space-y-3 my-4">
              <div className="p-4 rounded-[16px] border border-[#E2E8F0] bg-white flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#EBF2F6] flex items-center justify-center text-[#0F3040] shrink-0 mt-0.5">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#0F3040]">Inisiasi Rujukan oleh Dokter FKTP</h4>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    Hanya dokter aktif di Puskesmas atau Klinik Pratama berizin yang berhak menerbitkan rujukan digital dengan menyertakan diagnosis ICD-10 dan catatan klinis.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-[16px] border border-[#E2E8F0] bg-white flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#E8F5EE] flex items-center justify-center text-[#2E7D51] shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#0F3040]">Validasi Penugasan Dokter DPJP Spesialis</h4>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    Trigger database memblokir penugasan rujukan kepada dokter lintas fasilitas; dokter tujuan wajib berstatus aktif dan terdaftar resmi di RS penerima rujukan.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* CATATAN ARSITEKTUR & KETERBATASAN PARAMETER */}
        <Reveal delay={160}>
          <div className="p-5 rounded-[20px] bg-white border border-[#E2E8F0] shadow-sm flex items-start gap-3 text-xs text-slate-600">
            <Info className="w-5 h-5 text-[#2E7D51] shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="text-[#0F3040]">Keterangan Tata Kelola Regulasi: </strong>
              Seluruh ketentuan di atas ditegakkan secara otomatis melalui guard dan trigger database PostgreSQL Supabase Lytera. Fitur penyesuaian parameter numerik kustom per Perda (seperti batas kuota harian dinamis dan durasi SLA respons per faskes) saat ini dikunci pada nilai standar platform untuk menjamin stabilitas integrasi.
            </div>
          </div>
        </Reveal>
      </main>
    </div>
  );
}
