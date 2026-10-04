"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  FileText,
  RotateCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  X,
  Eye,
  Check,
  Ban,
  CalendarCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  listReferralEventsAction,
  prosesRujukanAction,
  listDokterAction,
  type ReferralEventItem,
  type DokterOption,
} from "@/app/actions/rujukan";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { StatusIcon, StatusType } from "@/components/StatusIcon";
import { Navbar } from "@/components/Navbar";
import { Reveal } from "@/components/Reveal";

interface PageProps {
  params: Promise<{
    peran: string;
    subperan: string;
  }>;
}

interface ReferralRow {
  id: string;
  status: string;
  priority: string;
  poli: string;
  diagnosis_icd10: string;
  catatan_klinis: string;
  jadwal_pemeriksaan: string | null;
  created_at: string;
  patient_name: string;
  is_family: boolean;
  nik_masked: string | null;
  origin_name: string;
  destination_name: string;
  destination_doctor: string | null;
  created_by_name: string | null;
}

const BULAN_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Ags", "Sep", "Okt", "Nov", "Des",
];

function formatDateTimeIndo(isoString?: string | null): string {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return `${d.getDate()} ${BULAN_NAMES[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} WIB`;
  } catch {
    return isoString;
  }
}

export default function DaftarRujukanFaskesPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { peran, subperan } = resolvedParams;

  const isHospital = subperan === "rumah-sakit" || subperan === "rumah_sakit";
  const direction = isHospital ? "masuk" : "keluar";

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [facilityInfo, setFacilityInfo] = useState<{
    facilityId: string;
    facilityName: string;
    staffName: string;
    staffRole: string;
  } | null>(null);

  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  // Filter & Tab
  const [statusFilter, setStatusFilter] = useState<string>("semua");
  const [priorityTab, setPriorityTab] = useState<string>("semua"); // semua, gawat_darurat, urgent, elektif, jadwal_saya

  // Modal Detail & Aksi
  const [selectedReferral, setSelectedReferral] = useState<ReferralRow | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [events, setEvents] = useState<ReferralEventItem[]>([]);

  // State Aksi Rumah Sakit
  const [actionType, setActionType] = useState<"terima" | "tolak" | "jadwalkan" | "selesai" | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [actionSchedule, setActionSchedule] = useState("");
  const [selectedDoctorStaffId, setSelectedDoctorStaffId] = useState("");
  const [hospitalDoctors, setHospitalDoctors] = useState<DokterOption[]>([]);
  const [loadingActionDoctors, setLoadingActionDoctors] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // 1. Muat data rujukan
  useEffect(() => {
    let isCancelled = false;

    async function load() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const supabase = createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (isCancelled) return;
        if (!user) { router.replace("/"); return; }

        const { data: profile } = await supabase
          .from("profiles").select("full_name").eq("id", user.id).maybeSingle();

        const { data: staff, error: staffErr } = await supabase
          .from("facility_staff")
          .select("id, staff_role, status, facility_id, facilities(id, name)")
          .eq("profile_id", user.id)
          .maybeSingle();

        if (isCancelled) return;

        if (staffErr) { setErrorMsg("Gagal memverifikasi staf: " + staffErr.message); setLoading(false); return; }
        if (!staff || !staff.facility_id) { setErrorMsg("Akun belum terhubung ke faskes."); setLoading(false); return; }

        const facData = staff.facilities as unknown as { id: string; name: string } | null;
        const facId = staff.facility_id;
        setFacilityInfo({
          facilityId: facId,
          facilityName: facData?.name || "Fasilitas Kesehatan",
          staffName: profile?.full_name || "Tenaga Medis",
          staffRole: staff.staff_role,
        });

        // Ambil data rujukan via RPC list_facility_referrals
        const { data, error: refError } = await supabase.rpc("list_facility_referrals", {
          p_direction: direction,
        });

        if (isCancelled) return;

        if (refError) { setErrorMsg("Gagal memuat rujukan: " + refError.message); setLoading(false); return; }

        setReferrals(Array.isArray(data) ? (data as ReferralRow[]) : []);
      } catch (err: unknown) {
        if (!isCancelled) {
          setErrorMsg("Terjadi kendala saat memuat: " + (err instanceof Error ? err.message : String(err)));
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    load();
    return () => { isCancelled = true; };
  }, [router, reloadKey, direction]);

  // 2. Buka Detail & Ambil Timeline Events
  const openDetail = async (refItem: ReferralRow) => {
    setSelectedReferral(refItem);
    setActionType(null);
    setActionNotes("");
    setActionSchedule("");
    setSelectedDoctorStaffId("");
    setActionError(null);
    setLoadingEvents(true);

    const res = await listReferralEventsAction(refItem.id);
    setLoadingEvents(false);
    if (res.success && res.events) {
      setEvents(res.events);
    } else {
      setEvents([]);
    }

    // Jika RS dan ingin menjadwalkan, siapkan dokter
    if (isHospital && facilityInfo?.facilityId) {
      setLoadingActionDoctors(true);
      listDokterAction(facilityInfo.facilityId).then((dRes) => {
        setLoadingActionDoctors(false);
        if (dRes.success && dRes.results) {
          setHospitalDoctors(dRes.results);
        }
      });
    }
  };

  const closeDetail = () => {
    setSelectedReferral(null);
    setActionType(null);
    setEvents([]);
  };

  // 3. Eksekusi Aksi Rumah Sakit
  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReferral || !actionType) return;

    if (actionType === "tolak" && !actionNotes.trim()) {
      setActionError("Alasan penolakan rujukan wajib diisi.");
      return;
    }

    if (actionType === "jadwalkan" && !actionSchedule.trim()) {
      setActionError("Jadwal tanggal dan jam pemeriksaan wajib diisi.");
      return;
    }

    setProcessingAction(true);
    setActionError(null);

    const res = await prosesRujukanAction({
      referralId: selectedReferral.id,
      action: actionType,
      catatan: actionNotes.trim() || undefined,
      jadwalPemeriksaan: actionSchedule ? new Date(actionSchedule).toISOString() : undefined,
      destinationDoctorId: selectedDoctorStaffId ? selectedDoctorStaffId : undefined,
    });

    setProcessingAction(false);

    if (!res.success) {
      setActionError(res.error || "Gagal memproses rujukan.");
      return;
    }

    // Sukses: segarkan data dan tutup modal
    closeDetail();
    setReloadKey((k) => k + 1);
  };

  const handleRefresh = () => {
    setLoading(true);
    setErrorMsg(null);
    setReloadKey((k) => k + 1);
  };

  // Filter data sesuai Tab dan Status
  const filteredReferrals = referrals.filter((item) => {
    // Filter status
    if (statusFilter !== "semua" && item.status !== statusFilter) {
      return false;
    }

    // Filter tab prioritas / jadwal saya
    if (priorityTab === "jadwal_saya") {
      return item.status === "dijadwalkan";
    }
    if (priorityTab !== "semua") {
      return item.priority === priorityTab;
    }

    return true;
  }).sort((a, b) => {
    // Jika tab Jadwal Saya, urutkan berdasarkan jadwal_pemeriksaan terdekat
    if (priorityTab === "jadwal_saya" && a.jadwal_pemeriksaan && b.jadwal_pemeriksaan) {
      return new Date(a.jadwal_pemeriksaan).getTime() - new Date(b.jadwal_pemeriksaan).getTime();
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const renderStatus = (status: string) => {
    let iconStatus: StatusType = "proses";
    let label = "Diajukan";
    if (status === "diterima") { iconStatus = "selesai"; label = "Diterima"; }
    else if (status === "dijadwalkan") { iconStatus = "proses"; label = "Dijadwalkan"; }
    else if (status === "selesai") { iconStatus = "selesai"; label = "Selesai"; }
    else if (status === "ditolak") { iconStatus = "belum"; label = "Ditolak"; }
    return (
      <div className="inline-flex items-center gap-1.5">
        <StatusIcon status={iconStatus} size="sm" />
        <span className="text-xs font-semibold capitalize text-[#0F3040]">{label}</span>
      </div>
    );
  };

  const renderPriorityBadge = (priority: string) => {
    if (priority === "gawat_darurat") return <Badge variant="bahaya" showDot>Gawat Darurat</Badge>;
    if (priority === "urgent") return <Badge variant="proses" showDot>Urgent</Badge>;
    return <Badge variant="netral">Elektif</Badge>;
  };

  return (
    <div className="min-h-screen text-[#464858]" data-navbar-tone="light" data-portal-wallpaper="true">
      <Navbar
        variant="dokter-puskesmas"
        facilityName={facilityInfo?.facilityName}
        userName={facilityInfo?.staffName || "Tenaga Medis"}
        userRole={isHospital ? "Rumah Sakit" : "Fasilitas Tingkat 1"}
        forceGlass={true}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-20">
        {/* Navigasi Atas & Aksi */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            href={`/portal/${peran}/${subperan}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white transition-colors"
          >
            ← Kembali ke Portal {facilityInfo?.facilityName}
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              className="p-2 rounded-full border border-[#E2E8F0] bg-white text-[#0F3040] hover:bg-slate-50 transition-colors shadow-2xs"
              title="Segarkan data rujukan"
              aria-label="Segarkan data"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {!isHospital && (
              <Link
                href={`/portal/${peran}/${subperan}/rujukan/baru`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-[#8F5A4E] text-white hover:bg-[#A56F63] transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Rujukan Baru</span>
              </Link>
            )}
          </div>
        </div>

        {/* Header Rujukan */}
        <Reveal>
          <Card variant="white" className="p-6 sm:p-8 shadow-sm border border-[#E2E8F0] mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="info">{isHospital ? "Fasilitas Penerima" : "Faskes Pengirim"}</Badge>
                  <span className="text-xs text-slate-500 font-medium">{facilityInfo?.facilityName}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F3040] tracking-tight">
                  {isHospital ? "Daftar Rujukan Pasien Masuk" : "Daftar Rujukan Pasien Keluar"}
                </h1>
                <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                  {isHospital
                    ? "Kelola berkas rujukan masuk dari faskes primer. Verifikasi, tentukan jadwal pemeriksaan dokter spesialis, dan perbarui status tindakan."
                    : "Pantau seluruh berkas surat rujukan digital yang diterbitkan oleh faskes ini ke rumah sakit rujukan sekunder."}
                </p>
              </div>

              {/* Statistik Cepat */}
              <div className="flex items-center gap-4 bg-[#FAF5F2] px-5 py-3 rounded-[18px] border border-[#E2E8F0]">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase block">Total Rujukan</span>
                  <span className="text-2xl font-extrabold text-[#0F3040] tabular-nums">{referrals.length}</span>
                </div>
                <div className="w-px h-8 bg-[#E2E8F0]" />
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase block">Urgensi Tinggi</span>
                  <span className="text-2xl font-extrabold text-[#B3261E] tabular-nums">
                    {referrals.filter((r) => r.priority === "gawat_darurat" || r.priority === "urgent").length}
                  </span>
                </div>
              </div>
            </div>

            {/* Tab Prioritas (Khusus Rumah Sakit) */}
            {isHospital && (
              <div className="mt-6 pt-5 border-t border-[#E2E8F0] flex flex-wrap gap-2">
                {[
                  { id: "semua", label: "Semua Rujukan" },
                  { id: "gawat_darurat", label: "Gawat Darurat" },
                  { id: "urgent", label: "Urgent" },
                  { id: "elektif", label: "Elektif" },
                  { id: "jadwal_saya", label: "Jadwal Pemeriksaan Terdekat" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPriorityTab(tab.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      priorityTab === tab.id
                        ? "bg-[#0F3040] text-white shadow-2xs"
                        : "bg-[#F8FAFC] text-slate-600 hover:bg-[#E2E8F0]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* Filter Status */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 mr-1">Status:</span>
              {[
                { id: "semua", label: "Semua" },
                { id: "diajukan", label: "Diajukan" },
                { id: "diterima", label: "Diterima" },
                { id: "dijadwalkan", label: "Dijadwalkan" },
                { id: "selesai", label: "Selesai" },
                { id: "ditolak", label: "Ditolak" },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStatusFilter(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    statusFilter === s.id
                      ? "bg-[#8F5A4E] text-white"
                      : "bg-white text-slate-600 border border-[#E2E8F0] hover:bg-slate-50"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </Card>
        </Reveal>

        {/* Galat jika gagal muat */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-[16px] bg-[#FDECEA] border border-[#B3261E]/20 text-[#B3261E] text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Gagal Memuat Rujukan</p>
              <p className="text-xs mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Konten Utama */}
        {loading ? (
          <Card variant="white" className="p-12 text-center shadow-sm border border-[#E2E8F0]">
            <Loader2 className="w-8 h-8 text-[#8F5A4E] animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#0F3040]">Memuat data rujukan faskes...</p>
          </Card>
        ) : filteredReferrals.length === 0 ? (
          <Reveal delayMs={100}>
            <Card variant="white" className="p-10 sm:p-14 text-center shadow-sm border border-[#E2E8F0]">
              <div className="w-14 h-14 rounded-2xl bg-[#FAF5F2] flex items-center justify-center text-[#8F5A4E] mx-auto mb-4 border border-[#E2E8F0]">
                <FileText className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-[#0F3040]">Tidak Ada Data Rujukan</h2>
              <p className="text-sm text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
                Tidak ada rujukan yang cocok dengan kriteria filter saat ini.
              </p>
            </Card>
          </Reveal>
        ) : (
          <Reveal delayMs={100}>
            <Card variant="white" className="shadow-sm border border-[#E2E8F0] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#FAF5F2] border-b border-[#E2E8F0] text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4 sm:px-6">Pasien</th>
                      <th className="py-3.5 px-4">{isHospital ? "Asal Faskes & Poli" : "Rumah Sakit & Poli"}</th>
                      <th className="py-3.5 px-4">Prioritas</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Diagnosis ICD-10</th>
                      <th className="py-3.5 px-4">Jadwal / Tanggal</th>
                      <th className="py-3.5 px-4 sm:px-6 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-xs">
                    {filteredReferrals.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-4 sm:px-6">
                          <span className="font-bold text-[#0F3040] block">{item.patient_name}</span>
                          <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                            NIK: {item.nik_masked ?? "-"}
                          </span>
                          {item.is_family && (
                            <Badge variant="info" className="mt-1">Anggota Keluarga</Badge>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          <span className="font-semibold text-[#0F3040] block">
                            {isHospital ? item.origin_name : item.destination_name}
                          </span>
                          <span className="text-[11px] text-[#8F5A4E] font-medium block">{item.poli}</span>
                          {item.destination_doctor && (
                            <span className="text-[10px] text-slate-400 block">{item.destination_doctor}</span>
                          )}
                        </td>

                        <td className="py-4 px-4">{renderPriorityBadge(item.priority)}</td>

                        <td className="py-4 px-4">{renderStatus(item.status)}</td>

                        <td className="py-4 px-4 max-w-[200px]">
                          <span className="font-semibold text-[#0F3040] block font-mono">{item.diagnosis_icd10}</span>
                          <span className="text-[11px] text-slate-500 block truncate" title={item.catatan_klinis}>
                            {item.catatan_klinis}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-slate-500 whitespace-nowrap">
                          {item.jadwal_pemeriksaan ? (
                            <div>
                              <span className="font-semibold text-[#16A34A] block flex items-center gap-1">
                                <CalendarCheck className="w-3 h-3" />
                                {formatDateTimeIndo(item.jadwal_pemeriksaan)}
                              </span>
                              <span className="text-[10px] text-slate-400">Jadwal Periksa</span>
                            </div>
                          ) : (
                            <span>{formatDateTimeIndo(item.created_at)}</span>
                          )}
                        </td>

                        <td className="py-4 px-4 sm:px-6 text-right">
                          <button
                            type="button"
                            onClick={() => openDetail(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F3040] text-white text-xs font-semibold hover:bg-[#0A2230] transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Detail</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </Reveal>
        )}

        {/* ── MODAL PANEL DETAIL & TIMELINE ── */}
        {selectedReferral && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-[24px] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-[#E2E8F0]">
              {/* Header Modal */}
              <div className="flex items-start justify-between pb-4 border-b border-[#E2E8F0]">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="info">Surat Rujukan Digital</Badge>
                    {renderPriorityBadge(selectedReferral.priority)}
                    {renderStatus(selectedReferral.status)}
                  </div>
                  <h2 className="text-xl font-bold text-[#0F3040] mt-2">
                    {selectedReferral.patient_name}
                  </h2>
                  <p className="text-xs text-slate-500 font-mono">
                    NIK: {selectedReferral.nik_masked} {selectedReferral.is_family && "(Anggota Keluarga)"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeDetail}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Data Detail Klinis */}
              <div className="py-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-[#FAF5F2] p-3 rounded-xl">
                  <span className="text-slate-400 block mb-0.5">Faskes Pengirim</span>
                  <span className="font-semibold text-[#0F3040] text-sm">{selectedReferral.origin_name}</span>
                  <span className="text-[11px] text-slate-500 block mt-1">
                    Dibuat oleh: {selectedReferral.created_by_name || "Dokter"}
                  </span>
                </div>

                <div className="bg-[#FAF5F2] p-3 rounded-xl">
                  <span className="text-slate-400 block mb-0.5">Rumah Sakit Tujuan</span>
                  <span className="font-semibold text-[#0F3040] text-sm">{selectedReferral.destination_name}</span>
                  <span className="text-[11px] text-[#8F5A4E] font-medium block mt-1">
                    {selectedReferral.poli}
                  </span>
                  {selectedReferral.destination_doctor && (
                    <span className="text-[11px] text-slate-600 block mt-0.5">
                      Dokter: {selectedReferral.destination_doctor}
                    </span>
                  )}
                </div>

                <div className="sm:col-span-2 bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
                  <span className="text-slate-400 block mb-1">Diagnosis ICD-10 &amp; Catatan Klinis</span>
                  <p className="font-mono font-bold text-[#0F3040] text-sm mb-1">{selectedReferral.diagnosis_icd10}</p>
                  <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-wrap">
                    {selectedReferral.catatan_klinis}
                  </p>
                </div>

                {selectedReferral.jadwal_pemeriksaan && (
                  <div className="sm:col-span-2 bg-[#F0FDF4] p-3 rounded-xl border border-[#D1FAE5]">
                    <span className="text-[#16A34A] font-semibold block mb-0.5 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Jadwal Pemeriksaan Ditetapkan:
                    </span>
                    <span className="text-sm font-bold text-[#0F3040]">
                      {formatDateTimeIndo(selectedReferral.jadwal_pemeriksaan)}
                    </span>
                  </div>
                )}
              </div>

              {/* Timeline Riwayat Event */}
              <div className="pt-2 pb-4 border-t border-[#E2E8F0]">
                <h3 className="text-xs font-bold text-[#0F3040] uppercase tracking-wider mb-3">
                  Linimasa Perjalanan Rujukan
                </h3>

                {loadingEvents ? (
                  <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#8F5A4E]" />
                    Memuat riwayat linimasa...
                  </div>
                ) : events.length === 0 ? (
                  <p className="text-xs text-slate-400">Belum ada riwayat aktivitas.</p>
                ) : (
                  <div className="relative pl-5 border-l-2 border-[#E2E8F0] space-y-4">
                    {events.map((ev) => (
                      <div key={ev.id} className="relative">
                        <div className="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full bg-[#8F5A4E] border-2 border-white" />
                        <div className="text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#0F3040] capitalize">{ev.status}</span>
                            <span className="text-[10px] text-slate-400">{formatDateTimeIndo(ev.created_at)}</span>
                          </div>
                          <p className="text-slate-600 mt-0.5">{ev.catatan}</p>
                          {ev.actor_name && (
                            <span className="text-[10px] text-slate-400 block mt-0.5">Oleh: {ev.actor_name}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── FORM AKSI RUMAH SAKIT ── */}
              {isHospital && (
                <div className="pt-4 border-t border-[#E2E8F0]">
                  {!actionType ? (
                    <div className="flex flex-wrap gap-2 justify-end">
                      {selectedReferral.status === "diajukan" && (
                        <>
                          <button
                            type="button"
                            onClick={() => { setActionType("tolak"); setActionNotes(""); setActionError(null); }}
                            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#FDECEA] text-[#B3261E] hover:bg-[#FCD8D4] transition-colors inline-flex items-center gap-1.5"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            Tolak Rujukan
                          </button>
                          <button
                            type="button"
                            onClick={() => { setActionType("terima"); setActionNotes(""); setActionError(null); }}
                            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#EDF7F2] text-[#1B6B4D] hover:bg-[#D8F0E4] transition-colors inline-flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Terima Rujukan
                          </button>
                        </>
                      )}

                      {selectedReferral.status === "diterima" && (
                        <>
                          <button
                            type="button"
                            onClick={() => { setActionType("tolak"); setActionNotes(""); setActionError(null); }}
                            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#FDECEA] text-[#B3261E] hover:bg-[#FCD8D4] transition-colors inline-flex items-center gap-1.5"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            Batalkan / Tolak
                          </button>
                          <button
                            type="button"
                            onClick={() => { setActionType("jadwalkan"); setActionNotes(""); setActionError(null); }}
                            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#0F3040] text-white hover:bg-[#0A2230] transition-colors inline-flex items-center gap-1.5"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            Jadwalkan Pemeriksaan
                          </button>
                        </>
                      )}

                      {selectedReferral.status === "dijadwalkan" && (
                        <button
                          type="button"
                          onClick={() => { setActionType("selesai"); setActionNotes(""); setActionError(null); }}
                          className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#16A34A] text-white hover:bg-[#15803D] transition-colors inline-flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Tandai Selesai Diperiksa
                        </button>
                      )}
                    </div>
                  ) : (
                    <form onSubmit={handleExecuteAction} className="bg-[#FAF5F2] p-4 rounded-2xl border border-[#E2E8F0]">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-[#0F3040] uppercase tracking-wider">
                          Konfirmasi: {actionType === "terima" ? "Terima Rujukan" : actionType === "tolak" ? "Tolak Rujukan" : actionType === "jadwalkan" ? "Jadwalkan Pemeriksaan" : "Selesaikan Pemeriksaan"}
                        </h4>
                        <button
                          type="button"
                          onClick={() => setActionType(null)}
                          className="text-xs text-slate-500 hover:underline"
                        >
                          Batal
                        </button>
                      </div>

                      {/* Input Jadwal jika Jadwalkan */}
                      {actionType === "jadwalkan" && (
                        <div className="space-y-3 mb-3">
                          <div>
                            <label className="block text-xs font-semibold text-[#0F3040] mb-1">
                              Tanggal &amp; Waktu Pemeriksaan <span className="text-[#B3261E]">*</span>
                            </label>
                            <input
                              type="datetime-local"
                              value={actionSchedule}
                              onChange={(e) => setActionSchedule(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs text-[#0F3040] focus:outline-none focus:ring-2 focus:ring-[#8F5A4E]"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-[#0F3040] mb-1">
                              Tugaskan Dokter Spesialis <span className="text-slate-400 font-normal">(opsional)</span>
                            </label>
                            {loadingActionDoctors ? (
                              <p className="text-xs text-slate-400">Memuat dokter...</p>
                            ) : (
                              <select
                                value={selectedDoctorStaffId}
                                onChange={(e) => setSelectedDoctorStaffId(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs text-[#0F3040] focus:outline-none focus:ring-2 focus:ring-[#8F5A4E]"
                              >
                                <option value="">Tanpa penugasan dokter tertentu</option>
                                {hospitalDoctors.map((doc) => (
                                  <option key={doc.staff_id} value={doc.staff_id}>
                                    {doc.full_name}{doc.specialization ? ` (${doc.specialization})` : ""}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Input Catatan */}
                      <div className="mb-3">
                        <label className="block text-xs font-semibold text-[#0F3040] mb-1">
                          Catatan / Alasan {actionType === "tolak" && <span className="text-[#B3261E]">* (wajib)</span>}
                        </label>
                        <textarea
                          rows={2}
                          value={actionNotes}
                          onChange={(e) => setActionNotes(e.target.value)}
                          placeholder={
                            actionType === "tolak"
                              ? "Berikan alasan penolakan rujukan..."
                              : actionType === "jadwalkan"
                              ? "Petunjuk kedatangan pasien (cth: bawa kartu BPJS/KTP)..."
                              : "Catatan tindakan..."
                          }
                          className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs text-[#0F3040] focus:outline-none focus:ring-2 focus:ring-[#8F5A4E] resize-none"
                        />
                      </div>

                      {actionError && (
                        <p className="text-xs text-[#B3261E] mb-2">{actionError}</p>
                      )}

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setActionType(null)}
                          className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          disabled={processingAction}
                          className="px-4 py-1.5 rounded-lg bg-[#0F3040] text-white text-xs font-semibold hover:bg-[#0A2230] disabled:opacity-50 inline-flex items-center gap-1.5"
                        >
                          {processingAction && <Loader2 className="w-3 h-3 animate-spin" />}
                          Simpan Keputusan
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
