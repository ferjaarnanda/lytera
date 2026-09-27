"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Landmark,
  Hospital,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  Search,
  MapPin,
  User,
  FileCheck2,
  FileText,
  ExternalLink,
  X,
  Loader2,
  ShieldCheck,
  ChevronRight,
  Filter,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardInner } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { Navbar } from "@/components/Navbar";
import { Reveal } from "@/components/Reveal";
import { LogoutButton } from "@/components/LogoutButton";
import {
  verifikasiFasilitasAction,
  getFacilityDocumentSignedUrlAction,
} from "@/app/actions/dinkes";

// ============================================================================
// TIPE DATA DOMAIN & MODEL DINKES
// ============================================================================

export interface FacilityAdminProfile {
  full_name?: string | null;
  email?: string | null;
}

export interface RegistrationReviewItem {
  id: string;
  target_table: string;
  target_id: string;
  decision: "disetujui" | "ditolak" | string;
  notes: string | null;
  reviewed_by: string;
  created_at: string;
}

export interface FacilityItem {
  id: string;
  admin_id: string;
  type: string;
  name: string;
  license_number: string;
  license_document_path?: string | null;
  address: string;
  province: string;
  city: string;
  district: string;
  phone: string;
  email: string;
  status: "menunggu" | "aktif" | "ditolak" | string;
  created_at: string;
  profiles?: FacilityAdminProfile | null;
  latestReview?: RegistrationReviewItem | null;
}

interface CurrentUserProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
}

// ============================================================================
// FUNGSI PEMBANTU FORMAT TAMPILAN
// ============================================================================

function formatFacilityType(type?: string): string {
  switch (type?.toLowerCase().trim()) {
    case "puskesmas":
      return "Puskesmas";
    case "klinik":
      return "Klinik Pratama";
    case "rumah_sakit":
    case "rumah-sakit":
      return "Rumah Sakit";
    case "apotek":
      return "Apotek";
    default:
      return type || "Fasilitas Kesehatan";
  }
}

