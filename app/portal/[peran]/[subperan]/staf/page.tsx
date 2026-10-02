"use client";

import React, { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  Stethoscope,
  Pill,
  ShieldAlert,
  Search,
  Check,
  X,
} from "lucide-react";
import { Navbar, NavbarVariant } from "@/components/Navbar";
import { Reveal } from "@/components/Reveal";
import {
  getAdminFacilityStaffAction,
  updateStaffStatusAction,
  StaffItem,
  FacilityAdminInfo,
} from "@/app/actions/staf";
import { getSubRoleMeta, isValidRole, isValidSubRole, RoleId } from "@/lib/roles";

interface PageProps {
  params: Promise<{
    peran: string;
    subperan: string;
  }>;
}

const ROLE_LABELS: Record<string, { label: string; icon: React.ReactNode; bg: string; text: string }> = {
  dokter: {
    label: "Dokter",
    icon: <Stethoscope className="w-3.5 h-3.5" />,
    bg: "bg-[#EDF7F2]",
    text: "text-[#1B6B4D]",
  },
  petugas: {
    label: "Petugas",
    icon: <Users className="w-3.5 h-3.5" />,
    bg: "bg-[#EBF2F6]",
    text: "text-[#0F3040]",
  },
  apoteker: {
    label: "Apoteker",
    icon: <Pill className="w-3.5 h-3.5" />,
    bg: "bg-[#FFF4D6]",
    text: "text-[#7A5200]",
  },
};

