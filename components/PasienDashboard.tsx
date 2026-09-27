"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Users,
  FileText,
  ShieldCheck,
  Sparkles,
  MapPin,
  AlertTriangle,
  RotateCw,
  Clock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardInner } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { StatusIcon } from "@/components/StatusIcon";
import { LogoutButton } from "@/components/LogoutButton";
import { Navbar } from "@/components/Navbar";
import { Reveal } from "@/components/Reveal";

// ──────────────────────────────────────────────────────────────────────────────
// Tipe Data Domain Supabase
// ──────────────────────────────────────────────────────────────────────────────

export interface ProfileData {
  id: string;
  role: string;
  sub_role: string;
  full_name: string;
  email: string;
  status: "menunggu" | "aktif" | "ditolak" | string;
  created_at?: string;
}

export interface PatientData {
  id: string;
  patient_type: "pribadi" | "keluarga" | string;
  nik: string;
  dob: string | null;
  gender: string | null;
  phone: string | null;
  province: string | null;
  city: string | null;
  district: string | null;
  village: string | null;
  address: string | null;
  bpjs_number: string | null;
  blood_type: string | null;
  allergies: string | null;
  created_at?: string;
}

export interface FamilyMemberData {
  id: string;
  guardian_id: string;
  full_name: string;
  nik: string;
  dob: string | null;
  relation: string;
  bpjs_number: string | null;
  allergies: string | null;
  created_at?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Fungsi Pembantu Tampilan (Format Tanggal & Masking NIK)
// ──────────────────────────────────────────────────────────────────────────────

const BULAN_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function formatDateIndo(dateStr?: string | null): string {
  if (!dateStr) return "-";
  // Tangani format ISO YYYY-MM-DD
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d) && m >= 1 && m <= 12) {
      return `${d} ${BULAN_NAMES[m - 1]} ${y}`;
    }
  }
  return dateStr;
}

function maskNik(nik?: string | null): string {
  if (!nik) return "-";
  const clean = nik.trim();
  if (clean.length < 8) return clean;
  const start = clean.slice(0, 4);
  const end = clean.slice(-4);
  return `${start} •••• •••• ${end}`;
}

function getRegionDisplay(
  province?: string | null,
  city?: string | null,
  district?: string | null,
  village?: string | null
): string {
  const parts = [village, district, city, province].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "-";
}

function formatRelation(relation?: string | null): string {
  if (!relation) return "Anggota Keluarga";
  const r = relation.toLowerCase().trim();
  if (r === "anak") return "Anak";
  if (r === "pasangan" || r === "istri" || r === "suami") return "Pasangan";
  if (r === "orang_tua" || r === "orang tua") return "Orang Tua";
  return "Keluarga";
}

// ──────────────────────────────────────────────────────────────────────────────
// Komponen Utama PasienDashboard
// ──────────────────────────────────────────────────────────────────────────────

interface PasienDashboardProps {
  subperan: string;
}

