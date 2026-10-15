"use client";

import React, { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Building,
  UserCheck,
  Plus,
  Clock,
  Loader2,
  FileText,
  MapPin,
  Stethoscope,
  ShieldCheck,
} from "lucide-react";
import { Navbar, NavbarVariant } from "@/components/Navbar";
import { Reveal } from "@/components/Reveal";
import { Card } from "@/components/Card";
import { PasienDashboard } from "@/components/PasienDashboard";
import { VerifikatorDashboard } from "@/components/VerifikatorDashboard";
import {
  isValidRole,
  isValidSubRole,
  getRoleMeta,
  getSubRoleMeta,
  RoleId,
} from "@/lib/roles";
import { createClient } from "@/lib/supabase/client";

interface PageProps {
  params: Promise<{
    peran: string;
    subperan: string;
  }>;
}

interface FacilityData {
  id: string;
  name: string;
  type: string;
  status: string;
  city?: string | null;
  district?: string | null;
  address?: string | null;
}

interface FacilityAccountInfo {
  loading: boolean;
  error?: string | null;
  user: { id: string; email?: string } | null;
  profileName: string;
  isAdmin: boolean;
  isDoctor: boolean;
  isStaff: boolean;
  staffRole?: "dokter" | "petugas" | "apoteker";
  staffStatus?: string;
  profession?: string | null;
  facility: FacilityData | null;
  pendingStaffCount: number;
  activeStaffCount: number;
  referralsCount: number;
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

  // State identitas dan relasi nyata untuk peran fasilitas
  const [faskesAccount, setFaskesAccount] = useState<FacilityAccountInfo>({
    loading: peran === "fasilitas",
    error: null,
    user: null,
    profileName: "",
    isAdmin: false,
    isDoctor: false,
    isStaff: false,
    facility: null,
    pendingStaffCount: 0,
    activeStaffCount: 0,
    referralsCount: 0,
  });

  const loadFacilityAccount = useCallback(async () => {
    if (peran !== "fasilitas") return;

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace(`/masuk/${peran}/${subperan}`);
        return;
      }

      // 1. Profil pengguna
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, role, sub_role, status")
        .eq("id", user.id)
        .maybeSingle();

      const profileName = profile?.full_name || "Pengguna Lytera";

      // 2. Cek apakah pengguna adalah Admin Fasilitas
      const { data: adminFac } = await supabase
        .from("facilities")
        .select("id, name, type, status, city, district, address")
        .eq("admin_id", user.id)
        .maybeSingle();

      // 3. Cek apakah pengguna adalah Staf Fasilitas
      const { data: staffRow } = await supabase
        .from("facility_staff")
        .select(
          "id, staff_role, profession, specialization, status, facility_id, facilities(id, name, type, status, city, district, address)"
        )
        .eq("profile_id", user.id)
        .maybeSingle();

      let isAdmin = false;
      let isStaff = false;
      let isDoctor = false;
      let staffRole: "dokter" | "petugas" | "apoteker" | undefined = undefined;
      let staffStatus: string | undefined = undefined;
      let profession: string | null = null;
      let facility: FacilityData | null = null;

      if (adminFac) {
        isAdmin = true;
        facility = adminFac as FacilityData;
      }

      if (staffRow) {
        isStaff = true;
        staffRole = staffRow.staff_role;
        staffStatus = staffRow.status;
        profession = staffRow.profession;
        if (staffRow.staff_role === "dokter" && staffRow.status === "aktif") {
          isDoctor = true;
        }
        if (!facility && staffRow.facilities) {
          facility = staffRow.facilities as unknown as FacilityData;
        }
      }

      // 4. Statistik staf jika admin
      let pendingStaffCount = 0;
      let activeStaffCount = 0;
      if (facility) {
        const { count: pendingCount } = await supabase
          .from("facility_staff")
          .select("id", { count: "exact", head: true })
          .eq("facility_id", facility.id)
          .eq("status", "menunggu");
        pendingStaffCount = pendingCount || 0;

        const { count: activeCount } = await supabase
          .from("facility_staff")
          .select("id", { count: "exact", head: true })
          .eq("facility_id", facility.id)
          .eq("status", "aktif");
        activeStaffCount = activeCount || 0;
      }

      // 5. Statistik rujukan
      let referralsCount = 0;
      try {
        const isHospital =
          facility?.type === "rumah_sakit" || subperan === "rumah-sakit";
        const { data: refs } = await supabase.rpc("list_facility_referrals", {
          p_direction: isHospital ? "masuk" : "keluar",
        });
        if (Array.isArray(refs)) {
          referralsCount = refs.length;
        }
      } catch {
        referralsCount = 0;
      }

      setFaskesAccount({
        loading: false,
        error: null,
        user: { id: user.id, email: user.email },
        profileName,
        isAdmin,
        isDoctor,
        isStaff,
        staffRole,
        staffStatus,
        profession,
        facility,
        pendingStaffCount,
        activeStaffCount,
        referralsCount,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFaskesAccount((prev) => ({
        ...prev,
        loading: false,
        error: "Gagal memuat sesi akun fasilitas: " + msg,
      }));
    }
  }, [peran, subperan, router]);

