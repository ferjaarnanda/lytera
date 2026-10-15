"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Landmark,
  Hospital,
  Building,
  Clock,
  AlertTriangle,
  RotateCw,
  Search,
  MapPin,
  UserCheck,
  ShieldCheck,
  Filter,
  Users,
  Stethoscope,
  Pill,
  ExternalLink,
  Info,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { Navbar } from "@/components/Navbar";
import { Reveal } from "@/components/Reveal";
import { LogoutButton } from "@/components/LogoutButton";
import { formatFacilityLocation } from "@/lib/region-utils";

interface FacilityMonitoringItem {
  id: string;
  name: string;
  type: string;
  license_number: string;
  address: string;
  city: string;
  district: string;
  status: string;
  created_at: string;
  staffCount?: number;
  doctorCount?: number;
  specialistCount?: number;
}

interface CurrentUserProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
}

function formatFacilityType(type?: string): string {
  switch (type?.toLowerCase().trim()) {
    case "puskesmas":
      return "Puskesmas Primer";
    case "klinik":
      return "Klinik Pratama";
    case "rumah_sakit":
    case "rumah-sakit":
      return "Rumah Sakit Rujukan";
    case "apotek":
      return "Apotek";
    default:
      return type ? type.replace(/_/g, " ") : "Fasilitas Kesehatan";
  }
}