function formatDateIndo(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

// ============================================================================
// KOMPONEN UTAMA HALAMAN VERIFIKASI FASKES DINKES
// ============================================================================

export default function VerifikasiFaskesPage() {
  const router = useRouter();

  // State Pengguna & Hak Akses
  const [currentUser, setCurrentUser] = useState<CurrentUserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  // State Tab & Filter
  const [activeTab, setActiveTab] = useState<"menunggu" | "riwayat">("menunggu");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("semua");

  // State Data Faskes & Ringkasan Angka
  const [loadingData, setLoadingData] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [waitingFacilities, setWaitingFacilities] = useState<FacilityItem[]>([]);
  const [historyFacilities, setHistoryFacilities] = useState<FacilityItem[]>([]);
  const [counts, setCounts] = useState({
    menunggu: 0,
    aktif: 0,
    ditolak: 0,
  });
  const [reloadKey, setReloadKey] = useState(0);

  // State Modal Detail & Aksi
  const [selectedFacility, setSelectedFacility] = useState<FacilityItem | null>(null);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [openingDoc, setOpeningDoc] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Pengecekan Sesi & Memuat Seluruh Data Terkait
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let isCancelled = false;

    async function initData() {
      try {
        const supabase = createClient();

        // 1. Cek User Login
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (isCancelled) return;

        if (userError || !user) {
          router.replace("/masuk/dinkes");
          return;
        }

        // 2. Cek Profil Dinkes
        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("id, full_name, email, role, status")
          .eq("id", user.id)
          .maybeSingle();

        if (isCancelled) return;

        if (profileErr || !profile || profile.role !== "dinkes") {
          setAccessDenied(true);
          setAuthLoading(false);
          setLoadingData(false);
          return;
        }

        setCurrentUser(profile as CurrentUserProfile);
        setAuthLoading(false);

        // 3. Kueri Ringkasan Angka
        const [countMenungguRes, countAktifRes, countDitolakRes] = await Promise.all([
          supabase
            .from("facilities")
            .select("*", { count: "exact", head: true })
            .eq("status", "menunggu"),
          supabase
            .from("facilities")
            .select("*", { count: "exact", head: true })
            .eq("status", "aktif"),
          supabase
            .from("facilities")
            .select("*", { count: "exact", head: true })
            .eq("status", "ditolak"),
        ]);

        if (isCancelled) return;

        setCounts({
          menunggu: countMenungguRes.count || 0,
          aktif: countAktifRes.count || 0,
          ditolak: countDitolakRes.count || 0,
        });

        // 4. Kueri Antrean Menunggu
        const { data: waitingData, error: waitingErr } = await supabase
          .from("facilities")
          .select(
            "id, admin_id, type, name, license_number, license_document_path, address, province, city, district, phone, email, status, created_at, profiles:admin_id(full_name, email)"
          )
          .eq("status", "menunggu")
          .order("created_at", { ascending: false });

        if (isCancelled) return;

        if (waitingErr) {
          throw new Error("Gagal mengambil antrean faskes: " + waitingErr.message);
        }

        // 5. Kueri Riwayat
        const { data: historyData, error: historyErr } = await supabase
          .from("facilities")
          .select(
            "id, admin_id, type, name, license_number, license_document_path, address, province, city, district, phone, email, status, created_at, profiles:admin_id(full_name, email)"
          )
          .in("status", ["aktif", "ditolak"])
          .order("created_at", { ascending: false });

        if (isCancelled) return;

        if (historyErr) {
          throw new Error("Gagal mengambil riwayat verifikasi: " + historyErr.message);
        }

        // 6. Kueri registration_reviews
        const { data: reviewsData } = await supabase
          .from("registration_reviews")
          .select("id, target_table, target_id, decision, notes, reviewed_by, created_at")
          .eq("target_table", "facilities")
          .order("created_at", { ascending: false });

        if (isCancelled) return;

        const reviewMap: Record<string, RegistrationReviewItem> = {};
        if (reviewsData) {
          (reviewsData as RegistrationReviewItem[]).forEach((rev) => {
            if (!reviewMap[rev.target_id]) {
              reviewMap[rev.target_id] = rev;
            }
          });
        }

        const mappedHistory: FacilityItem[] = (historyData as unknown as FacilityItem[]).map((f) => ({
          ...f,
          latestReview: reviewMap[f.id] || null,
        }));

        setWaitingFacilities((waitingData as unknown as FacilityItem[]) || []);
        setHistoryFacilities(mappedHistory || []);
        setErrorMsg(null);
      } catch (err: unknown) {
        if (!isCancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setErrorMsg(msg);
        }
      } finally {
        if (!isCancelled) {
          setLoadingData(false);
        }
      }
    }

    initData();

    return () => {
      isCancelled = true;
    };
  }, [router, reloadKey]);

  const handleRefresh = () => {
    setLoadingData(true);
    setReloadKey((prev) => prev + 1);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Handler Aksi Setujui & Tolak
  // ──────────────────────────────────────────────────────────────────────────
  const handleOpenDetail = (facility: FacilityItem) => {
    setSelectedFacility(facility);
    setRejectMode(false);
    setRejectReason("");
    setActionError(null);
    setActionSuccessMsg(null);
    setDocError(null);
    setOpeningDoc(false);
  };

  const handleCloseDetail = () => {
    if (isPending) return;
    setSelectedFacility(null);
    setRejectMode(false);
    setRejectReason("");
    setActionError(null);
    setActionSuccessMsg(null);
    setDocError(null);
    setOpeningDoc(false);
  };

  const handleViewDocument = async (filePath: string) => {
    setOpeningDoc(true);
    setDocError(null);
    try {
      const res = await getFacilityDocumentSignedUrlAction(filePath);
      if (!res.success || !res.signedUrl) {
        setDocError(res.error || "Gagal membuka berkas izin operasional.");
        return;
      }
      window.open(res.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setDocError("Terjadi kendala saat membuka dokumen: " + msg);
    } finally {
      setOpeningDoc(false);
    }
  };

  const handleApprove = () => {
    if (!selectedFacility) return;
    setActionError(null);

    startTransition(async () => {
      const res = await verifikasiFasilitasAction({
        facilityId: selectedFacility.id,
        decision: "disetujui",
      });

      if (!res.success) {
        setActionError(res.error || "Gagal menyetujui pendaftaran faskes.");
        return;
      }

      setActionSuccessMsg(`Fasilitas "${selectedFacility.name}" berhasil disetujui & diaktifkan.`);
      // Segarkan data dan tutup modal setelah jeda singkat
      handleRefresh();
      setTimeout(() => {
        handleCloseDetail();
      }, 900);
    });
  };

  const handleReject = () => {
    if (!selectedFacility) return;
    setActionError(null);

    if (!rejectReason.trim()) {
      setActionError("Alasan penolakan wajib diisi agar fasilitas dapat memperbaiki berkas.");
      return;
    }

    startTransition(async () => {
      const res = await verifikasiFasilitasAction({
        facilityId: selectedFacility.id,
        decision: "ditolak",
        notes: rejectReason.trim(),
      });

      if (!res.success) {
        setActionError(res.error || "Gagal menolak pendaftaran faskes.");
        return;
      }

      setActionSuccessMsg(`Pendaftaran "${selectedFacility.name}" telah ditolak dengan catatan.`);
      // Segarkan data dan tutup modal setelah jeda singkat
      handleRefresh();
      setTimeout(() => {
        handleCloseDetail();
      }, 900);
    });
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Filter & Pencarian Data Tabel
  // ──────────────────────────────────────────────────────────────────────────
  const activeDataset = activeTab === "menunggu" ? waitingFacilities : historyFacilities;

  const filteredDataset = activeDataset.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.city?.toLowerCase().includes(q) ||
      item.license_number?.toLowerCase().includes(q) ||
      item.profiles?.full_name?.toLowerCase().includes(q);

    const matchType = typeFilter === "semua" || item.type?.toLowerCase() === typeFilter.toLowerCase();

    return matchSearch && matchType;
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Render Loading & Access Denied State
  // ──────────────────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#464858]" data-navbar-tone="light">
        <Navbar variant="dinkes" userName="Memuat Profil..." userRole="Dinas Kesehatan" />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-16">
          <Card variant="white" className="p-12 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-[#EBF2F6] flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Clock className="w-6 h-6 text-[#0F3040]" />
            </div>
            <h2 className="text-lg font-bold text-[#0F3040]">Memeriksa Hak Akses Dinas Kesehatan...</h2>
            <p className="text-xs text-slate-500 mt-1">
              Menghubungkan ke basis data otorisasi wilayah Lytera.
            </p>
          </Card>
        </main>
      </div>
    );
  }

  if (accessDenied || !currentUser) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#464858]" data-navbar-tone="light">
        <Navbar variant="landing" />
        <main className="max-w-xl mx-auto px-4 sm:px-6 pt-28 pb-16">
          <Card variant="white" className="p-8 sm:p-10 text-center shadow-sm border border-[#E2E8F0]">
            <div className="w-12 h-12 rounded-full bg-[#FDECEA] flex items-center justify-center mx-auto mb-4 text-[#B3261E]">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-[#0F3040]">Akses Ditolak: Khusus Dinas Kesehatan</h1>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Halaman ini hanya dapat diakses oleh akun verifikator resmi dengan peran{" "}
              <span className="font-semibold text-[#0F3040]">&apos;dinkes&apos;</span>. Akun Anda saat ini
              tidak memiliki izin memverifikasi legalitas faskes.
            </p>
            <div className="flex items-center justify-center gap-3 mt-6">
              <LogoutButton
                label="Keluar Akun"
                className="px-5 py-2.5 rounded-full bg-[#0F3040] text-white text-xs font-semibold hover:bg-[#0A2230] transition-colors"
              />
            </div>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#464858]" data-navbar-tone="light">
      {/* Top Navbar */}
      <Navbar
        variant="dinkes"
        activeItem="Verifikasi Faskes"
        userName={currentUser.full_name}
        userRole="Dinas Kesehatan"
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        {/* ── HEADER VERIFIKASI DINKES ── */}
        <Reveal>
          <div className="bg-white rounded-[24px] border border-[#E2E8F0] p-6 sm:p-8 shadow-sm mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EBF2F6] text-[#0F3040] mb-2">
                  <Landmark className="w-3.5 h-3.5 text-[#8F5A4E]" />
                  <span>Regulator &amp; Pengawas Wilayah</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F3040] tracking-tight">
                  Verifikasi Pendaftaran Fasilitas Kesehatan
                </h1>
                <p className="text-xs sm:text-sm text-[#464858]/80 mt-1 max-w-2xl leading-relaxed">
                  Validasi izin operasional, profil penanggung jawab, dan domisili faskes sebelum
                  diberikan hak akses ke sistem rujukan digital terpadu Lytera.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={loadingData}
                  className="px-4 py-2 rounded-full border border-[#E2E8F0] bg-white text-xs font-semibold text-[#0F3040] hover:bg-slate-50 transition-colors shadow-2xs inline-flex items-center gap-2"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${loadingData ? "animate-spin" : ""}`} />
                  <span>Segarkan Data</span>
                </button>
              </div>
            </div>
          </div>
        </Reveal>

        {/* ── RINGKASAN ANGKA (COUNT QUERY RIIL) ── */}
        <Reveal delayMs={100}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
            {/* 1. Menunggu Verifikasi */}
            <div className="bg-white p-5 rounded-[22px] border border-[#E2E8F0] shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Menunggu Verifikasi
                </span>
                <div className="w-9 h-9 rounded-xl bg-[#FFF4D6] flex items-center justify-center text-[#7A5200]">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-bold text-[#7A5200] mt-3 tabular-nums">
                {counts.menunggu}
              </p>
              <span className="text-xs text-slate-500 inline-flex items-center gap-1 mt-1">
                Fasilitas memerlukan audit izin
              </span>
            </div>

            {/* 2. Disetujui / Aktif */}
            <div className="bg-white p-5 rounded-[22px] border border-[#E2E8F0] shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Faskes Aktif / Disetujui
                </span>
                <div className="w-9 h-9 rounded-xl bg-[#EDF7F2] flex items-center justify-center text-[#1B6B4D]">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-bold text-[#1B6B4D] mt-3 tabular-nums">
                {counts.aktif}
              </p>
              <span className="text-xs text-[#1B6B4D] font-medium inline-flex items-center gap-1 mt-1">
                Terhubung ke jaringan rujukan
              </span>
            </div>

            {/* 3. Ditolak */}
            <div className="bg-white p-5 rounded-[22px] border border-[#E2E8F0] shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Permohonan Ditolak
                </span>
                <div className="w-9 h-9 rounded-xl bg-[#FDECEA] flex items-center justify-center text-[#B3261E]">
                  <XCircle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-bold text-[#B3261E] mt-3 tabular-nums">
                {counts.ditolak}
              </p>
              <span className="text-xs text-slate-500 inline-flex items-center gap-1 mt-1">
                Berkas tidak memenuhi syarat
              </span>
            </div>
          </div>
        </Reveal>

        {/* ── ERROR BANNER JIKA ADA ── */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-[18px] bg-[#FDECEA] border border-[#B3261E]/30 text-[#B3261E] text-xs sm:text-sm flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Terjadi kendala saat membaca basis data:</p>
              <p className="mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* ── KONTROL TAB & PENCARIAN ── */}
        <Reveal delayMs={150}>
          <div className="bg-white rounded-[24px] border border-[#E2E8F0] shadow-sm overflow-hidden">
            {/* Header Tab & Toolbar */}
            <div className="p-4 sm:p-6 border-b border-[#E2E8F0] flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Navigasi Tab */}
              <div className="inline-flex p-1 bg-slate-100 rounded-full">
                <button
                  type="button"
                  onClick={() => setActiveTab("menunggu")}
                  className={`px-4 sm:px-5 py-2 rounded-full text-xs font-semibold transition-all inline-flex items-center gap-2 ${
                    activeTab === "menunggu"
                      ? "bg-white text-[#0F3040] shadow-xs"
                      : "text-slate-600 hover:text-[#0F3040]"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Antrean Menunggu</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      activeTab === "menunggu"
                        ? "bg-[#FFF4D6] text-[#7A5200]"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {counts.menunggu}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("riwayat")}
                  className={`px-4 sm:px-5 py-2 rounded-full text-xs font-semibold transition-all inline-flex items-center gap-2 ${
                    activeTab === "riwayat"
                      ? "bg-white text-[#0F3040] shadow-xs"
                      : "text-slate-600 hover:text-[#0F3040]"
                  }`}
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>Riwayat Keputusan</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      activeTab === "riwayat"
                        ? "bg-[#EDF7F2] text-[#1B6B4D]"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {counts.aktif + counts.ditolak}
                  </span>
                </button>
              </div>

              {/* Pencarian & Filter Jenis */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari faskes, kota, atau izin..."
                    className="w-full h-10 pl-10 pr-4 rounded-full border border-[#E2E8F0] text-xs focus:outline-none focus:ring-2 focus:ring-[#0F3040]/20 bg-slate-50"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="relative">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="h-10 px-3.5 rounded-full border border-[#E2E8F0] text-xs text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0F3040]/20 appearance-none pr-8 cursor-pointer"
                  >
                    <option value="semua">Semua Jenis Faskes</option>
                    <option value="puskesmas">Puskesmas</option>
                    <option value="klinik">Klinik Pratama</option>
                    <option value="rumah_sakit">Rumah Sakit</option>
                    <option value="apotek">Apotek</option>
                  </select>
                  <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* ── TABEL DATA FASILITAS ── */}
            {loadingData ? (
              <div className="p-12 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-[#0F3040] mx-auto mb-2" />
                <p className="text-xs text-slate-500">Memuat data fasilitas kesehatan...</p>
              </div>
            ) : filteredDataset.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Hospital className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-[#0F3040]">
                  {activeTab === "menunggu"
                    ? "Tidak ada permohonan yang menunggu verifikasi"
                    : "Belum ada riwayat verifikasi fasilitas"}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {searchQuery || typeFilter !== "semua"
                    ? "Tidak ditemukan data yang sesuai dengan kata kunci pencarian atau filter yang dipilih."
                    : activeTab === "menunggu"
                    ? "Semua permohonan faskes baru telah diproses atau belum ada pendaftaran baru."
                    : "Riwayat persetujuan atau penolakan fasilitas akan tersimpan di sini."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-[#E2E8F0] text-slate-500 font-semibold">
                      <th className="py-3.5 px-4 sm:px-6">Nama Fasilitas</th>
                      <th className="py-3.5 px-4">Jenis</th>
                      <th className="py-3.5 px-4">Kota / Wilayah</th>
                      <th className="py-3.5 px-4">
                        {activeTab === "menunggu" ? "Tanggal Daftar" : "Status & Tanggal"}
                      </th>
                      {activeTab === "riwayat" && <th className="py-3.5 px-4">Catatan Verifikasi</th>}
                      <th className="py-3.5 px-4 sm:px-6 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {filteredDataset.map((f) => (
                      <tr
                        key={f.id}
                        onClick={() => handleOpenDetail(f)}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                      >
                        {/* Kolom 1: Nama Faskes */}
                        <td className="py-4 px-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#FAF5F2] flex items-center justify-center text-[#8F5A4E] shrink-0 group-hover:bg-[#EBF2F6] group-hover:text-[#0F3040] transition-colors">
                              <Hospital className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-bold text-[#0F3040] block">{f.name}</span>
                              <span className="text-[11px] text-slate-500 font-mono">
                                No. Izin: {f.license_number || "-"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Kolom 2: Jenis */}
                        <td className="py-4 px-4">
                          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-[#EBF2F6] text-[#0F3040]">
                            {formatFacilityType(f.type)}
                          </span>
                        </td>

                        {/* Kolom 3: Kota / Wilayah */}
                        <td className="py-4 px-4">
                          <div className="text-slate-700">
                            <span className="block font-medium">{f.city || "-"}</span>
                            <span className="text-[11px] text-slate-500">
                              Kec. {f.district || "-"}
                            </span>
                          </div>
                        </td>

                        {/* Kolom 4: Tanggal / Status */}
                        <td className="py-4 px-4">
                          {activeTab === "menunggu" ? (
                            <span className="text-slate-600 font-medium">
                              {formatDateIndo(f.created_at)}
                            </span>
                          ) : (
                            <div className="space-y-1">
                              <div>
                                {f.status === "aktif" ? (
                                  <Badge variant="selesai" showDot>
                                    Disetujui
                                  </Badge>
                                ) : (
                                  <Badge variant="bahaya" showDot>
                                    Ditolak
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500 block">
                                {formatDateIndo(f.latestReview?.created_at || f.created_at)}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Kolom 5: Catatan Riwayat (Khusus Tab Riwayat) */}
                        {activeTab === "riwayat" && (
                          <td className="py-4 px-4 max-w-xs">
                            <span className="text-xs text-slate-600 line-clamp-2">
                              {f.latestReview?.notes || "-"}
                            </span>
                          </td>
                        )}

                        {/* Kolom 6: Aksi */}
                        <td className="py-4 px-4 sm:px-6 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetail(f);
                            }}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors inline-flex items-center gap-1.5 ${
                              activeTab === "menunggu"
                                ? "bg-[#0F3040] text-white hover:bg-[#0A2230]"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                          >
                            <span>{activeTab === "menunggu" ? "Periksa & Putuskan" : "Lihat Detail"}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Reveal>

        {/* ── MODAL DETAIL & AKSI VERIFIKASI FASILITAS ── */}
        {selectedFacility && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
            <div
              className="bg-white rounded-[24px] shadow-2xl border border-[#E2E8F0] w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Modal */}
              <div className="p-6 border-b border-[#E2E8F0] flex items-start justify-between gap-4 sticky top-0 bg-white/95 backdrop-blur-xs z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#FAF5F2] flex items-center justify-center text-[#8F5A4E] shrink-0">
                    <Hospital className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-[#EBF2F6] text-[#0F3040]">
                        {formatFacilityType(selectedFacility.type)}
                      </span>
                      {selectedFacility.status === "menunggu" && (
                        <Badge variant="proses" showDot>
                          Menunggu Verifikasi
                        </Badge>
                      )}
                      {selectedFacility.status === "aktif" && (
                        <Badge variant="selesai" showDot>
                          Disetujui
                        </Badge>
                      )}
                      {selectedFacility.status === "ditolak" && (
                        <Badge variant="bahaya" showDot>
                          Ditolak
                        </Badge>
                      )}
                    </div>
                    <h2 className="text-lg font-bold text-[#0F3040] mt-1">
                      {selectedFacility.name}
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCloseDetail}
                  disabled={isPending}
                  className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Isi Detail Fasilitas */}
              <div className="p-6 space-y-6">
                {/* Notifikasi Aksi Sukses / Gagal */}
                {actionSuccessMsg && (
                  <div className="p-4 rounded-[16px] bg-[#EDF7F2] border border-[#1B6B4D]/30 text-[#1B6B4D] text-xs sm:text-sm flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span className="font-semibold">{actionSuccessMsg}</span>
                  </div>
                )}

                {actionError && (
                  <div className="p-4 rounded-[16px] bg-[#FDECEA] border border-[#B3261E]/30 text-[#B3261E] text-xs sm:text-sm flex items-center gap-2.5">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span className="font-semibold">{actionError}</span>
                  </div>
                )}

                {/* Grid Informasi Pokok */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nomor Izin */}
                  <CardInner variant="cream" className="p-3.5 rounded-[16px] border border-[#E2E8F0]">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">
                      Nomor Izin Operasional
                    </span>
                    <span className="text-sm font-bold text-[#0F3040] font-mono">
                      {selectedFacility.license_number || "Tidak terlampir"}
                    </span>
                  </CardInner>

                  {/* Tanggal Pendaftaran */}
                  <CardInner variant="mist" className="p-3.5 rounded-[16px] border border-[#E2E8F0]">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">
                      Waktu Registrasi Masuk
                    </span>
                    <span className="text-sm font-semibold text-[#0F3040]">
                      {formatDateIndo(selectedFacility.created_at)}
                    </span>
                  </CardInner>
                </div>

                {/* Dokumen Surat Izin Operasional */}
                <div className="p-4 rounded-[18px] bg-[#FAF5F2] border border-[#E2E8F0] space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#0F3040]">
                      <FileText className="w-4 h-4 text-[#8F5A4E]" />
                      <span>Berkas Fisik Surat Izin Operasional</span>
                    </div>

                    {selectedFacility.license_document_path ? (
                      <button
                        type="button"
                        onClick={() =>
                          handleViewDocument(selectedFacility.license_document_path!)
                        }
                        disabled={openingDoc}
                        className="px-4 py-2 rounded-full bg-[#0F3040] hover:bg-[#0A2230] text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                      >
                        {openingDoc ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ExternalLink className="w-3.5 h-3.5" />
                        )}
                        <span>Lihat Berkas Izin Operasional</span>
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium px-3 py-1 rounded-full bg-slate-100 border border-slate-200 inline-flex items-center">
                        Berkas belum diunggah
                      </span>
                    )}
                  </div>

                  {docError && (
                    <p className="text-xs text-[#B3261E] font-medium pt-1">
                      {docError}
                    </p>
                  )}
                </div>

                {/* Administrator Pemohon */}
                <div className="p-4 rounded-[18px] bg-slate-50 border border-[#E2E8F0] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0F3040]">
                    <User className="w-4 h-4 text-[#8F5A4E]" />
                    <span>Penanggung Jawab / Admin Terdaftar (join profiles)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-slate-500 block">Nama Lengkap:</span>
                      <span className="font-semibold text-[#0F3040]">
                        {selectedFacility.profiles?.full_name || "Tidak ada nama terdata"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Email Akun:</span>
                      <span className="font-semibold text-[#0F3040] break-all">
                        {selectedFacility.profiles?.email || selectedFacility.email || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Nomor Telepon:</span>
                      <span className="font-semibold text-[#0F3040]">
                        {selectedFacility.phone || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Alamat & Wilayah */}
                <div className="p-4 rounded-[18px] bg-slate-50 border border-[#E2E8F0] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0F3040]">
                    <MapPin className="w-4 h-4 text-[#1B6B4D]" />
                    <span>Lokasi &amp; Wilayah Fasilitas</span>
                  </div>
                  <div className="text-xs text-[#0F3040] space-y-1">
                    <p className="font-medium">
                      <span className="text-slate-500">Alamat Lengkap: </span>
                      {selectedFacility.address || "-"}
                    </p>
                    <p>
                      <span className="text-slate-500">Kecamatan: </span>
                      <span className="font-semibold">{selectedFacility.district || "-"}</span>
                      <span className="text-slate-500"> &bull; Kota/Kab: </span>
                      <span className="font-semibold">{selectedFacility.city || "-"}</span>
                      <span className="text-slate-500"> &bull; Provinsi: </span>
                      <span className="font-semibold">{selectedFacility.province || "-"}</span>
                    </p>
                  </div>
                </div>

                {/* Riwayat Keputusan Terakhir (Jika sudah bukan 'menunggu') */}
                {selectedFacility.status !== "menunggu" && selectedFacility.latestReview && (
                  <div
                    className={`p-4 rounded-[18px] border text-xs space-y-1.5 ${
                      selectedFacility.status === "aktif"
                        ? "bg-[#EDF7F2]/60 border-[#1B6B4D]/30"
                        : "bg-[#FDECEA]/60 border-[#B3261E]/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#0F3040] flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-[#0F3040]" />
                        Keputusan Terakhir dari registration_reviews
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        {formatDateIndo(selectedFacility.latestReview.created_at)}
                      </span>
                    </div>
                    <p className="text-slate-700">
                      <span className="font-semibold">Catatan Reviewer: </span>
                      {selectedFacility.latestReview.notes || "Tidak ada catatan khusus."}
                    </p>
                  </div>
                )}

                {/* ── AREA FORM TOLAK (JIKA STATUS MENUNGGU & MODE TOLAK) ── */}
                {selectedFacility.status === "menunggu" && rejectMode && (
                  <div className="p-4 rounded-[18px] bg-[#FAF5F2] border border-[#8F5A4E]/30 space-y-3">
                    <label
                      htmlFor="alasanPenolakan"
                      className="block text-xs font-bold text-[#0F3040]"
                    >
                      Alasan Penolakan Pendaftaran <span className="text-[#B3261E]">*</span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Tuliskan rincian kekurangan berkas atau persyaratan yang belum dipenuhi agar
                      pihak fasilitas dapat memperbaikinya.
                    </p>
                    <textarea
                      id="alasanPenolakan"
                      rows={3}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Contoh: Nomor Surat Izin Operasional faskes tidak terdaftar di SIMK, silakan upload dokumen izin yang masih berlaku."
                      className="w-full p-3 rounded-[12px] border border-[#E2E8F0] text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#8F5A4E]/30"
                    />

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setRejectMode(false)}
                        disabled={isPending}
                        className="px-4 py-2 rounded-full border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleReject}
                        disabled={isPending || !rejectReason.trim()}
                        className="px-5 py-2 rounded-full bg-[#B3261E] text-white text-xs font-semibold hover:bg-[#8F1F19] transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                      >
                        {isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        <span>Konfirmasi Tolak Pendaftaran</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Modal: Tombol Aksi */}
              <div className="p-6 border-t border-[#E2E8F0] bg-slate-50 rounded-b-[24px] flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleCloseDetail}
                  disabled={isPending}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-full border border-[#E2E8F0] bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Tutup
                </button>

                {selectedFacility.status === "menunggu" && !rejectMode && (
                  <div className="w-full sm:w-auto flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setRejectMode(true);
                        setActionError(null);
                      }}
                      disabled={isPending}
                      className="flex-1 sm:flex-none px-5 py-2.5 rounded-full border border-[#B3261E]/30 bg-white text-[#B3261E] hover:bg-[#FDECEA] text-xs font-semibold transition-colors inline-flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Tolak</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={isPending}
                      className="flex-1 sm:flex-none px-6 py-2.5 rounded-full bg-[#1B6B4D] hover:bg-[#15533b] text-white text-xs font-semibold transition-colors shadow-xs inline-flex items-center justify-center gap-1.5"
                    >
                      {isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      <span>Setujui</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