  useEffect(() => {
    let ignore = false;
    if (peran === "fasilitas" && valid) {
      Promise.resolve().then(() => {
        if (!ignore) {
          loadFacilityAccount();
        }
      });
    }
    return () => {
      ignore = true;
    };
  }, [peran, valid, loadFacilityAccount]);

  if (!valid || !roleMeta || !subRoleMeta) {
    return (
      <div
        className="min-h-screen text-[#464858] flex items-center justify-center p-4"
        data-portal-wallpaper="true"
      >
        <p className="text-sm text-[#464858]">Memuat portal...</p>
      </div>
    );
  }

  // Jika peran adalah pasien, tampilkan Dashboard Pasien Asli terhubung ke Supabase
  if (peran === "pasien") {
    return <PasienDashboard subperan={subperan} />;
  }

  // Jika peran adalah verifikator, tampilkan Dashboard Verifikator Administrasi Asli
  if (peran === "verifikator") {
    return <VerifikatorDashboard subperan={subperan} />;
  }

  // ---- RENDER PORTAL FASILITAS NYATA (TERHUBUNG KE SUPABASE) ----
  if (faskesAccount.loading) {
    return (
      <div
        className="min-h-screen text-[#464858] flex items-center justify-center p-4"
        data-portal-wallpaper="true"
      >
        <div className="bg-white p-8 rounded-[24px] border border-[#E2E8F0] shadow-sm text-center max-w-sm w-full">
          <Loader2 className="w-8 h-8 text-[#8F5A4E] animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#0F3040]">
            Memverifikasi otorisasi akun fasilitas...
          </p>
        </div>
      </div>
    );
  }

  const {
    facility,
    isAdmin,
    isDoctor,
    isStaff,
    staffRole,
    staffStatus,
    profileName,
    pendingStaffCount,
    activeStaffCount,
    referralsCount,
  } = faskesAccount;

  const isHospital =
    facility?.type === "rumah_sakit" || subperan === "rumah-sakit";

  // Tentukan varian dan menu Navbar berdasarkan peran riil
  let navVariant: NavbarVariant = "admin-faskes";
  let userRoleLabel = isHospital ? "Admin Rumah Sakit" : "Admin Fasilitas";

  if (isAdmin) {
    navVariant = "admin-faskes";
    userRoleLabel = isHospital ? "Admin Rumah Sakit" : "Admin Fasilitas";
  } else if (isDoctor) {
    navVariant = isHospital ? "rumah-sakit" : "dokter-puskesmas";
    userRoleLabel = faskesAccount.profession || "Dokter";
  } else if (staffRole === "apoteker") {
    navVariant = "apoteker";
    userRoleLabel = "Apoteker";
  } else if (isStaff) {
    navVariant = isHospital ? "rumah-sakit" : "dokter-puskesmas";
    userRoleLabel = "Petugas Administrasi";
  }