export default function KelolaStafFaskesPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { peran, subperan } = resolvedParams;

  const valid = isValidRole(peran) && isValidSubRole(peran as RoleId, subperan);

  useEffect(() => {
    if (!valid) {
      router.replace("/");
    }
  }, [valid, router]);

  const subRoleMeta = getSubRoleMeta(peran, subperan);

  // State data
  const [loading, setLoading] = useState(true);
  const [facility, setFacility] = useState<FacilityAdminInfo | null>(null);
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Tab & Filter
  const [activeTab, setActiveTab] = useState<"menunggu" | "aktif" | "semua">("menunggu");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await getAdminFacilityStaffAction();
      if (!res.success) {
        setErrorMessage(res.error || "Gagal memuat data staf fasilitas.");
      } else {
        setFacility(res.facility || null);
        setStaffList(res.staff || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage("Kesalahan koneksi saat memuat data: " + msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) {
        loadData();
      }
    });
    return () => {
      ignore = true;
    };
  }, [loadData]);

  // Handle Approve / Reject
  const handleUpdateStatus = async (staffId: string, newStatus: "aktif" | "ditolak", staffName: string) => {
    const actionLabel = newStatus === "aktif" ? "menyetujui" : "menolak";
    if (!confirm(`Apakah Anda yakin ingin ${actionLabel} permohonan staf '${staffName}'?`)) {
      return;
    }

    setActionLoadingId(staffId);
    setFeedbackMessage(null);

    try {
      const res = await updateStaffStatusAction(staffId, newStatus);
      if (!res.success) {
        setFeedbackMessage({
          type: "error",
          text: res.error || `Gagal ${actionLabel} staf.`,
        });
      } else {
        setFeedbackMessage({
          type: "success",
          text: res.message || `Staf '${staffName}' berhasil ${newStatus === "aktif" ? "disetujui" : "ditolak"}.`,
        });
        // Muat ulang daftar
        await loadData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedbackMessage({
        type: "error",
        text: "Kesalahan sistem: " + msg,
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter list
  const filteredStaff = staffList.filter((s) => {
    // Filter tab
    if (activeTab === "menunggu" && s.status !== "menunggu") return false;
    if (activeTab === "aktif" && s.status !== "aktif") return false;

    // Filter search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const name = s.profiles?.full_name?.toLowerCase() || "";
      const email = s.profiles?.email?.toLowerCase() || "";
      const role = s.staff_role.toLowerCase();
      const str = s.str_number?.toLowerCase() || "";
      const sip = s.sip_number?.toLowerCase() || "";
      const spec = s.specialization?.toLowerCase() || "";

      return (
        name.includes(q) ||
        email.includes(q) ||
        role.includes(q) ||
        str.includes(q) ||
        sip.includes(q) ||
        spec.includes(q)
      );
    }

    return true;
  });

  const countMenunggu = staffList.filter((s) => s.status === "menunggu").length;
  const countAktif = staffList.filter((s) => s.status === "aktif").length;

  let navVariant: NavbarVariant = "landing";
  if (peran === "fasilitas") {
    if (subperan === "rumah-sakit") navVariant = "rumah-sakit";
    else if (subperan === "apotek") navVariant = "apoteker";
    else navVariant = "dokter-puskesmas";
  }

  return (
    <div className="min-h-screen text-[#464858]" data-navbar-tone="light" data-portal-wallpaper="true">
      <Navbar
        variant={navVariant}
        facilityName={facility?.name || `Fasilitas (${subRoleMeta?.name || ""})`}
        userName="Admin Fasilitas"
        userRole="Administrator"
        forceGlass={true}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        {/* Navigation Breadcrumb / Back */}
        <Reveal>
          <div className="mb-6 flex items-center justify-between">
            <Link
              href={`/portal/${peran}/${subperan}`}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#8F5A4E] hover:text-[#A56F63] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Portal {subRoleMeta?.name}</span>
            </Link>

            {facility && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EDF7F2] text-[#1B6B4D]">
                <span className="w-2 h-2 rounded-full bg-[#1B6B4D]" />
                {facility.name} ({facility.type})
              </span>
            )}
          </div>
        </Reveal>

        {/* Page Header */}
        <Reveal delayMs={50}>
          <div className="bg-white rounded-[24px] border border-[#E2E8F0] p-6 sm:p-8 shadow-sm mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-[#8F5A4E] uppercase tracking-wider">
                  Manajemen Kepegawaian &bull; Fasilitas Kesehatan
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#0F3040] mt-1">
                  Dokter & Petugas Fasilitas
                </h1>
                <p className="text-sm text-[#464858]/80 mt-1 max-w-2xl">
                  Tinjau dan verifikasi permohonan staf medis (dokter, petugas, apoteker) yang terafiliasi dengan fasilitas kesehatan Anda sebelum mereka dapat menerbitkan rujukan atau mengakses data pasien.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="px-4 py-2.5 rounded-2xl bg-[#FFF4D6] border border-[#7A5200]/20 flex items-center gap-2 text-xs text-[#7A5200]">
                  <Clock className="w-4 h-4 shrink-0 text-[#7A5200]" />
                  <span>
                    <strong>{countMenunggu}</strong> Permohonan Menunggu
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <Reveal>
            <div
              className={`mb-6 p-4 rounded-[16px] flex items-center gap-3 text-sm ${
                feedbackMessage.type === "success"
                  ? "bg-[#EDF7F2] border border-[#1B6B4D]/30 text-[#1B6B4D]"
                  : "bg-[#FDECEA] border border-[#B3261E]/30 text-[#B3261E]"
              }`}
            >
              {feedbackMessage.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0" />
              )}
              <span className="font-medium">{feedbackMessage.text}</span>
            </div>
          </Reveal>
        )}

        {/* Error State */}
        {errorMessage && (
          <Reveal>
            <div className="p-8 rounded-[24px] bg-white border border-[#E2E8F0] text-center shadow-sm mb-6">
              <ShieldAlert className="w-12 h-12 text-[#B3261E] mx-auto mb-3" />
              <h2 className="text-lg font-bold text-[#0F3040]">Tidak Dapat Mengakses Halaman Ini</h2>
              <p className="text-sm text-[#464858] max-w-md mx-auto mt-1 mb-6">{errorMessage}</p>
              <Link
                href={`/portal/${peran}/${subperan}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-[#0F3040] text-white hover:bg-[#0A2230] transition-colors"
              >
                <span>Kembali ke Beranda Portal</span>
              </Link>
            </div>
          </Reveal>
        )}

        {/* Main Content Card */}
        {!errorMessage && (
          <Reveal delayMs={100}>
            <div className="bg-white rounded-[24px] border border-[#E2E8F0] shadow-sm overflow-hidden">
              {/* Tabs & Search Bar */}
              <div className="p-4 sm:p-6 border-b border-[#E2E8F0] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                {/* Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-[14px] max-w-fit">
                  <button
                    type="button"
                    onClick={() => setActiveTab("menunggu")}
                    className={`px-4 py-2 rounded-[10px] text-xs font-semibold transition-all flex items-center gap-2 ${
                      activeTab === "menunggu"
                        ? "bg-white text-[#0F3040] shadow-xs"
                        : "text-slate-500 hover:text-[#0F3040]"
                    }`}
                  >
                    <span>Menunggu</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        countMenunggu > 0
                          ? "bg-[#FFF4D6] text-[#7A5200]"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {countMenunggu}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("aktif")}
                    className={`px-4 py-2 rounded-[10px] text-xs font-semibold transition-all flex items-center gap-2 ${
                      activeTab === "aktif"
                        ? "bg-white text-[#0F3040] shadow-xs"
                        : "text-slate-500 hover:text-[#0F3040]"
                    }`}
                  >
                    <span>Aktif</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#EDF7F2] text-[#1B6B4D]">
                      {countAktif}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("semua")}
                    className={`px-4 py-2 rounded-[10px] text-xs font-semibold transition-all ${
                      activeTab === "semua"
                        ? "bg-white text-[#0F3040] shadow-xs"
                        : "text-slate-500 hover:text-[#0F3040]"
                    }`}
                  >
                    <span>Semua ({staffList.length})</span>
                  </button>
                </div>

                {/* Search Box */}
                <div className="relative min-w-[260px]">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama, peran, STR..."
                    className="w-full h-10 pl-9 pr-4 rounded-[12px] border border-[#E2E8F0] text-xs focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Table / List */}
              {loading ? (
                <div className="p-12 text-center text-sm text-slate-400 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-[#8F5A4E]" />
                  <span>Memuat daftar staf fasilitas...</span>
                </div>
              ) : filteredStaff.length === 0 ? (
                <div className="p-12 text-center text-sm text-slate-400 flex flex-col items-center justify-center gap-2">
                  <Users className="w-8 h-8 opacity-30 text-slate-400 mb-1" />
                  <p className="font-semibold text-slate-600">Tidak ada staf dalam kategori ini</p>
                  <p className="text-xs text-slate-400">
                    {activeTab === "menunggu"
                      ? "Tidak ada permohonan staf baru yang menunggu persetujuan."
                      : activeTab === "aktif"
                      ? "Belum ada staf berstatus aktif pada fasilitas ini."
                      : "Tidak ditemukan data staf yang cocok dengan pencarian Anda."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-[#E2E8F0] text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3.5 px-4 sm:px-6">Nama & Kontak</th>
                        <th className="py-3.5 px-4">Peran</th>
                        <th className="py-3.5 px-4">No. STR / SIP</th>
                        <th className="py-3.5 px-4">Spesialisasi</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 sm:px-6 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {filteredStaff.map((staff) => {
                        const roleCfg = ROLE_LABELS[staff.staff_role] || {
                          label: staff.staff_role,
                          icon: null,
                          bg: "bg-slate-100",
                          text: "text-slate-700",
                        };

                        const isActionLoading = actionLoadingId === staff.id;
                        const fullName = staff.profiles?.full_name || "Nama tidak terdata";

                        return (
                          <tr key={staff.id} className="hover:bg-slate-50/60 transition-colors">
                            {/* Nama & Kontak */}
                            <td className="py-4 px-4 sm:px-6">
                              <div className="font-bold text-[#0F3040]">{fullName}</div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {staff.profiles?.email || "-"}
                              </div>
                            </td>

                            {/* Peran */}
                            <td className="py-4 px-4">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${roleCfg.bg} ${roleCfg.text}`}
                              >
                                {roleCfg.icon}
                                <span>{roleCfg.label}</span>
                              </span>
                            </td>

                            {/* No. STR / SIP */}
                            <td className="py-4 px-4 text-[#0F3040]">
                              {staff.str_number ? (
                                <div className="font-mono text-xs">{staff.str_number}</div>
                              ) : (
                                <span className="text-slate-400 italic">Tidak ada STR</span>
                              )}
                              {staff.sip_number && (
                                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                  SIP: {staff.sip_number}
                                </div>
                              )}
                            </td>

                            {/* Spesialisasi */}
                            <td className="py-4 px-4 text-slate-600">
                              {staff.specialization || "-"}
                            </td>

                            {/* Status */}
                            <td className="py-4 px-4">
                              {staff.status === "menunggu" && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FFF4D6] text-[#7A5200]">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>Menunggu</span>
                                </span>
                              )}
                              {staff.status === "aktif" && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#EDF7F2] text-[#1B6B4D]">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Aktif</span>
                                </span>
                              )}
                              {staff.status === "ditolak" && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FDECEA] text-[#B3261E]">
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Ditolak</span>
                                </span>
                              )}
                            </td>

                            {/* Aksi */}
                            <td className="py-4 px-4 sm:px-6 text-right">
                              {staff.status === "menunggu" ? (
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    type="button"
                                    disabled={isActionLoading}
                                    onClick={() => handleUpdateStatus(staff.id, "aktif", fullName)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[10px] text-xs font-semibold bg-[#1B6B4D] text-white hover:bg-[#14533C] transition-colors disabled:opacity-50"
                                  >
                                    {isActionLoading ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Check className="w-3.5 h-3.5" />
                                    )}
                                    <span>Setujui</span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isActionLoading}
                                    onClick={() => handleUpdateStatus(staff.id, "ditolak", fullName)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[10px] text-xs font-semibold border border-[#B3261E] text-[#B3261E] hover:bg-[#FDECEA] transition-colors disabled:opacity-50"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    <span>Tolak</span>
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 select-none">
                                  {staff.status === "aktif" ? "Terverifikasi" : "Telah Ditolak"}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Reveal>
        )}
      </main>
    </div>
  );
}