export const PasienDashboard: React.FC<PasienDashboardProps> = ({ subperan }) => {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberData[]>([]);

  const handleRefetch = () => {
    setLoading(true);
    setErrorMsg(null);
    setReloadCount((c) => c + 1);
  };

  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      try {
        const supabase = createClient();

        // 1. Dapatkan sesi pengguna aktif
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (isCancelled) return;

        if (userError || !user) {
          router.replace("/");
          return;
        }

        // 2. Ambil profil dari tabel 'profiles'
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (isCancelled) return;

        if (profileError) {
          setErrorMsg("Gagal memuat profil akun: " + profileError.message);
          setLoading(false);
          return;
        }

        if (!profileData) {
          setErrorMsg("Profil pengguna tidak ditemukan.");
          setLoading(false);
          return;
        }

        setProfile(profileData as ProfileData);

        // 3. Jika status BUKAN 'aktif', jangan lanjut baca data dashboard
        if (profileData.status !== "aktif") {
          setLoading(false);
          return;
        }

        // 4. Ambil data pasien dari tabel 'patients'
        const { data: patientData, error: patientError } = await supabase
          .from("patients")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (isCancelled) return;

        if (patientError) {
          console.error("Gagal membaca tabel patients:", patientError.message);
        } else if (patientData) {
          setPatient(patientData as PatientData);
        }

        // 5. Jika sub-peran keluarga, ambil daftar anggota dari 'family_members'
        const isKeluarga =
          subperan === "keluarga" ||
          profileData.sub_role === "keluarga" ||
          patientData?.patient_type === "keluarga";

        if (isKeluarga) {
          const { data: membersData, error: membersError } = await supabase
            .from("family_members")
            .select("*")
            .eq("guardian_id", user.id)
            .order("created_at", { ascending: true });

          if (isCancelled) return;

          if (membersError) {
            console.error("Gagal membaca family_members:", membersError.message);
          } else if (membersData) {
            setFamilyMembers(membersData as FamilyMemberData[]);
          }
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setErrorMsg("Terjadi kendala saat memuat data: " + msg);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [router, subperan, reloadCount]);

  // ── 1. LOADING STATE ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#464858]" data-navbar-tone="light">
        <Navbar
          variant="pasien"
          userName="Memuat..."
          userRole={subperan === "keluarga" ? "Pasien Keluarga" : "Pasien Pribadi"}
        />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-16">
          <Card variant="white" className="p-10 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-[#EBF2F6] flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Clock className="w-6 h-6 text-[#8F5A4E]" />
            </div>
            <h2 className="text-lg font-bold text-[#0F3040]">Memuat Dashboard Pasien...</h2>
            <p className="text-sm text-slate-500 mt-1">
              Menghubungkan ke basis data rekam medis terpadu Lytera.
            </p>
          </Card>
        </main>
      </div>
    );
  }

  // ── 2. ERROR STATE ──
  if (errorMsg) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#464858]" data-navbar-tone="light">
        <Navbar
          variant="pasien"
          userName="Pasien"
          userRole={subperan === "keluarga" ? "Pasien Keluarga" : "Pasien Pribadi"}
        />
        <main className="max-w-xl mx-auto px-4 sm:px-6 pt-28 pb-16">
          <Card variant="white" className="p-8 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-[#FDECEA] flex items-center justify-center mx-auto mb-4 text-[#B3261E]">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-[#0F3040]">Gagal Memuat Informasi</h2>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">{errorMsg}</p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
              <button
                type="button"
                onClick={handleRefetch}
                className="px-5 py-2.5 rounded-full bg-[#0F3040] text-white text-sm font-semibold hover:bg-[#0A2230] transition-colors inline-flex items-center gap-2"
              >
                <RotateCw className="w-4 h-4" />
                <span>Coba Lagi</span>
              </button>
              <LogoutButton className="px-5 py-2.5 rounded-full border border-[#E2E8F0] bg-white text-sm font-semibold text-[#0F3040] hover:bg-[#FDECEA] hover:text-[#B3261E] transition-colors" />
            </div>
          </Card>
        </main>
      </div>
    );
  }

  // ── 3. STATUS BUKAN 'aktif': TAMPILKAN "Akun kamu sedang ditinjau" ──
  if (!profile || profile.status !== "aktif") {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#464858]" data-navbar-tone="light">
        <Navbar
          variant="pasien"
          userName={profile?.full_name || "Pasien"}
          userRole={subperan === "keluarga" ? "Pasien Keluarga" : "Pasien Pribadi"}
        />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-28 pb-16">
          <Reveal>
            <Card variant="white" className="p-8 sm:p-10 shadow-sm border border-[#E2E8F0] text-center">
              <div className="flex justify-center mb-4">
                <StatusIcon status="proses" size="xl" />
              </div>

              <div className="flex justify-center mb-3">
                <Badge variant="proses" showDot>
                  Status Akun: Menunggu Verifikasi
                </Badge>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F3040] tracking-tight">
                Akun kamu sedang ditinjau
              </h1>

              <p className="text-sm text-slate-600 mt-3 leading-relaxed max-w-lg mx-auto">
                Halo, <span className="font-semibold text-[#0F3040]">{profile?.full_name}</span>.
                Pendaftaran akunmu telah tersimpan dan sedang dalam proses verifikasi oleh verifikator
                kesehatan wilayah demi menjaga keamanan data medis.
              </p>

              {/* Rincian Pendaftaran */}
              <div className="mt-6 text-left">
                <CardInner variant="cream" className="p-4 sm:p-5 space-y-2.5 border border-[#E2E8F0]">
                  <div className="flex items-center justify-between text-xs sm:text-sm border-b border-[#E2E8F0]/60 pb-2">
                    <span className="text-slate-500">Nama Terdaftar</span>
                    <span className="font-semibold text-[#0F3040]">{profile?.full_name}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm border-b border-[#E2E8F0]/60 pb-2">
                    <span className="text-slate-500">Alamat Email</span>
                    <span className="font-semibold text-[#0F3040]">{profile?.email}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm border-b border-[#E2E8F0]/60 pb-2">
                    <span className="text-slate-500">Kategori Akun</span>
                    <span className="font-semibold text-[#0F3040]">
                      {subperan === "keluarga" ? "Pasien Keluarga" : "Pasien Pribadi"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-slate-500">Tanggal Pengajuan</span>
                    <span className="font-semibold text-[#0F3040]">
                      {formatDateIndo(profile?.created_at)}
                    </span>
                  </div>
                </CardInner>
              </div>

              <p className="text-xs text-slate-500 mt-4 leading-relaxed">
                Setelah status dinyatakan aktif, kamu dapat langsung mengakses riwayat rekam medis,
                menerbitkan token akses faskes, serta memantau antrean rujukan.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3 mt-7 pt-4 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={handleRefetch}
                  className="px-5 py-2.5 rounded-full bg-[#0F3040] text-white text-xs sm:text-sm font-semibold hover:bg-[#0A2230] transition-colors inline-flex items-center gap-2"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Segarkan Status</span>
                </button>

                <LogoutButton className="px-5 py-2.5 rounded-full border border-[#E2E8F0] bg-white text-xs sm:text-sm font-semibold text-[#0F3040] hover:bg-[#FDECEA] hover:text-[#B3261E] hover:border-[#B3261E]/30 transition-colors shadow-2xs inline-flex items-center gap-2" />
              </div>
            </Card>
          </Reveal>
        </main>
      </div>
    );
  }

  // ── 4. STATUS 'aktif': DASHBOARD PASIEN ASLI ──
  const isKeluarga = subperan === "keluarga" || profile.sub_role === "keluarga";

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#464858]" data-navbar-tone="light">
      {/* Top Navbar */}
      <Navbar
        variant="pasien"
        userName={profile.full_name}
        userRole={isKeluarga ? "Pasien Keluarga" : "Pasien Pribadi"}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        {/* ── KARTU SAPAAN ── */}
        <Reveal>
          <Card variant="white" className="p-6 sm:p-8 shadow-sm mb-8 border border-[#E2E8F0]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge variant="selesai" showDot>
                    Pasien Terverifikasi
                  </Badge>
                  <Badge variant="info">
                    {isKeluarga ? "Kategori: Pasien Keluarga" : "Kategori: Pasien Pribadi"}
                  </Badge>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F3040] tracking-tight">
                  Halo, {profile.full_name}
                </h1>
                <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                  Selamat datang di Portal Pasien Lytera. Rekam medismu aman, terenkripsi, dan
                  seluruh akses rujukan berada di bawah kendalimu.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <LogoutButton className="px-4 py-2 rounded-full border border-[#E2E8F0] bg-white text-xs sm:text-sm font-semibold text-[#0F3040] hover:bg-[#FDECEA] hover:text-[#B3261E] hover:border-[#B3261E]/30 transition-colors shadow-2xs inline-flex items-center gap-1.5" />
              </div>
            </div>
          </Card>
        </Reveal>

        {/* ── KARTU RINGKASAN IDENTITAS ── */}
        <Reveal delayMs={100}>
          <Card variant="white" className="p-6 sm:p-8 shadow-sm mb-8 border border-[#E2E8F0]">
            <div className="flex items-center gap-3 pb-4 mb-6 border-b border-[#E2E8F0]">
              <div className="w-10 h-10 rounded-2xl bg-[#FAF5F2] flex items-center justify-center text-[#8F5A4E] shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#0F3040]">Ringkasan Identitas Pasien</h2>
                <p className="text-xs text-slate-500">
                  Data resmi kependudukan yang terhubung ke jaringan rujukan digital.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* NIK */}
              <div className="p-3.5 rounded-[16px] bg-[#FAF5F2] border border-[#E2E8F0]">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Nomor Induk Kependudukan (NIK)
                </span>
                <span className="text-sm sm:text-base font-bold text-[#0F3040] font-mono tabular-nums block">
                  {maskNik(patient?.nik)}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Dimasker demi privasi data medis
                </span>
              </div>

              {/* Tanggal Lahir */}
              <div className="p-3.5 rounded-[16px] bg-slate-50 border border-[#E2E8F0]">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Tanggal Lahir
                </span>
                <span className="text-sm sm:text-base font-semibold text-[#0F3040] block">
                  {formatDateIndo(patient?.dob)}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {patient?.gender === "L"
                    ? "Laki-laki"
                    : patient?.gender === "P"
                    ? "Perempuan"
                    : "Jenis kelamin belum dicatat"}
                </span>
              </div>

              {/* Kontak */}
              <div className="p-3.5 rounded-[16px] bg-slate-50 border border-[#E2E8F0]">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Kontak / WhatsApp
                </span>
                <span className="text-sm sm:text-base font-semibold text-[#0F3040] tabular-nums block">
                  {patient?.phone || profile.email}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block truncate">
                  {profile.email}
                </span>
              </div>

              {/* Nomor BPJS */}
              <div className="p-3.5 rounded-[16px] bg-slate-50 border border-[#E2E8F0]">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Nomor Kartu BPJS
                </span>
                <span className="text-sm sm:text-base font-semibold text-[#0F3040] tabular-nums block">
                  {patient?.bpjs_number || "Belum Terdaftar"}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Jaminan Kesehatan Nasional
                </span>
              </div>
            </div>

            {/* Baris Alamat & Wilayah */}
            <div className="mt-4 pt-4 border-t border-[#E2E8F0]/70 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#8F5A4E] shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm">
                  <span className="text-slate-500 block">Alamat Domisili</span>
                  <span className="font-semibold text-[#0F3040]">
                    {patient?.address || "Belum melengkapi detail alamat"}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-[#1B6B4D] shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm">
                  <span className="text-slate-500 block">Wilayah Administratif</span>
                  <span className="font-semibold text-[#0F3040]">
                    {getRegionDisplay(
                      patient?.province,
                      patient?.city,
                      patient?.district,
                      patient?.village
                    )}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </Reveal>

        {/* ── DAFTAR ANGGOTA KELUARGA (KHUSUS SUB-PERAN KELUARGA) ── */}
        {isKeluarga && (
          <Reveal delayMs={150}>
            <Card variant="white" className="p-6 sm:p-8 shadow-sm mb-8 border border-[#E2E8F0]">
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#EBF2F6] flex items-center justify-center text-[#0F3040] shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#0F3040]">
                      Daftar Anggota Keluarga ({familyMembers.length})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Anggota keluarga di bawah perwalian yang dapat menerima rujukan digital.
                    </p>
                  </div>
                </div>

                <Badge variant="info">Perwalian Aktif</Badge>
              </div>

              {familyMembers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {familyMembers.map((member, idx) => (
                    <CardInner
                      key={member.id || idx}
                      variant="cream"
                      className="p-4 rounded-[18px] border border-[#E2E8F0] space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-sm font-bold text-[#0F3040] block">
                            {member.full_name}
                          </span>
                          <span className="text-xs text-[#8F5A4E] font-medium">
                            {formatRelation(member.relation)}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-500 tabular-nums bg-white px-2 py-0.5 rounded-full border border-[#E2E8F0]">
                          NIK: {maskNik(member.nik)}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 pt-1 border-t border-[#E2E8F0]/60 flex items-center justify-between">
                        <span>Tanggal Lahir:</span>
                        <span className="font-semibold text-[#0F3040]">
                          {formatDateIndo(member.dob)}
                        </span>
                      </div>
                    </CardInner>
                  ))}
                </div>
              ) : (
                <CardInner variant="cream" className="p-8 text-center border border-[#E2E8F0]">
                  <p className="text-sm font-semibold text-[#0F3040]">
                    Belum ada anggota keluarga yang terdaftar
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Anggota keluarga yang didaftarkan saat registrasi akan tampil di sini.
                  </p>
                </CardInner>
              )}
            </Card>
          </Reveal>
        )}

        {/* ── STATUS KOSONG JUJUR: TOKEN DI ATAS (RINGKAS), RUJUKAN DI BAWAH (UTAMA) ── */}
        <Reveal delayMs={200}>
          <div className="flex flex-col gap-6">
            {/* 1. KARTU TOKEN AKSES MEDIS (DI ATAS - LEBIH RINGKAS & PENDEK) */}
            <Card
              variant="white"
              className="p-5 sm:p-6 rounded-[22px] border border-[#E2E8F0] shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#EDF7F2] flex items-center justify-center text-[#1B6B4D] shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-[#0F3040]">Token Akses Medis</h2>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        Belum ada token aktif
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Kendali otorisasi 6-digit untuk membuka catatan rekam medis saat berkunjung ke faskes rujukan.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400 shrink-0 sm:border-l sm:border-[#E2E8F0] sm:pl-4">
                  <span>Perlindungan UU PDP</span>
                  <span className="font-semibold text-[#1B6B4D]">● Terenkripsi</span>
                </div>
              </div>
            </Card>

            {/* 2. KARTU RUJUKAN AKTIF (DI BAWAH - LEBIH TINGGI & MENONJOL SEBAGAI UTAMA) */}
            <Card
              variant="white"
              className="p-6 sm:p-8 rounded-[24px] border border-[#E2E8F0] shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-[#FAF5F2] flex items-center justify-center text-[#8F5A4E] shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#0F3040]">Rujukan Aktif</h2>
                    <p className="text-xs text-slate-500">
                      Surat rujukan klinis dan antrean ke rumah sakit lanjutan.
                    </p>
                  </div>
                </div>

                {/* Status Kosong yang Jujur */}
                <CardInner
                  variant="cream"
                  className="p-6 sm:p-8 rounded-[20px] border border-[#E2E8F0] text-center my-3"
                >
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mx-auto mb-2.5 text-slate-400 border border-[#E2E8F0]">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-[#0F3040]">Belum ada rujukan aktif</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-md mx-auto">
                    Saat ini kamu tidak memiliki surat rujukan aktif. Surat rujukan digital akan
                    otomatis tampil di sini setelah diterbitkan oleh dokter di faskes tingkat pertama
                    (Puskesmas atau Klinik).
                  </p>
                </CardInner>
              </div>

              <div className="pt-3.5 border-t border-[#E2E8F0]/70 flex items-center justify-between text-xs text-slate-400 mt-2">
                <span>Interkoneksi Sistem: Realtime</span>
                <span className="font-semibold text-[#1B6B4D]">● Siap Menerima</span>
              </div>
            </Card>
          </div>
        </Reveal>
      </main>
    </div>
  );
};