export default function DinkesPemantauanPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const [loadingData, setLoadingData] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [facilities, setFacilities] = useState<FacilityMonitoringItem[]>([]);
  const [verifierCount, setVerifierCount] = useState(0);
  const [totalStaffCount, setTotalStaffCount] = useState(0);
  const [totalDoctorCount, setTotalDoctorCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("semua");
  const [statusFilter, setStatusFilter] = useState("semua");

  const [, startTransition] = useTransition();

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
        setAuthLoading(false);
      } catch (err) {
        console.error("Gagal memeriksa sesi Dinkes:", err);
        setAccessDenied(true);
        setAuthLoading(false);
      }
    }

    checkAuth();
  }, []);

  // 2. Muat Data Fasilitas, Tenaga Medis, dan Verifikator Wilayah
  const loadMonitoringData = async () => {
    setLoadingData(true);
    setErrorMsg(null);

    try {
      const supabase = createClient();

      // Query data fasilitas terdaftar
      const { data: facData, error: facError } = await supabase
        .from("facilities")
        .select("id, name, type, license_number, address, city, district, status, created_at")
        .order("created_at", { ascending: false });

      if (facError) throw facError;

      // Query tenaga medis terdaftar
      const { data: staffData, error: staffError } = await supabase
        .from("facility_staff")
        .select("id, staff_role, specialization, status, facility_id");

      if (staffError) throw staffError;

      // Query verifikator wilayah
      const { data: verifierData, error: verifierError } = await supabase
        .from("verifier_profiles")
        .select("id, status");

      if (verifierError) throw verifierError;

      // Pemetaan staf ke fasilitas
      const staffMap: Record<string, { total: number; doctors: number; specialists: number }> = {};
      let totalStaff = 0;
      let totalDoctors = 0;

      if (Array.isArray(staffData)) {
        totalStaff = staffData.length;
        staffData.forEach((st) => {
          if (!staffMap[st.facility_id]) {
            staffMap[st.facility_id] = { total: 0, doctors: 0, specialists: 0 };
          }
          staffMap[st.facility_id].total += 1;
          if (st.staff_role === "dokter") {
            totalDoctors += 1;
            staffMap[st.facility_id].doctors += 1;
            if (st.specialization) {
              staffMap[st.facility_id].specialists += 1;
            }
          }
        });
      }

      setTotalStaffCount(totalStaff);
      setTotalDoctorCount(totalDoctors);

      if (Array.isArray(verifierData)) {
        setVerifierCount(verifierData.filter((v) => v.status === "aktif").length);
      }

      const mappedFacs: FacilityMonitoringItem[] = (facData || []).map((f) => ({
        ...f,
        staffCount: staffMap[f.id]?.total || 0,
        doctorCount: staffMap[f.id]?.doctors || 0,
        specialistCount: staffMap[f.id]?.specialists || 0,
      }));

      setFacilities(mappedFacs);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg("Gagal memuat data pemantauan fasilitas: " + msg);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (currentUser && !accessDenied) {
      startTransition(() => {
        void loadMonitoringData();
      });
    }
  }, [currentUser, accessDenied]);

  // 3. Ringkasan Statistik Riil
  const totalFacilities = facilities.length;
  const activeFacilities = facilities.filter((f) => f.status === "aktif").length;
  const pendingFacilities = facilities.filter((f) => f.status === "menunggu").length;

  const hospitalsCount = facilities.filter((f) => f.type === "rumah_sakit" && f.status === "aktif").length;
  const puskesmasCount = facilities.filter((f) => f.type === "puskesmas" && f.status === "aktif").length;
  const klinikCount = facilities.filter((f) => f.type === "klinik" && f.status === "aktif").length;
  const apotekCount = facilities.filter((f) => f.type === "apotek" && f.status === "aktif").length;

  // 4. Filter Dataset
  const filteredFacilities = facilities.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.city?.toLowerCase().includes(q) ||
      item.district?.toLowerCase().includes(q) ||
      item.license_number?.toLowerCase().includes(q);

    const matchType = typeFilter === "semua" || item.type === typeFilter;
    const matchStatus = statusFilter === "semua" || item.status === statusFilter;

    return matchSearch && matchType && matchStatus;
  });

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
            <h2 className="text-lg font-bold text-[#0F3040]">Memeriksa Hak Akses Pengawas Wilayah...</h2>
            <p className="text-xs text-slate-500 mt-1">Menghubungkan ke basis data otorisasi Dinas Kesehatan.</p>
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
              Halaman ini diperuntukkan secara khusus bagi akun regulator resmi Dinas Kesehatan dengan kewenangan pengawasan wilayah.
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
        activeItem="Pemantauan"
        userName={currentUser.full_name}
        userRole="Dinas Kesehatan"
        forceGlass={true}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        {/* HEADER PEMANTAUAN DINKES */}
        <Reveal>
          <div className="bg-white rounded-[24px] border border-[#E2E8F0] p-6 sm:p-8 shadow-sm mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EBF2F6] text-[#0F3040] mb-2">
                  <Landmark className="w-3.5 h-3.5 text-[#8F5A4E]" />
                  <span>Regulator &amp; Pengawas Wilayah</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F3040] tracking-tight">
                  Pemantauan Jaringan Faskes &amp; Kesiapan Rujukan
                </h1>
                <p className="text-xs sm:text-sm text-[#464858]/80 mt-1 max-w-2xl leading-relaxed">
                  Monitoring kesiapan operasional fasilitas kesehatan, sebaran tenaga medis spesialis terverifikasi, dan cakupan pengawasan rujukan wilayah.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {pendingFacilities > 0 && (
                  <Link
                    href="/portal/dinkes/verifikasi-faskes"
                    className="px-4 py-2 rounded-full border border-amber-300 bg-amber-50 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors shadow-2xs inline-flex items-center gap-1.5"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-700" />
                    <span>{pendingFacilities} Faskes Menunggu</span>
                  </Link>
                )}
                <button
                  type="button"
                  onClick={loadMonitoringData}
                  disabled={loadingData}
                  className="px-4 py-2 rounded-full border border-[#E2E8F0] bg-white text-xs font-semibold text-[#0F3040] hover:bg-slate-50 transition-colors shadow-2xs inline-flex items-center gap-2"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${loadingData ? "animate-spin" : ""}`} />
                  <span>Segarkan</span>
                </button>
              </div>
            </div>
          </div>
        </Reveal>

        {/* BANNER PRIVASI PASIEN (UU PDP) */}
        <Reveal delay={40}>
          <div className="mb-8 p-4 rounded-[18px] bg-[#E8F5EE] border border-[#2E7D51]/25 flex items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start sm:items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-[#2E7D51] shrink-0 mt-0.5 sm:mt-0" />
              <div className="text-xs text-[#1C3D2D] leading-relaxed">
                <strong>Kepatuhan UU Pelindungan Data Pribadi (UU No. 27/2022): </strong>
                Data rekam medis individu pasien dilindungi token izin 6 digit dan tidak dapat diakses tanpa persetujuan pasien. Dashboard regulator berfokus pada kesiapan fasilitas, legalitas izin operasional, dan integritas jaringan rujukan daerah.
              </div>
            </div>
            <span className="hidden md:inline-flex text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white text-[#2E7D51] border border-[#2E7D51]/30 shrink-0">
              Pengawasan Makro
            </span>
          </div>
        </Reveal>

        {/* 4 KARTU METRIK OPERASIONAL NYATA */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Metrik 1: Total Fasilitas */}
          <Reveal delay={60}>
            <div className="bg-white rounded-[20px] p-5 border border-[#E2E8F0] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Fasilitas</span>
                <div className="w-8 h-8 rounded-lg bg-[#EBF2F6] flex items-center justify-center text-[#0F3040]">
                  <Building className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-[#0F3040] tabular-nums mb-1">{totalFacilities}</div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="text-[#2E7D51] font-semibold">{activeFacilities} Aktif</span>
                <span>•</span>
                <span className="text-amber-700 font-semibold">{pendingFacilities} Menunggu</span>
              </div>
            </div>
          </Reveal>

          {/* Metrik 2: Rumah Sakit Rujukan */}
          <Reveal delay={80}>
            <div className="bg-white rounded-[20px] p-5 border border-[#E2E8F0] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">RS Rujukan Aktif</span>
                <div className="w-8 h-8 rounded-lg bg-[#E8F5EE] flex items-center justify-center text-[#2E7D51]">
                  <Hospital className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-[#0F3040] tabular-nums mb-1">{hospitalsCount}</div>
              <div className="text-xs text-slate-500">
                Faskes rujukan lanjutan aktif di sistem
              </div>
            </div>
          </Reveal>

          {/* Metrik 3: Tenaga Medis & Dokter */}
          <Reveal delay={100}>
            <div className="bg-white rounded-[20px] p-5 border border-[#E2E8F0] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tenaga Medis</span>
                <div className="w-8 h-8 rounded-lg bg-[#F4FAF6] flex items-center justify-center text-[#2E7D51]">
                  <Stethoscope className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-[#0F3040] tabular-nums mb-1">{totalStaffCount}</div>
              <div className="text-xs text-slate-500">
                <span className="font-semibold text-[#0F3040]">{totalDoctorCount}</span> Dokter terverifikasi
              </div>
            </div>
          </Reveal>

          {/* Metrik 4: Verifikator Wilayah */}
          <Reveal delay={120}>
            <div className="bg-white rounded-[20px] p-5 border border-[#E2E8F0] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Verifikator Wilayah</span>
                <div className="w-8 h-8 rounded-lg bg-[#FFF4D6] flex items-center justify-center text-[#7A5200]">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-[#0F3040] tabular-nums mb-1">{verifierCount}</div>
              <div className="text-xs text-slate-500">
                Petugas Kelurahan / Kecamatan aktif
              </div>
            </div>
          </Reveal>
        </div>

        {/* SEBARAN JENIS FASKES (PILLS) */}
        <Reveal delay={140}>
          <div className="bg-white rounded-[20px] p-5 border border-[#E2E8F0] shadow-sm mb-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0F3040]">
              <Info className="w-4 h-4 text-[#2E7D51]" />
              <span>Komposisi Jaringan Faskes Aktif:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E8F5EE] text-[#1C3D2D]">
                <Hospital className="w-3.5 h-3.5 text-[#2E7D51]" />
                {hospitalsCount} Rumah Sakit
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EBF2F6] text-[#0F3040]">
                <Building className="w-3.5 h-3.5 text-[#0F3040]" />
                {puskesmasCount} Puskesmas
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                <Users className="w-3.5 h-3.5 text-slate-600" />
                {klinikCount} Klinik Pratama
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900">
                <Pill className="w-3.5 h-3.5 text-amber-700" />
                {apotekCount} Apotek
              </span>
            </div>
          </div>
        </Reveal>

        {/* TABEL PEMANTAUAN FASILITAS WILAYAH */}
        <Reveal delay={160}>
          <Card variant="white" className="border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-[#E2E8F0]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[#0F3040]">Daftar Fasilitas Kesehatan Terdaftar</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Menampilkan {filteredFacilities.length} dari {totalFacilities} fasilitas di wilayah pengawasan
                  </p>
                </div>

                {/* Filter & Pencarian */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative min-w-[200px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Cari faskes / wilayah..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 rounded-full border border-[#E2E8F0] text-xs text-[#0F3040] placeholder:text-slate-400 focus:outline-none focus:border-[#2E7D51]"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="py-1.5 px-3 rounded-full border border-[#E2E8F0] text-xs text-[#0F3040] bg-white focus:outline-none focus:border-[#2E7D51] cursor-pointer"
                    >
                      <option value="semua">Semua Jenis</option>
                      <option value="rumah_sakit">Rumah Sakit</option>
                      <option value="puskesmas">Puskesmas</option>
                      <option value="klinik">Klinik</option>
                      <option value="apotek">Apotek</option>
                    </select>

                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="py-1.5 px-3 rounded-full border border-[#E2E8F0] text-xs text-[#0F3040] bg-white focus:outline-none focus:border-[#2E7D51] cursor-pointer"
                    >
                      <option value="semua">Semua Status</option>
                      <option value="aktif">Aktif</option>
                      <option value="menunggu">Menunggu</option>
                      <option value="ditolak">Ditolak</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="m-6 p-4 rounded-xl bg-[#FDECEA] border border-[#B3261E]/30 text-xs text-[#B3261E]">
                {errorMsg}
              </div>
            )}

            {/* Tabel Data */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F8FCFA] text-slate-600 border-b border-[#E2E8F0]">
                    <th className="py-3.5 px-4 font-bold">Nama Fasilitas</th>
                    <th className="py-3.5 px-4 font-bold">Jenis Faskes</th>
                    <th className="py-3.5 px-4 font-bold">Wilayah &amp; Alamat</th>
                    <th className="py-3.5 px-4 font-bold">No. Izin Operasional</th>
                    <th className="py-3.5 px-4 font-bold text-center">Tenaga Medis</th>
                    <th className="py-3.5 px-4 font-bold">Status</th>
                    <th className="py-3.5 px-4 font-bold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]/60">
                  {loadingData ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <RotateCw className="w-5 h-5 mx-auto mb-2 animate-spin text-[#2E7D51]" />
                        <span>Memuat data kesiapan faskes...</span>
                      </td>
                    </tr>
                  ) : filteredFacilities.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        Tidak ada fasilitas kesehatan yang cocok dengan kriteria pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredFacilities.map((fac) => {
                      const locationStr = formatFacilityLocation({ district: fac.district, city: fac.city });
                      return (
                        <tr key={fac.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-[#0F3040]">
                            <div className="font-bold text-[13px]">{fac.name}</div>
                            {fac.address && <div className="text-[11px] text-slate-400 truncate max-w-[220px]">{fac.address}</div>}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#EBF2F6] text-[#0F3040]">
                              {formatFacilityType(fac.type)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{locationStr}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                            {fac.license_number || "-"}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-semibold text-[#0F3040]">{fac.staffCount}</span>
                            <span className="text-slate-400 text-[10px] block">({fac.doctorCount} dokter)</span>
                          </td>
                          <td className="py-3.5 px-4">
                            {fac.status === "aktif" ? (
                              <Badge variant="selesai">Aktif</Badge>
                            ) : fac.status === "menunggu" ? (
                              <Badge variant="proses">Menunggu</Badge>
                            ) : (
                              <Badge variant="bahaya">Ditolak</Badge>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {fac.status === "menunggu" ? (
                              <Link
                                href="/portal/dinkes/verifikasi-faskes"
                                className="inline-flex items-center gap-1 text-[11.5px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 px-2.5 py-1 rounded-full hover:bg-amber-100 transition-colors"
                              >
                                <span>Verifikasi</span>
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            ) : (
                              <span className="text-[11px] text-slate-400">Terdaftar</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Catatan Keterbatasan Faktual */}
            <div className="p-4 bg-[#F8FCFA] border-t border-[#E2E8F0] text-[11.5px] text-slate-500 flex items-start gap-2">
              <Info className="w-4 h-4 text-[#2E7D51] shrink-0 mt-0.5" />
              <span>
                <strong>Keterangan Arsitektur: </strong>
                Data operasional bersumber langsung dari basis data Supabase.hanya di peruntukkan untuk demo sehingga bukan data nyata. 
              </span>
            </div>
          </Card>
        </Reveal>
      </main>
    </div>
  );
}
