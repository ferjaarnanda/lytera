"use client";

import React, { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
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
  FileCheck2,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Reveal } from "@/components/Reveal";
import {
  getAdminFacilityStaffAction,
  reviewFacilityStaffAction,
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
  const [actionLoading, setActionLoading] = useState(false);

  // Modal States
  const [approveModalStaff, setApproveModalStaff] = useState<StaffItem | null>(null);
  const [selectedRole, setSelectedRole] = useState<"dokter" | "petugas" | "apoteker">("dokter");
  const [selectedSpecIds, setSelectedSpecIds] = useState<string[]>([]);

  const [rejectModalStaff, setRejectModalStaff] = useState<StaffItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);

  const [viewDetailStaff, setViewDetailStaff] = useState<StaffItem | null>(null);

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

  // Buka modal persetujuan
  const openApproveModal = (staff: StaffItem) => {
    setApproveModalStaff(staff);
    setSelectedRole(staff.staff_role);
    // Default: pilih semua spesialisasi yang diajukan
    setSelectedSpecIds((staff.specializations || []).map((s) => s.id));
  };

  // Buka modal penolakan
  const openRejectModal = (staff: StaffItem) => {
    setRejectModalStaff(staff);
    setRejectionReason("");
    setReasonError(null);
  };

  // Submit persetujuan staf
  const handleApproveSubmit = async () => {
    if (!approveModalStaff) return;
    setActionLoading(true);
    setFeedbackMessage(null);

    try {
      const res = await reviewFacilityStaffAction({
        staffId: approveModalStaff.id,
        decision: "aktif",
        staffRole: selectedRole,
        verifiedSpecIds: selectedSpecIds,
      });

      if (!res.success) {
        setFeedbackMessage({
          type: "error",
          text: res.error || "Gagal menyetujui permohonan staf.",
        });
      } else {
        setFeedbackMessage({
          type: "success",
          text: res.message || "Permohonan staf berhasil disetujui.",
        });
        setApproveModalStaff(null);
        await loadData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedbackMessage({
        type: "error",
        text: "Kesalahan sistem: " + msg,
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Submit penolakan staf
  const handleRejectSubmit = async () => {
    if (!rejectModalStaff) return;
    if (!rejectionReason.trim()) {
      setReasonError("Alasan penolakan wajib diisi");
      return;
    }

    setActionLoading(true);
    setFeedbackMessage(null);

    try {
      const res = await reviewFacilityStaffAction({
        staffId: rejectModalStaff.id,
        decision: "ditolak",
        rejectionReason: rejectionReason.trim(),
      });

      if (!res.success) {
        setFeedbackMessage({
          type: "error",
          text: res.error || "Gagal menolak permohonan staf.",
        });
      } else {
        setFeedbackMessage({
          type: "success",
          text: res.message || "Permohonan staf telah ditolak.",
        });
        setRejectModalStaff(null);
        await loadData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedbackMessage({
        type: "error",
        text: "Kesalahan sistem: " + msg,
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle checklist spesialisasi
  const handleToggleSpec = (specId: string) => {
    if (selectedSpecIds.includes(specId)) {
      setSelectedSpecIds(selectedSpecIds.filter((id) => id !== specId));
    } else {
      setSelectedSpecIds([...selectedSpecIds, specId]);
    }
  };

  // Filter list
  const filteredStaff = staffList.filter((s) => {
    if (activeTab === "menunggu" && s.status !== "menunggu") return false;
    if (activeTab === "aktif" && s.status !== "aktif") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const name = s.profiles?.full_name?.toLowerCase() || "";
      const email = s.profiles?.email?.toLowerCase() || "";
      const role = s.staff_role.toLowerCase();
      const prof = s.profession?.toLowerCase() || "";
      const str = s.str_number?.toLowerCase() || "";
      const sip = s.sip_number?.toLowerCase() || "";
      const spec = s.specialization?.toLowerCase() || "";

      return (
        name.includes(q) ||
        email.includes(q) ||
        role.includes(q) ||
        prof.includes(q) ||
        str.includes(q) ||
        sip.includes(q) ||
        spec.includes(q)
      );
    }

    return true;
  });

  const countMenunggu = staffList.filter((s) => s.status === "menunggu").length;
  const countAktif = staffList.filter((s) => s.status === "aktif").length;

  const customNavItems = [
    { label: "Ringkasan", href: `/portal/${peran}/${subperan}` },
    { label: "Dokter & Petugas", href: `/portal/${peran}/${subperan}/staf` },
    { label: "Daftar Rujukan", href: `/portal/${peran}/${subperan}/rujukan` },
  ];

  return (
    <div className="min-h-screen text-[#464858]" data-navbar-tone="light" data-portal-wallpaper="true">
      <Navbar
        variant="admin-faskes"
        facilityName={facility?.name || `Fasilitas (${subRoleMeta?.name || ""})`}
        userName="Admin"
        userRole={facility?.name || "Fasilitas Kesehatan"}
        forceGlass={true}
        customMenuItems={customNavItems}
        activeItem="Dokter & Petugas"
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        {/* Indikator Fasilitas */}
        {facility && (
          <Reveal>
            <div className="mb-6 flex items-center justify-end">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EDF7F2] text-[#1B6B4D]">
                <span className="w-2 h-2 rounded-full bg-[#1B6B4D]" />
                {facility.name} ({facility.type})
              </span>
            </div>
          </Reveal>
        )}

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
                  Tinjau identitas, nomor izin (STR/SIP), tetapkan role staf, dan sahkan bidang spesialisasi klinis tenaga kesehatan sebelum mereka dapat berpraktik atau direkomendasikan oleh sistem Tetra.
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
                    placeholder="Cari nama, profesi, STR/SIP..."
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
                        <th className="py-3.5 px-4">Profesi & Peran</th>
                        <th className="py-3.5 px-4">No. STR / SIP</th>
                        <th className="py-3.5 px-4">Spesialisasi Klinis</th>
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

                            {/* Profesi & Peran */}
                            <td className="py-4 px-4">
                              <div className="font-medium text-[#0F3040] text-xs">
                                {staff.profession || "Tenaga Kesehatan"}
                              </div>
                              <div className="mt-1">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${roleCfg.bg} ${roleCfg.text}`}
                                >
                                  {roleCfg.icon}
                                  <span>{roleCfg.label}</span>
                                </span>
                              </div>
                            </td>

                            {/* No. STR / SIP */}
                            <td className="py-4 px-4 text-[#0F3040]">
                              {staff.str_number ? (
                                <div className="font-mono text-xs text-slate-700">
                                  <span className="text-[10px] text-slate-400 font-sans block">STR</span>
                                  {staff.str_number}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-xs">Tidak ada STR</span>
                              )}
                              {staff.sip_number && (
                                <div className="text-xs text-slate-700 font-mono mt-1">
                                  <span className="text-[10px] text-slate-400 font-sans block">SIP</span>
                                  {staff.sip_number}
                                </div>
                              )}
                            </td>

                            {/* Spesialisasi Klinis */}
                            <td className="py-4 px-4">
                              {staff.specializations && staff.specializations.length > 0 ? (
                                <div className="flex flex-wrap gap-1 max-w-[240px]">
                                  {staff.specializations.map((spec) => (
                                    <span
                                      key={spec.id}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-[11px] font-medium ${
                                        spec.is_verified
                                          ? "bg-[#EDF7F2] text-[#1B6B4D] border border-[#1B6B4D]/20"
                                          : "bg-slate-100 text-slate-600 border border-slate-200"
                                      }`}
                                    >
                                      {spec.is_verified && <Check className="w-3 h-3 text-[#1B6B4D]" />}
                                      <span>{spec.name}</span>
                                    </span>
                                  ))}
                                </div>
                              ) : staff.specialization ? (
                                <span className="text-xs text-slate-600">{staff.specialization}</span>
                              ) : (
                                <span className="text-xs text-slate-400 italic">Umum / Tidak ada</span>
                              )}
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
                                <div>
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FDECEA] text-[#B3261E]">
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Ditolak</span>
                                  </span>
                                  {staff.rejection_reason && (
                                    <button
                                      type="button"
                                      onClick={() => setViewDetailStaff(staff)}
                                      className="block text-[11px] text-[#B3261E] hover:underline mt-1 font-medium"
                                    >
                                      Lihat Alasan
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Aksi */}
                            <td className="py-4 px-4 sm:px-6 text-right">
                              {staff.status === "menunggu" ? (
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openApproveModal(staff)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[10px] text-xs font-semibold bg-[#1B6B4D] text-white hover:bg-[#14533C] transition-colors shadow-xs"
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span>Tinjau & Setujui</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => openRejectModal(staff)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[10px] text-xs font-semibold border border-[#B3261E] text-[#B3261E] hover:bg-[#FDECEA] transition-colors"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    <span>Tolak</span>
                                  </button>
                                </div>
                              ) : staff.status === "aktif" ? (
                                <button
                                  type="button"
                                  onClick={() => openApproveModal(staff)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[8px] text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                                >
                                  <FileCheck2 className="w-3.5 h-3.5 text-[#1B6B4D]" />
                                  <span>Ubah Otorisasi</span>
                                </button>
                              ) : (
                                <span className="text-xs text-slate-400 select-none">Telah Ditolak</span>
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

      {/* MODAL PERSETUJUAN & PENGESAHAN STAF */}
      {approveModalStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-[24px] border border-[#E2E8F0] shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#EDF7F2] flex items-center justify-center text-[#1B6B4D]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[#0F3040] text-base">Persetujuan & Pengesahan Staf</h3>
                  <p className="text-xs text-slate-500">Tetapkan role dan verifikasi spesialisasi</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApproveModalStaff(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body Modal */}
            <div className="p-6 space-y-5 text-xs sm:text-sm">
              {/* Ringkasan Profil */}
              <div className="p-3.5 rounded-[14px] bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="font-bold text-[#0F3040] text-sm">
                  {approveModalStaff.profiles?.full_name || "Nama Nakes"}
                </div>
                <div className="text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                  <span>Profesi: <strong>{approveModalStaff.profession || "-"}</strong></span>
                  <span>STR: <strong>{approveModalStaff.str_number || "-"}</strong></span>
                  {approveModalStaff.sip_number && (
                    <span>SIP: <strong>{approveModalStaff.sip_number}</strong></span>
                  )}
                </div>
              </div>

              {/* Penetapan Role Akses Final */}
              <div>
                <label className="block text-xs font-bold text-[#0F3040] mb-1.5">
                  Peran Akses Sistem (Role Final)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["dokter", "petugas", "apoteker"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSelectedRole(r)}
                      className={`p-2.5 rounded-[12px] border text-xs font-semibold capitalize flex flex-col items-center gap-1 transition-all ${
                        selectedRole === r
                          ? "border-[#1B6B4D] bg-[#EDF7F2] text-[#1B6B4D] shadow-xs"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span>{r}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Peran &quot;dokter&quot; memiliki wewenang membuat rujukan dan membuka rekam medis berizin.
                </p>
              </div>

              {/* Pengesahan Bidang Spesialisasi */}
              {approveModalStaff.specializations && approveModalStaff.specializations.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#0F3040]">
                      Pengesahan Bidang Spesialisasi
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Pilih yang disahkan (hanya spesialisasi terpilih yang akan tampil di Tetra)
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto border border-slate-200 rounded-[12px] p-2 bg-slate-50/50">
                    {approveModalStaff.specializations.map((spec) => {
                      const isChecked = selectedSpecIds.includes(spec.id);
                      return (
                        <label
                          key={spec.id}
                          className="flex items-center gap-2.5 p-2 rounded-[8px] hover:bg-white transition-colors cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSpec(spec.id)}
                            className="w-4 h-4 rounded text-[#1B6B4D] focus:ring-[#1B6B4D]"
                          />
                          <span className="text-xs font-medium text-[#0F3040]">{spec.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-[12px] bg-slate-50 text-xs text-slate-500">
                  Staf ini tidak mendaftarkan spesialisasi klinis tambahan (akan berpraktik sebagai dokter umum / tenaga umum).
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="p-4 sm:p-6 bg-slate-50 border-t border-[#E2E8F0] flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setApproveModalStaff(null)}
                className="px-4 py-2 rounded-[10px] text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleApproveSubmit}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-xs font-semibold bg-[#1B6B4D] text-white hover:bg-[#14533C] transition-colors shadow-xs disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Setujui & Sahkan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PENOLAKAN STAF */}
      {rejectModalStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-[24px] border border-[#E2E8F0] shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#FDECEA] flex items-center justify-center text-[#B3261E]">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[#0F3040] text-base">Tolak Permohonan Staf</h3>
                  <p className="text-xs text-slate-500">Wajib mencantumkan alasan penolakan</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalStaff(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body Modal */}
            <div className="p-6 space-y-4 text-xs sm:text-sm">
              <p className="text-xs text-slate-600">
                Anda akan menolak permohonan penempatan dari{" "}
                <strong>{rejectModalStaff.profiles?.full_name}</strong> ({rejectModalStaff.profession || "Tenaga Medis"}).
              </p>

              <div>
                <label className="block text-xs font-bold text-[#0F3040] mb-1.5">
                  Alasan Penolakan <span className="text-[#B3261E]">*</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => {
                    setRejectionReason(e.target.value);
                    if (reasonError) setReasonError(null);
                  }}
                  placeholder="Contoh: Dokumen STR/SIP tidak sesuai, kuota formasi staf penuh, dsb."
                  className={`w-full p-3 rounded-[12px] border text-xs outline-none focus:ring-2 ${
                    reasonError
                      ? "border-[#B3261E] focus:ring-[#B3261E]/20"
                      : "border-[#E2E8F0] focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E]"
                  }`}
                />
                {reasonError && (
                  <p className="text-[11px] text-[#B3261E] font-medium mt-1">{reasonError}</p>
                )}
                <p className="text-[11px] text-slate-400 mt-1">
                  Alasan penolakan ini akan dicatat dan transparan bagi pemohon.
                </p>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 sm:p-6 bg-slate-50 border-t border-[#E2E8F0] flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setRejectModalStaff(null)}
                className="px-4 py-2 rounded-[10px] text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleRejectSubmit}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-xs font-semibold bg-[#B3261E] text-white hover:bg-[#8F1D16] transition-colors shadow-xs disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Tolak Permohonan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LIHAT DETAIL ALASAN PENOLAKAN */}
      {viewDetailStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-[24px] border border-[#E2E8F0] shadow-xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#0F3040] text-sm">Alasan Penolakan Permohonan</h3>
              <button
                type="button"
                onClick={() => setViewDetailStaff(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-[12px] bg-[#FDECEA] border border-[#B3261E]/20 text-xs text-[#B3261E]">
              {viewDetailStaff.rejection_reason || "Tidak ada catatan alasan yang tersimpan."}
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={() => setViewDetailStaff(null)}
                className="px-4 py-1.5 rounded-[8px] bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