  const customNavItems = isAdmin
    ? [
        { label: "Ringkasan", href: `/portal/${peran}/${subperan}` },
        { label: "Dokter & Petugas", href: `/portal/${peran}/${subperan}/staf` },
        {
          label: "Daftar Rujukan",
          href: `/portal/${peran}/${subperan}/rujukan`,
        },
      ]
    : isHospital
    ? [
        { label: "Beranda", href: `/portal/${peran}/${subperan}` },
        {
          label: "Rujukan Masuk",
          href: `/portal/${peran}/${subperan}/rujukan`,
        },
        {
          label: "Jadwal Saya",
          href: `/portal/${peran}/${subperan}/rujukan?tab=jadwal_saya`,
        },
      ]
    : [
        { label: "Beranda", href: `/portal/${peran}/${subperan}` },
        ...(isDoctor
          ? [
              {
                label: "Buat Rujukan",
                href: `/portal/${peran}/${subperan}/rujukan/baru`,
              },
            ]
          : []),
        {
          label: "Riwayat Rujukan",
          href: `/portal/${peran}/${subperan}/rujukan`,
        },
      ];

  // Kasus: Pengguna belum terikat ke fasilitas kesehatan
  if (!facility && !isAdmin && !isStaff) {
    return (
      <div
        className="min-h-screen text-[#464858]"
        data-navbar-tone="light"
        data-portal-wallpaper="true"
      >
        <Navbar
          variant="landing"
          userName={profileName}
          userRole="Pengguna Terdaftar"
          forceGlass={true}
        />
        <main className="max-w-xl mx-auto px-4 sm:px-6 pt-32 pb-16 text-center">
          <Card variant="white" className="p-8 sm:p-10 shadow-sm border border-[#E2E8F0]">
            <div className="w-12 h-12 rounded-full bg-[#FFF4D6] flex items-center justify-center text-[#7A5200] mx-auto mb-4">
              <Clock className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-[#0F3040] mb-2">
              Akun Belum Terhubung Fasilitas
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Akun Anda telah terdaftar namun belum terhubung sebagai Administrator
              atau Tenaga Medis aktif pada fasilitas kesehatan mana pun di sistem Lytera.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/daftar/fasilitas"
                className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-[#0F3040] text-white text-xs sm:text-sm font-semibold hover:bg-[#0A2230] transition-colors"
              >
                Daftarkan Fasilitas Kesehatan Baru
              </Link>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  // Kasus: Status fasilitas atau staf belum aktif
  const isFacilityPending = facility && facility.status !== "aktif";
  const isStaffPending = isStaff && !isAdmin && staffStatus !== "aktif";

  return (
    <div
      className="min-h-screen text-[#464858]"
      data-navbar-tone="light"
      data-portal-wallpaper="true"
    >
      {/* Top Navbar dengan identitas akun nyata */}
      <Navbar
        variant={navVariant}
        facilityName={facility?.name || "Fasilitas Kesehatan"}
        userName={profileName || (isAdmin ? "Admin Fasilitas" : "Pengguna")}
        userRole={facility?.name || userRoleLabel}
        forceGlass={true}
        customMenuItems={customNavItems}
        activeItem={isAdmin ? "Ringkasan" : "Beranda"}
      />

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        {/* Peringatan Status Fasilitas Belum Aktif (Jika Ada) */}
        {isFacilityPending && (
          <Reveal>
            <div className="mb-6 p-4 rounded-[18px] bg-[#FFF4D6] border border-[#7A5200]/25 flex items-start sm:items-center gap-3">
              <Clock className="w-5 h-5 text-[#7A5200] shrink-0 mt-0.5 sm:mt-0" />
              <div className="text-xs sm:text-sm text-[#7A5200]">
                <strong>Fasilitas Menunggu Verifikasi Dinkes: </strong>
                Fasilitas kesehatan <strong>{facility?.name}</strong> berstatus{" "}
                <strong>&apos;{facility?.status}&apos;</strong>. Akses pelayanan rujukan digital akan
                aktif otomatis setelah Dinas Kesehatan menyetujui izin operasional.
              </div>
            </div>
          </Reveal>
        )}

        {/* Peringatan Status Staf Belum Aktif (Jika Ada) */}
        {isStaffPending && (
          <Reveal>
            <div className="mb-6 p-4 rounded-[18px] bg-[#FFF4D6] border border-[#7A5200]/25 flex items-start sm:items-center gap-3">
              <Clock className="w-5 h-5 text-[#7A5200] shrink-0 mt-0.5 sm:mt-0" />
              <div className="text-xs sm:text-sm text-[#7A5200]">
                <strong>Penugasan Menunggu Persetujuan: </strong>
                Permohonan kepegawaian Anda di <strong>{facility?.name}</strong> saat ini
                berstatus <strong>&apos;{staffStatus}&apos;</strong>. Menunggu verifikasi nomor STR/SIP
                oleh Administrator Fasilitas Kesehatan Anda.
              </div>
            </div>
          </Reveal>
        )}

        {/* Welcome Header */}
        <Reveal delayMs={100}>
          <div className="bg-white rounded-[24px] border border-[#E2E8F0] p-6 sm:p-8 shadow-sm mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-[#8F5A4E] uppercase tracking-wider">
                  {isAdmin
                    ? "Portal Administrator Fasilitas"
                    : isDoctor
                    ? "Portal Pelayanan Dokter"
                    : "Portal Administrasi Staf"}{" "}
                  &bull; {facility?.city || "Kota Semarang"}
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#0F3040] mt-1">
                  {facility?.name || "Fasilitas Kesehatan"}
                </h1>
                <p className="text-sm text-[#464858]/80 mt-1 max-w-2xl">
                  {isAdmin
                    ? "Kelola verifikasi nomor STR/SIP tenaga kesehatan, pantau alur berkas rujukan masuk/keluar, dan profil fasilitas."
                    : isDoctor
                    ? "Kelola permohonan rujukan pasien, jadwal konsultasi spesialis, dan periksa rekam medis interoperabel dengan izin token pasien."
                    : "Kelola administrasi berkas rujukan faskes secara terpadu."}
                </p>
              </div>

              {/* Action Buttons sesuai Hak Akses */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Admin Fasilitas: Tombol Kelola Dokter & Petugas */}
                {isAdmin && (
                  <Link
                    href={`/portal/${peran}/${subperan}/staf`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold bg-[#0F3040] text-white hover:bg-[#0A2230] transition-colors shadow-2xs"
                  >
                    <UserCheck className="w-4 h-4 text-[#EDF7F2]" />
                    <span>Kelola Dokter & Petugas</span>
                  </Link>
                )}

                {/* Dokter Faskes Primer: Tombol Buat Rujukan Baru */}
                {isDoctor && !isHospital && (
                  <Link
                    href={`/portal/${peran}/${subperan}/rujukan/baru`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold bg-[#8F5A4E] text-white hover:bg-[#A56F63] transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Buat Rujukan Baru</span>
                  </Link>
                )}

                {/* Dokter / Staf Rumah Sakit: Tombol Rujukan Masuk */}
                {isHospital && (
                  <Link
                    href={`/portal/${peran}/${subperan}/rujukan`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold bg-[#0F3040] text-white hover:bg-[#0A2230] transition-colors shadow-sm"
                  >
                    <Building className="w-4 h-4" />
                    <span>Kelola Rujukan Masuk</span>
                  </Link>
                )}

                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#EDF7F2] text-[#1B6B4D]">
                  <span className="w-2 h-2 rounded-full bg-[#1B6B4D] animate-pulse" />
                  {facility?.status === "aktif" ? "Fasilitas Aktif" : "Menunggu Verifikasi"}
                </span>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Role Specific Grid Cards */}
        <Reveal delayMs={200}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* KARTU 1: Rujukan Fasilitas */}
            <div className="bg-white p-6 rounded-[24px] border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-[#EBF2F6] flex items-center justify-center text-[#0F3040] mb-4">
                  <Building className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-[#0F3040]">
                  {isHospital ? "Rujukan Masuk Rumah Sakit" : "Rujukan Pasien Keluar"}
                </h2>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  {isHospital
                    ? "Kelola berkas rujukan dari faskes primer, tetapkan jadwal dokter spesialis, dan perbarui tindakan."
                    : "Pantau antrean surat rujukan berjenjang yang diterbitkan menuju rumah sakit sekunder."}
                </p>
                <div className="text-2xl font-bold text-[#0F3040] tabular-nums mb-3">
                  {referralsCount}{" "}
                  <span className="text-xs font-normal text-slate-500">berkas rujukan tercatat</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                {isDoctor && !isHospital && (
                  <Link
                    href={`/portal/${peran}/${subperan}/rujukan/baru`}
                    className="w-full py-2.5 px-4 rounded-[12px] bg-[#8F5A4E] text-white text-xs font-semibold hover:bg-[#A56F63] transition-colors text-center inline-flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Buat Rujukan Baru</span>
                  </Link>
                )}
                <Link
                  href={`/portal/${peran}/${subperan}/rujukan`}
                  className="w-full py-2 px-4 rounded-[12px] border border-[#E2E8F0] text-[#0F3040] text-xs font-semibold hover:bg-slate-50 transition-colors text-center"
                >
                  {isHospital ? "Buka Rujukan Masuk &rarr;" : "Lihat Daftar Rujukan &rarr;"}
                </Link>
              </div>
            </div>

            {/* KARTU 2: Admin -> Kelola Staf || Dokter -> Rekam Medis Interoperabel */}
            {isAdmin ? (
              <div className="bg-white p-6 rounded-[24px] border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-[#FFF4D6] flex items-center justify-center text-[#7A5200] mb-4">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <h2 className="text-base font-bold text-[#0F3040]">Manajemen Dokter & Petugas</h2>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    Verifikasi nomor STR/SIP dokter, petugas faskes, dan penugasan spesialis klinis.
                  </p>
                  <div className="space-y-1.5 mb-3">
                    <div className="text-sm font-semibold text-[#7A5200] flex items-center gap-2">
                      <Clock className="w-4 h-4 shrink-0" />
                      <span>{pendingStaffCount} permohonan menunggu persetujuan</span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#1B6B4D] shrink-0" />
                      <span>{activeStaffCount} staf berstatus aktif</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href={`/portal/${peran}/${subperan}/staf`}
                    className="w-full py-2.5 px-4 rounded-[12px] bg-[#0F3040] text-white text-xs font-semibold hover:bg-[#0A2230] transition-colors text-center inline-flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Buka Manajemen Staf &rarr;</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-white p-6 rounded-[24px] border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-[#EDF7F2] flex items-center justify-center text-[#1B6B4D] mb-4">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <h2 className="text-base font-bold text-[#0F3040]">Rekam Medis Interoperabel</h2>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    Pemeriksaan riwayat medis terpadu dapat dibuka langsung dari detail surat rujukan pasien menggunakan token izin 6-digit pasien.
                  </p>
                  <div className="p-3 rounded-xl bg-[#FAF5F2] border border-[#E2E8F0] text-xs text-slate-600">
                    <span className="font-semibold text-[#0F3040] block mb-1">
                      Privasi Berbasis Persetujuan:
                    </span>
                    Hanya dokter aktif yang bertugas yang dapat membuka diagnosis dan riwayat alergi pasien.
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href={`/portal/${peran}/${subperan}/rujukan`}
                    className="w-full py-2.5 px-4 rounded-[12px] bg-[#0F3040] text-white text-xs font-semibold hover:bg-[#0A2230] transition-colors text-center inline-flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Buka via Detail Rujukan &rarr;</span>
                  </Link>
                </div>
              </div>
            )}

            {/* KARTU 3: Profil & Integritas Wilayah Fasilitas */}
            <div className="bg-white p-6 rounded-[24px] border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-[#EDF7F2] flex items-center justify-center text-[#1B6B4D] mb-4">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-[#0F3040]">Integritas & Wilayah Faskes</h2>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Fasilitas resmi terdaftar di bawah pengawasan Dinas Kesehatan.
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#F0F4F8]">
                    <span className="text-slate-400">Jenis Faskes</span>
                    <span className="font-semibold text-[#0F3040] capitalize">
                      {facility?.type?.replace("_", " ") || subperan}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#F0F4F8]">
                    <span className="text-slate-400">Wilayah</span>
                    <span className="font-semibold text-[#0F3040]">
                      {facility?.city || "Kota Semarang"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Status Akreditasi</span>
                    <span className="font-semibold text-[#1B6B4D]">
                      {facility?.status === "aktif" ? "Terverifikasi" : "Dalam Peninjauan"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 text-xs text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{facility?.address || "Alamat terverifikasi"}</span>
              </div>
            </div>
          </div>
        </Reveal>
      </main>
    </div>
  );
}
