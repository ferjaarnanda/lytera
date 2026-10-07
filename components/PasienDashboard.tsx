"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
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
  Eye,
  ChevronDown,
  ChevronUp,
  Loader2,
  CalendarCheck,
  Key,
  Stethoscope,
  XCircle,
  CheckCircle2,
  Lock,
  History,
  Activity,
  ShieldAlert,
  ShieldOff,
  CreditCard,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardInner } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { StatusIcon } from "@/components/StatusIcon";
import { LogoutButton } from "@/components/LogoutButton";
import { Navbar } from "@/components/Navbar";
import { Reveal } from "@/components/Reveal";
import { PenjaminVerifikasiSection } from "@/components/PenjaminVerifikasiSection";
import {
  listMyReferralsAction,
  listMyLookupLogsAction,
  listReferralEventsAction,
  MyReferralItem,
  LookupLogItem,
  ReferralEventItem,
} from "@/app/actions/rujukan";
import {
  createPatientAccessTokenAction,
  getMyActiveTokenStatusAction,
  revokePatientAccessTokenAction,
  listMyMedicalRecordsAction,
  listMyAccessAuditLogsAction,
  TokenStatus,
  MedicalRecordItem,
  AccessAuditLogItem,
} from "@/app/actions/rekam-medis";

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
  payer_type?: "bpjs" | "asuransi" | "mandiri" | "jaminan_daerah" | null;
  insurance_name?: string | null;
  insurance_policy_number?: string | null;
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
  payer_type?: "bpjs" | "asuransi" | "mandiri" | "jaminan_daerah" | null;
  insurance_name?: string | null;
  insurance_policy_number?: string | null;
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

function formatDateTimeIndo(dtStr?: string | null): string {
  if (!dtStr) return "-";
  const d = new Date(dtStr);
  if (isNaN(d.getTime())) return dtStr;
  const tgl = `${d.getDate()} ${BULAN_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  const jam = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  return `${tgl}, ${jam}`;
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

// Warna badge status
const STATUS_BADGE: Record<string, "selesai" | "proses" | "bahaya" | "info"> = {
  diajukan: "proses",
  diterima: "info",
  dijadwalkan: "info",
  selesai: "selesai",
  ditolak: "bahaya",
};

const STATUS_LABEL: Record<string, string> = {
  diajukan: "Diajukan",
  diterima: "Diterima",
  dijadwalkan: "Dijadwalkan",
  selesai: "Selesai",
  ditolak: "Ditolak",
};

const PRIORITY_BADGE: Record<string, "bahaya" | "proses" | "info"> = {
  gawat_darurat: "bahaya",
  urgent: "proses",
  elektif: "info",
};

const PRIORITY_LABEL: Record<string, string> = {
  gawat_darurat: "Gawat Darurat",
  urgent: "Urgent",
  elektif: "Elektif",
};

function isRujukanAktif(status: string): boolean {
  return ["diajukan", "diterima", "dijadwalkan"].includes(status);
}

// ──────────────────────────────────────────────────────────────────────────────
// Sub-Komponen: Kartu Satu Rujukan
// ──────────────────────────────────────────────────────────────────────────────

function RujukanCard({ item, defaultOpen = false }: { item: MyReferralItem; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [events, setEvents] = useState<ReferralEventItem[] | null>(null);
  const fetchingRef = useRef(false);

  const statusVariant = STATUS_BADGE[item.status] ?? "info";
  const priorityVariant = PRIORITY_BADGE[item.priority] ?? "info";

  // loadingEvents: true jika sedang mengambil (null = belum) dan belum selesai
  const loadingEvents = open && events === null;

  useEffect(() => {
    if (open && events === null && !fetchingRef.current) {
      fetchingRef.current = true;
      listReferralEventsAction(item.id)
        .then((res) => {
          setEvents(res.success && res.events ? res.events : []);
        })
        .catch(() => setEvents([]))
        .finally(() => { fetchingRef.current = false; });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item.id]);

  return (
    <CardInner
      variant="cream"
      className="rounded-[18px] border border-[#E2E8F0] overflow-hidden"
    >
      {/* Header baris ringkasan */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-start gap-3 min-w-0">
          <StatusIcon
            status={
              item.status === "selesai"
                ? "selesai"
                : item.status === "ditolak"
                ? "error"
                : "proses"
            }
            size="md"
            className="shrink-0 mt-0.5"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
              <Badge variant={statusVariant} showDot>
                {STATUS_LABEL[item.status] ?? item.status}
              </Badge>
              <Badge variant={priorityVariant}>
                {PRIORITY_LABEL[item.priority] ?? item.priority}
              </Badge>
              {item.is_family && (
                <Badge variant="info">Untuk: {item.subject_name}</Badge>
              )}
            </div>
            <span className="text-sm font-bold text-[#0F3040] block truncate">
              {item.destination_name}
            </span>
            <span className="text-xs text-slate-500">
              Dari: {item.origin_name} · {formatDateIndo(item.created_at)}
            </span>
          </div>
        </div>
        <div className="shrink-0 text-slate-400">
          {open ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>

      {/* Detail expandable */}
      {open && (
        <div className="px-5 pb-5 border-t border-[#E2E8F0]/70 pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-[11px] text-slate-500 uppercase tracking-wide block">
                Poli Tujuan
              </span>
              <span className="font-semibold text-[#0F3040]">
                {item.poli || "-"}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 uppercase tracking-wide block">
                Dokter Tujuan
              </span>
              <span className="font-semibold text-[#0F3040]">
                {item.destination_doctor || "Tanpa dokter tertentu"}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 uppercase tracking-wide block">
                Diagnosis (ICD-10)
              </span>
              <span className="font-semibold text-[#0F3040]">
                {item.diagnosis_icd10 || "-"}
              </span>
            </div>
            {item.jadwal_pemeriksaan && (
              <div>
                <span className="text-[11px] text-slate-500 uppercase tracking-wide block">
                  Jadwal Pemeriksaan
                </span>
                <span className="font-semibold text-[#16A34A] flex items-center gap-1.5">
                  <CalendarCheck className="w-3.5 h-3.5" />
                  {formatDateTimeIndo(item.jadwal_pemeriksaan)}
                </span>
              </div>
            )}
          </div>

          {/* Linimasa / Timeline Rujukan */}
          <div className="pt-3 border-t border-[#E2E8F0]/70">
            <span className="text-[11px] font-bold text-[#0F3040] uppercase tracking-wider block mb-2.5">
              Linimasa & Riwayat Perkembangan
            </span>

            {loadingEvents ? (
              <div className="py-2.5 flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0F3040]" />
                <span>Memuat riwayat linimasa rujukan...</span>
              </div>
            ) : !events || events.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Belum ada catatan aktivitas.</p>
            ) : (
              <div className="relative pl-4 space-y-3 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E2E8F0]">
                {events.map((ev, idx) => (
                  <div key={ev.id || idx} className="relative flex items-start gap-2.5 text-xs">
                    <div className="absolute -left-4 top-1 w-2.5 h-2.5 rounded-full bg-[#0F3040] border-2 border-white ring-1 ring-[#0F3040]/30 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[#0F3040] capitalize">{ev.status}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{formatDateTimeIndo(ev.created_at)}</span>
                      </div>
                      {ev.catatan && <p className="text-slate-600 mt-0.5 leading-relaxed">{ev.catatan}</p>}
                      {ev.actor_name && (
                        <span className="text-[10px] text-slate-400 block mt-0.5">Oleh: {ev.actor_name}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </CardInner>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Sub-Komponen: Kartu Izin Akses Token (Tahap 4b)
// ──────────────────────────────────────────────────────────────────────────────

const ACCESS_RESULT_LABEL: Record<string, { label: string; variant: "selesai" | "bahaya" | "proses" | "info" }> = {
  berhasil:           { label: "Berhasil Dibuka", variant: "selesai" },
  token_salah:        { label: "Token Salah", variant: "bahaya" },
  token_kedaluwarsa:  { label: "Token Kedaluwarsa", variant: "bahaya" },
  token_dicabut:      { label: "Token Dicabut", variant: "bahaya" },
  token_terkunci:     { label: "Token Terkunci", variant: "bahaya" },
  tanpa_token:        { label: "Tanpa Token", variant: "proses" },
};

function KartuIzinAkses() {
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Kode mentah HANYA ada di memori, hilang saat komponen unmount/refresh
  const [shownCode, setShownCode] = useState<string | null>(null);
  const [shownExpiresAt, setShownExpiresAt] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    setStatusError(null);
    const res = await getMyActiveTokenStatusAction();
    setLoadingStatus(false);
    if (res.success && res.status) {
      setTokenStatus(res.status);
    } else {
      setStatusError(res.error ?? "Gagal memuat status token.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadStatus();
  }, [loadStatus]);

  // Hitung mundur setelah token dibuat
  useEffect(() => {
    if (shownExpiresAt) {
      const tick = () => {
        const sisa = Math.max(0, Math.floor((new Date(shownExpiresAt).getTime() - Date.now()) / 1000));
        setCountdown(sisa);
        if (sisa <= 0 && countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
          setShownCode(null);
          loadStatus();
        }
      };
      tick();
      countdownRef.current = setInterval(tick, 1000);
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [shownExpiresAt, loadStatus]);

  const handleCreate = async () => {
    setCreating(true);
    setCreateError(null);
    setShownCode(null);
    setShownExpiresAt(null);
    const res = await createPatientAccessTokenAction();
    setCreating(false);
    if (res.success && res.token_code) {
      setShownCode(res.token_code);
      setShownExpiresAt(res.expires_at ?? null);
      await loadStatus();
    } else {
      setCreateError(res.error ?? "Gagal membuat kode izin.");
    }
  };

  const handleRevoke = async () => {
    if (!confirmRevoke) { setConfirmRevoke(true); return; }
    setRevoking(true);
    setRevokeError(null);
    const res = await revokePatientAccessTokenAction();
    setRevoking(false);
    setConfirmRevoke(false);
    if (res.success) {
      setShownCode(null);
      setShownExpiresAt(null);
      if (countdownRef.current) clearInterval(countdownRef.current);
      await loadStatus();
    } else {
      setRevokeError(res.error ?? "Gagal mencabut token.");
    }
  };

  const secsLeft = countdown % 60;
  const hasActive = tokenStatus?.has_active_token && !tokenStatus.is_expired && !tokenStatus.is_revoked && !tokenStatus.is_locked;

  return (
    <Card variant="white" className="p-6 sm:p-8 shadow-sm border border-[#E2E8F0]">
      <div className="flex items-center gap-3 pb-4 mb-6 border-b border-[#E2E8F0]">
        <div className="w-10 h-10 rounded-2xl bg-[#EDF7F2] flex items-center justify-center text-[#1B6B4D] shrink-0">
          <Key className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#0F3040]">Kode Izin Akses Rekam Medis</h2>
          <p className="text-xs text-slate-500">
            Berikan kode 6-digit ini kepada dokter di faskes tujuan agar dapat membuka rekam medis Anda. Berlaku 60 menit.
          </p>
        </div>
      </div>

      {/* Tampilkan kode yang baru dibuat — SEKALI saja */}
      {shownCode && countdown > 0 && (
        <div className="mb-6 p-5 rounded-[18px] bg-[#EDF7F2] border border-[#A8D5BD] flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-[#1B6B4D]">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-semibold">Kode Izin Berhasil Dibuat</span>
          </div>
          <div className="font-mono text-4xl font-extrabold tracking-[0.25em] text-[#0F3040] select-all">
            {shownCode}
          </div>
          <div className="text-xs text-[#1B6B4D] font-medium">
            Berlaku{" "}
            <span className="font-mono font-bold">
              {String(Math.floor(countdown / 60)).padStart(2, "0")}:{String(secsLeft).padStart(2, "0")}
            </span>{" "}
            menit lagi
          </div>
          <p className="text-[11px] text-slate-500 text-center max-w-xs">
            Kode ini tidak akan ditampilkan kembali setelah halaman ditutup atau dimuat ulang. Tunjukkan langsung ke dokter.
          </p>
        </div>
      )}

      {loadingStatus ? (
        <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Memeriksa status token...</span>
        </div>
      ) : statusError ? (
        <div className="flex items-center gap-2 text-[#B3261E] text-sm mb-4">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{statusError}</span>
        </div>
      ) : tokenStatus ? (
        <div className="mb-5">
          {/* Status badge token */}
          {tokenStatus.is_locked ? (
            <CardInner variant="cream" className="p-4 rounded-[14px] border border-[#E2E8F0] flex items-center gap-3">
              <Lock className="w-5 h-5 text-[#B3261E] shrink-0" />
              <div>
                <p className="text-sm font-bold text-[#B3261E]">Token Terkunci</p>
                <p className="text-xs text-slate-500">
                  Token dikunci karena terlalu banyak percobaan kode salah. Buat token baru untuk melanjutkan.
                </p>
              </div>
            </CardInner>
          ) : tokenStatus.is_revoked ? (
            <CardInner variant="cream" className="p-4 rounded-[14px] border border-[#E2E8F0] flex items-center gap-3">
              <ShieldOff className="w-5 h-5 text-slate-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-slate-600">Token Dicabut</p>
                <p className="text-xs text-slate-500">Token terakhir telah Anda cabut. Buat token baru jika diperlukan.</p>
              </div>
            </CardInner>
          ) : tokenStatus.is_expired ? (
            <CardInner variant="cream" className="p-4 rounded-[14px] border border-[#E2E8F0] flex items-center gap-3">
              <Clock className="w-5 h-5 text-slate-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-slate-600">Token Kedaluwarsa</p>
                <p className="text-xs text-slate-500">Token terakhir sudah melewati batas waktu 60 menit. Buat baru jika diperlukan.</p>
              </div>
            </CardInner>
          ) : hasActive ? (
            <CardInner variant="cream" className="p-4 rounded-[14px] border border-[#A8D5BD] bg-[#EDF7F2] flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-[#1B6B4D] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#1B6B4D]">Token Aktif</p>
                <p className="text-xs text-slate-600">
                  Sisa waktu:{" "}
                  <span className="font-mono font-semibold">
                    {tokenStatus.seconds_remaining != null
                      ? `${Math.floor(tokenStatus.seconds_remaining / 60)} menit ${tokenStatus.seconds_remaining % 60} detik`
                      : "-"}
                  </span>
                </p>
              </div>
            </CardInner>
          ) : (
            <CardInner variant="cream" className="p-4 rounded-[14px] border border-[#E2E8F0] flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-slate-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-slate-600">Belum Ada Token Aktif</p>
                <p className="text-xs text-slate-500">Buat kode izin untuk mengizinkan dokter membuka rekam medis Anda.</p>
              </div>
            </CardInner>
          )}
        </div>
      ) : null}

      {/* Error */}
      {createError && (
        <div className="flex items-center gap-2 text-[#B3261E] text-sm mb-4">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{createError}</span>
        </div>
      )}
      {revokeError && (
        <div className="flex items-center gap-2 text-[#B3261E] text-sm mb-4">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{revokeError}</span>
        </div>
      )}

      {/* Tombol aksi */}
      <div className="flex flex-wrap items-center gap-3 mt-2">
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating || loadingStatus}
          className="px-5 py-2.5 rounded-full bg-[#0F3040] text-white text-sm font-semibold hover:bg-[#0A2230] disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
          {creating ? "Membuat..." : hasActive ? "Perbarui Kode Izin" : "Buat Kode Izin"}
        </button>

        {(hasActive || (shownCode && countdown > 0)) && (
          confirmRevoke ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#B3261E] font-semibold">Cabut sekarang?</span>
              <button
                type="button"
                onClick={handleRevoke}
                disabled={revoking}
                className="px-4 py-2 rounded-full bg-[#B3261E] text-white text-xs font-semibold hover:bg-[#8B1C14] transition-colors inline-flex items-center gap-1.5"
              >
                {revoking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                Ya, Cabut
              </button>
              <button
                type="button"
                onClick={() => setConfirmRevoke(false)}
                className="px-4 py-2 rounded-full border border-[#E2E8F0] text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmRevoke(true)}
              className="px-5 py-2.5 rounded-full border border-[#E2E8F0] text-sm font-semibold text-slate-700 hover:bg-[#FDECEA] hover:text-[#B3261E] hover:border-[#B3261E]/30 transition-colors inline-flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Cabut Izin
            </button>
          )
        )}
      </div>

      <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
        Sistem mencatat setiap percobaan akses. Setelah 5 kali percobaan kode salah, token akan terkunci otomatis.
        Anda dapat membuat token baru kapan saja; token lama akan dicabut otomatis.
      </p>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Sub-Komponen: Kartu Riwayat Rekam Medis (Tahap 4b)
// ──────────────────────────────────────────────────────────────────────────────

function KartuRiwayatMedis() {
  const [records, setRecords] = useState<MedicalRecordItem[] | null>(null);
  const [auditLogs, setAuditLogs] = useState<AccessAuditLogItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"kunjungan" | "log-akses">("kunjungan");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const [recRes, logRes] = await Promise.all([
        listMyMedicalRecordsAction(),
        listMyAccessAuditLogsAction(),
      ]);
      if (cancelled) return;
      setLoading(false);
      if (recRes.success) setRecords(recRes.records ?? []);
      else setError(recRes.error ?? "Gagal memuat riwayat.");
      if (logRes.success) setAuditLogs(logRes.logs ?? []);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      {/* Sub-tab */}
      <div className="flex items-center gap-2">
        {(["kunjungan", "log-akses"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveSubTab(tab)}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
              activeSubTab === tab
                ? "bg-[#0F3040] text-white shadow-2xs"
                : "bg-white text-slate-600 border border-[#E2E8F0] hover:bg-slate-50"
            }`}
          >
            {tab === "kunjungan" ? (
              <span className="flex items-center gap-1.5"><Stethoscope className="w-3.5 h-3.5" />Kunjungan Medis</span>
            ) : (
              <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" />Log Akses Rekam Medis</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <Card variant="white" className="p-8 flex items-center gap-3 text-slate-400 border border-[#E2E8F0]">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Memuat data...</span>
        </Card>
      ) : error ? (
        <Card variant="white" className="p-6 border border-[#E2E8F0]">
          <div className="flex items-center gap-2 text-[#B3261E] text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        </Card>
      ) : activeSubTab === "kunjungan" ? (
        <Card variant="white" className="p-6 sm:p-8 shadow-sm border border-[#E2E8F0]">
          <div className="flex items-center gap-3 pb-4 mb-6 border-b border-[#E2E8F0]">
            <div className="w-10 h-10 rounded-2xl bg-[#FAF5F2] flex items-center justify-center text-[#8F5A4E] shrink-0">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0F3040]">Riwayat Kunjungan Medis</h2>
              <p className="text-xs text-slate-500">Catatan kunjungan dan diagnosis yang dicatat dokter di fasilitas kesehatan.</p>
            </div>
            {records && records.length > 0 && (
              <span className="ml-auto text-xs font-semibold bg-[#FAF5F2] text-[#8F5A4E] px-3 py-1 rounded-full border border-[#E2E8F0]">
                {records.length} kunjungan
              </span>
            )}
          </div>

          {records && records.length > 0 ? (
            <div className="space-y-3">
              {records.map((rec) => (
                <CardInner
                  key={rec.id}
                  variant="cream"
                  className="p-4 rounded-[16px] border border-[#E2E8F0]"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-[#8F5A4E] border border-[#E2E8F0] shrink-0">
                        <Stethoscope className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#0F3040]">{rec.doctor_name ?? "Dokter tidak tercatat"}</p>
                        <p className="text-xs text-slate-500">{rec.facility_name ?? "Fasilitas tidak tercatat"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {rec.subject_name && (
                        <span className="text-[11px] bg-[#EBF2F6] text-[#0F3040] px-2 py-0.5 rounded-full font-medium border border-[#E2E8F0]">
                          Untuk: {rec.subject_name}
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-slate-400 bg-white px-2.5 py-1 rounded-full border border-[#E2E8F0]">
                        {formatDateIndo(rec.visit_date ?? rec.created_at)}
                      </span>
                    </div>
                  </div>

                  {rec.diagnosis_icd10 && (
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[11px] font-mono font-bold bg-white text-[#8F5A4E] px-2 py-0.5 rounded-full border border-[#E2E8F0]">
                        ICD-10: {rec.diagnosis_icd10}
                      </span>
                    </div>
                  )}
                  {rec.ringkasan && (
                    <p className="text-xs text-slate-600 leading-relaxed pl-1 border-l-2 border-[#E2E8F0] ml-0.5 mt-1">
                      {rec.ringkasan}
                    </p>
                  )}
                </CardInner>
              ))}
            </div>
          ) : (
            <CardInner variant="cream" className="p-10 text-center border border-[#E2E8F0]">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mx-auto mb-3 text-slate-400 border border-[#E2E8F0]">
                <Stethoscope className="w-6 h-6" />
              </div>
              <p className="text-base font-bold text-[#0F3040]">Belum ada catatan kunjungan</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                Catatan kunjungan medis akan dicatat oleh dokter di fasilitas kesehatan setelah Anda memberikan kode izin akses.
              </p>
            </CardInner>
          )}
        </Card>
      ) : (
        /* Log Akses Rekam Medis */
        <Card variant="white" className="p-6 sm:p-8 shadow-sm border border-[#E2E8F0]">
          <div className="flex items-center gap-3 pb-4 mb-6 border-b border-[#E2E8F0]">
            <div className="w-10 h-10 rounded-2xl bg-[#EBF2F6] flex items-center justify-center text-[#0F3040] shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0F3040]">Log Akses Rekam Medis</h2>
              <p className="text-xs text-slate-500">
                Setiap percobaan dokter membuka rekam medis Anda tercatat di sini secara otomatis.
              </p>
            </div>
            {auditLogs && auditLogs.length > 0 && (
              <span className="ml-auto text-xs font-semibold bg-[#EBF2F6] text-[#0F3040] px-3 py-1 rounded-full border border-[#E2E8F0]">
                {auditLogs.length} entri
              </span>
            )}
          </div>

          {auditLogs && auditLogs.length > 0 ? (
            <div className="space-y-2">
              {auditLogs.map((log) => {
                const resultInfo = ACCESS_RESULT_LABEL[log.access_result] ?? { label: log.access_result, variant: "info" as const };
                return (
                  <CardInner
                    key={log.id}
                    variant="cream"
                    className="px-4 py-3 rounded-[14px] border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        resultInfo.variant === "selesai" ? "bg-[#EDF7F2] text-[#1B6B4D]" : "bg-[#FDECEA] text-[#B3261E]"
                      }`}>
                        {resultInfo.variant === "selesai"
                          ? <CheckCircle2 className="w-4 h-4" />
                          : <XCircle className="w-4 h-4" />
                        }
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-[#0F3040]">
                            {log.accessor_name ?? "Dokter tidak dikenal"}
                          </span>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            resultInfo.variant === "selesai"
                              ? "bg-[#EDF7F2] text-[#1B6B4D]"
                              : "bg-[#FDECEA] text-[#B3261E]"
                          }`}>
                            {resultInfo.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {log.facility_name ?? "Fasilitas tidak tercatat"}
                          {log.subject_name ? ` · Data: ${log.subject_name}` : ""}
                        </p>
                        {log.notes && (
                          <p className="text-[11px] text-slate-400 italic mt-0.5">{log.notes}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 bg-white px-2.5 py-1 rounded-full border border-[#E2E8F0] shrink-0 whitespace-nowrap">
                      {formatDateTimeIndo(log.created_at)}
                    </span>
                  </CardInner>
                );
              })}
            </div>
          ) : (
            <CardInner variant="cream" className="p-10 text-center border border-[#E2E8F0]">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mx-auto mb-3 text-slate-400 border border-[#E2E8F0]">
                <History className="w-6 h-6" />
              </div>
              <p className="text-base font-bold text-[#0F3040]">Belum ada log akses</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                Log akses akan muncul setelah dokter mencoba membuka rekam medis Anda dengan kode izin.
              </p>
            </CardInner>
          )}
        </Card>
      )}
    </div>
  );
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
  const [referrals, setReferrals] = useState<MyReferralItem[]>([]);
  const [lookupLogs, setLookupLogs] = useState<LookupLogItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const tabParam = new URLSearchParams(window.location.search).get("tab");
      if (tabParam === "rujukan") return "Rujukan Saya";
      if (tabParam === "izin-akses") return "Izin Akses";
      if (tabParam === "riwayat-medis") return "Riwayat Medis";
    }
    return "Beranda";
  });

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
          // Mode preview / testing visual: jika URL memiliki ?demo=1
          const urlParams =
            typeof window !== "undefined"
              ? new URLSearchParams(window.location.search)
              : null;
          if (urlParams?.get("demo") === "1") {
            setProfile({
              id: "demo-user-id",
              full_name: "Budi Santoso",
              role: "pasien",
              sub_role: subperan,
              status: "aktif",
              email: "budi.santoso@example.com",
            });
            setPatient({
              id: "demo-user-id",
              nik: "3301012345670001",
              patient_type: subperan === "keluarga" ? "keluarga" : "pribadi",
              dob: "1995-05-15",
              gender: "Laki-laki",
              blood_type: "O+",
              allergies: "Penisilin",
              phone: "081234567890",
              address: "Jl. Pemuda No. 12, Semarang",
              village: "Pandansari",
              district: "Semarang Tengah",
              city: "Kota Semarang",
              province: "Jawa Tengah",
              bpjs_number: null,
            });
            setLoading(false);
            return;
          }

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
            console.error(
              "Gagal membaca family_members:",
              membersError.message
            );
          } else if (membersData) {
            setFamilyMembers(membersData as FamilyMemberData[]);
          }
        }

        // 6. Muat rujukan saya via server action (RPC list_my_referrals)
        const [refResult, logsResult] = await Promise.all([
          listMyReferralsAction(),
          listMyLookupLogsAction(),
        ]);

        if (isCancelled) return;

        if (refResult.success) {
          setReferrals(refResult.referrals ?? []);
        }
        if (logsResult.success) {
          setLookupLogs(logsResult.logs ?? []);
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
      <div className="min-h-screen text-[#464858]" data-navbar-tone="light" data-portal-wallpaper="true">
        <Navbar
          variant="pasien"
          userName="Memuat..."
          userRole={subperan === "keluarga" ? "Pasien Keluarga" : "Pasien Pribadi"}
          forceGlass={true}
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
      <div className="min-h-screen text-[#464858]" data-navbar-tone="light" data-portal-wallpaper="true">
        <Navbar
          variant="pasien"
          userName="Pasien"
          userRole={subperan === "keluarga" ? "Pasien Keluarga" : "Pasien Pribadi"}
          forceGlass={true}
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
      <div className="min-h-screen text-[#464858]" data-navbar-tone="light" data-portal-wallpaper="true">
        <Navbar
          variant="pasien"
          userName={profile?.full_name || "Pasien"}
          userRole={subperan === "keluarga" ? "Pasien Keluarga" : "Pasien Pribadi"}
          forceGlass={true}
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
  const rujukanAktif = referrals.filter((r) => isRujukanAktif(r.status));
  const rujukanLalu = referrals.filter((r) => !isRujukanAktif(r.status));

  return (
    <div className="min-h-screen text-[#464858]" data-navbar-tone="light" data-portal-wallpaper="true">
      {/* Top Navbar */}
      <Navbar
        variant="pasien"
        userName={profile.full_name}
        userRole={isKeluarga ? "Pasien Keluarga" : "Pasien Pribadi"}
        activeItem={activeTab}
        onItemClick={(item) => setActiveTab(item)}
        forceGlass={true}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        {/* ── KARTU SAPAAN ── */}
        <Reveal>
          <Card variant="white" className="p-6 sm:p-8 shadow-sm mb-6 border border-[#E2E8F0]">
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

        {/* ── TAB NAVIGASI CEPAT ── */}
        <Reveal delayMs={50}>
          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1">
            {["Beranda", "Rujukan Saya", "Penjamin & Verifikasi", "Riwayat Medis", "Izin Akses"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? "bg-[#0F3040] text-white shadow-2xs"
                    : "bg-white text-slate-600 border border-[#E2E8F0] hover:bg-slate-50"
                }`}
              >
                {tab}
                {tab === "Rujukan Saya" && rujukanAktif.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-[#8F5A4E] text-white">
                    {rujukanAktif.length}
                  </span>
                )}
              </button>
            ))}
          </div>
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

        {/* ── TAB BERANDA ── */}
        {activeTab === "Beranda" && (
          <>
            {/* TOKEN AKSES & RUJUKAN AKTIF */}
            <Reveal delayMs={200}>
              <div className="flex flex-col gap-6 mb-8">
                {/* 1. KARTU RINGKAS PENJAMIN & VERIFIKASI */}
                <Card variant="white" className="p-5 sm:p-6 rounded-[22px] border border-[#E2E8F0] shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#FAF5F2] flex items-center justify-center text-[#8F5A4E] shrink-0">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base font-bold text-[#0F3040]">Penjamin Pelayanan Kesehatan</h2>
                          <Badge
                            variant={
                              patient?.payer_type === "bpjs"
                                ? "selesai"
                                : patient?.payer_type === "asuransi"
                                ? "info"
                                : patient?.payer_type === "jaminan_daerah"
                                ? "proses"
                                : "netral"
                            }
                          >
                            {patient?.payer_type === "bpjs"
                              ? "BPJS Kesehatan"
                              : patient?.payer_type === "asuransi"
                              ? "Asuransi Swasta"
                              : patient?.payer_type === "jaminan_daerah"
                              ? "Jaminan Daerah (SKTM)"
                              : "Mandiri / Umum"}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {patient?.payer_type === "bpjs" && patient.bpjs_number
                            ? `Nomor Kartu: ${patient.bpjs_number.slice(0, 4)}•••••${patient.bpjs_number.slice(-4)} (dicatat sesuai pengakuan pasien)`
                            : patient?.payer_type === "asuransi" && patient.insurance_name
                            ? `${patient.insurance_name} · Polis: ${patient.insurance_policy_number || "-"}`
                            : patient?.payer_type === "jaminan_daerah"
                            ? "Pembiayaan subsidi daerah khusus warga kurang mampu (opsional verifikasi)"
                            : "Biaya pelayanan medis ditanggung secara mandiri tanpa penjamin"}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab("Penjamin & Verifikasi")}
                      className="px-4 py-2 rounded-full border border-[#E2E8F0] bg-white text-xs font-semibold text-[#0F3040] hover:bg-slate-50 transition-colors shrink-0 self-start sm:self-auto shadow-2xs"
                    >
                      Kelola Penjamin & Verifikasi &rarr;
                    </button>
                  </div>
                </Card>

                {/* 2. KARTU TOKEN AKSES MEDIS */}
                <Card variant="white" className="p-5 sm:p-6 rounded-[22px] border border-[#E2E8F0] shadow-sm">
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

                {/* 2. KARTU RUJUKAN AKTIF — data nyata */}
                <Card variant="white" className="p-6 sm:p-8 rounded-[24px] border border-[#E2E8F0] shadow-sm">
                  <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#E2E8F0]">
                    <div className="w-10 h-10 rounded-2xl bg-[#FAF5F2] flex items-center justify-center text-[#8F5A4E] shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-[#0F3040]">Rujukan Aktif</h2>
                      <p className="text-xs text-slate-500">
                        Surat rujukan klinis dan antrean ke rumah sakit lanjutan.
                      </p>
                    </div>
                    {rujukanAktif.length > 0 && (
                      <div className="ml-auto flex items-center gap-2">
                        <Badge variant="proses" showDot>
                          {rujukanAktif.length} aktif
                        </Badge>
                        <button
                          type="button"
                          onClick={() => setActiveTab("Rujukan Saya")}
                          className="text-xs font-semibold text-[#8F5A4E] hover:underline hidden sm:inline"
                        >
                          Lihat Semua &rarr;
                        </button>
                      </div>
                    )}
                  </div>

                  {rujukanAktif.length > 0 ? (
                    <div className="space-y-3">
                      {rujukanAktif.map((item, idx) => (
                        <RujukanCard key={item.id} item={item} defaultOpen={idx === 0} />
                      ))}
                    </div>
                  ) : (
                    <CardInner variant="cream" className="p-6 sm:p-8 rounded-[20px] border border-[#E2E8F0] text-center">
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
                  )}

                  <div className="pt-3.5 border-t border-[#E2E8F0]/70 flex items-center justify-between text-xs text-slate-400 mt-4">
                    <span>Interkoneksi Sistem: Realtime</span>
                    <span className="font-semibold text-[#1B6B4D]">● Siap Menerima</span>
                  </div>
                </Card>
              </div>
            </Reveal>

            {/* RINGKASAN IZIN AKSES DI BERANDA */}
            <Reveal delayMs={250}>
              <Card variant="white" className="p-6 sm:p-8 shadow-sm border border-[#E2E8F0]">
                <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#E2E8F0]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#EBF2F6] flex items-center justify-center text-[#0F3040] shrink-0">
                      <Eye className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-[#0F3040]">Izin Akses & Pencarian</h2>
                      <p className="text-xs text-slate-500">
                        Tenaga medis yang pernah mencari data identitasmu lewat sistem Lytera.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("Izin Akses")}
                    className="text-xs font-semibold text-[#0F3040] hover:underline"
                  >
                    Buka Lengkap &rarr;
                  </button>
                </div>

                {lookupLogs.length > 0 ? (
                  <div className="space-y-2">
                    {lookupLogs.slice(0, 3).map((log, idx) => (
                      <CardInner
                        key={idx}
                        variant="cream"
                        className="px-4 py-3 rounded-[14px] border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <span className="text-sm font-semibold text-[#0F3040] block">
                            {log.doctor_name}
                          </span>
                          <span className="text-xs text-slate-500">
                            {log.facility_name}
                            {log.subject_name ? ` · Data: ${log.subject_name}` : ""}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 shrink-0 whitespace-nowrap">
                          {formatDateTimeIndo(log.created_at)}
                        </span>
                      </CardInner>
                    ))}
                  </div>
                ) : (
                  <CardInner variant="cream" className="p-6 text-center border border-[#E2E8F0]">
                    <p className="text-xs text-slate-500">Belum ada riwayat pencarian data identitas.</p>
                  </CardInner>
                )}
              </Card>
            </Reveal>
          </>
        )}

        {/* ── TAB RUJUKAN SAYA ── */}
        {activeTab === "Rujukan Saya" && (
          <Reveal>
            <div className="space-y-8">
              {/* Bagian Rujukan Aktif */}
              <Card variant="white" className="p-6 sm:p-8 shadow-sm border border-[#E2E8F0]">
                <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#E2E8F0]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#FAF5F2] flex items-center justify-center text-[#8F5A4E] shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-[#0F3040]">Rujukan Aktif ({rujukanAktif.length})</h2>
                      <p className="text-xs text-slate-500">
                        Surat rujukan yang sedang dalam proses verifikasi atau penjadwalan rumah sakit.
                      </p>
                    </div>
                  </div>
                  {rujukanAktif.length > 0 && (
                    <Badge variant="proses" showDot>
                      {rujukanAktif.length} Berjalan
                    </Badge>
                  )}
                </div>

                {rujukanAktif.length > 0 ? (
                  <div className="space-y-3">
                    {rujukanAktif.map((item, idx) => (
                      <RujukanCard key={item.id} item={item} defaultOpen={idx === 0} />
                    ))}
                  </div>
                ) : (
                  <CardInner variant="cream" className="p-8 text-center border border-[#E2E8F0]">
                    <p className="text-sm font-semibold text-[#0F3040]">Tidak ada rujukan aktif</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Saat ini seluruh rujukanmu telah selesai atau belum ada pengajuan baru dari faskes primer.
                    </p>
                  </CardInner>
                )}
              </Card>

              {/* Bagian Riwayat Rujukan Terdahulu */}
              <Card variant="white" className="p-6 sm:p-8 shadow-sm border border-[#E2E8F0]">
                <div className="flex items-center gap-3 pb-4 mb-5 border-b border-[#E2E8F0]">
                  <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#0F3040]">Riwayat Rujukan ({rujukanLalu.length})</h2>
                    <p className="text-xs text-slate-500">
                      Arsip rujukan pemeriksaan yang telah selesai atau ditolak.
                    </p>
                  </div>
                </div>

                {rujukanLalu.length > 0 ? (
                  <div className="space-y-3">
                    {rujukanLalu.map((item) => (
                      <RujukanCard key={item.id} item={item} />
                    ))}
                  </div>
                ) : (
                  <CardInner variant="cream" className="p-8 text-center border border-[#E2E8F0]">
                    <p className="text-sm font-semibold text-[#0F3040]">Belum ada riwayat rujukan terdahulu</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Rujukan yang berstatus selesai atau ditolak akan terarsip rapi di sini.
                    </p>
                  </CardInner>
                )}
              </Card>
            </div>
          </Reveal>
        )}

        {/* ── TAB PENJAMIN & VERIFIKASI ── */}
        {activeTab === "Penjamin & Verifikasi" && (
          <Reveal>
            <PenjaminVerifikasiSection onRefreshParent={handleRefetch} />
          </Reveal>
        )}

        {/* ── TAB IZIN AKSES ── */}
        {activeTab === "Izin Akses" && (
          <Reveal>
            <div className="space-y-6">
              {/* Kartu token 6 digit — menggunakan KartuIzinAkses */}
              <KartuIzinAkses />

              {/* Log Pencarian NIK oleh Dokter */}
              <Card variant="white" className="p-6 sm:p-8 shadow-sm border border-[#E2E8F0]">
                <div className="flex items-center gap-3 pb-4 mb-6 border-b border-[#E2E8F0]">
                  <div className="w-10 h-10 rounded-2xl bg-[#EBF2F6] flex items-center justify-center text-[#0F3040] shrink-0">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#0F3040]">Transparansi Pencarian Data Identitas</h2>
                    <p className="text-xs text-slate-500">
                      Sesuai UU PDP, seluruh pencarian NIK Anda oleh tenaga medis tercatat di sini.
                    </p>
                  </div>
                  {lookupLogs.length > 0 && (
                    <span className="ml-auto text-xs font-semibold bg-[#EBF2F6] text-[#0F3040] px-3 py-1 rounded-full border border-[#E2E8F0]">
                      {lookupLogs.length} pencarian
                    </span>
                  )}
                </div>

                {lookupLogs.length > 0 ? (
                  <div className="space-y-3">
                    {lookupLogs.map((log, idx) => (
                      <CardInner
                        key={idx}
                        variant="cream"
                        className="p-4 rounded-[16px] border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-[#0F3040] block">
                              {log.doctor_name}
                            </span>
                            <Badge variant="info">Pencarian NIK</Badge>
                          </div>
                          <span className="text-xs text-slate-600 font-medium block mt-0.5">
                            Fasilitas: {log.facility_name}
                            {log.subject_name ? ` · Subjek Data: ${log.subject_name}` : ""}
                          </span>
                          {log.purpose && (
                            <span className="text-xs text-slate-500 italic block mt-0.5">
                              Tujuan Klinis: {log.purpose}
                            </span>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="text-[11px] font-mono text-slate-500 bg-white px-2.5 py-1 rounded-full border border-[#E2E8F0] inline-block">
                            {formatDateTimeIndo(log.created_at)}
                          </span>
                        </div>
                      </CardInner>
                    ))}
                  </div>
                ) : (
                  <CardInner variant="cream" className="p-10 text-center border border-[#E2E8F0]">
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mx-auto mb-3 text-slate-400 border border-[#E2E8F0]">
                      <Eye className="w-6 h-6" />
                    </div>
                    <p className="text-base font-bold text-[#0F3040]">Belum ada riwayat pencarian data</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                      Belum ada dokter yang melakukan pencarian NIK Anda. Riwayat dicatat otomatis realtime.
                    </p>
                  </CardInner>
                )}
              </Card>

              {/* Kartu Edukasi */}
              <Card variant="white" className="p-6 rounded-[20px] border border-[#E2E8F0] shadow-sm bg-gradient-to-r from-white to-[#F9FAF8]">
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-[#EDF7F2] flex items-center justify-center text-[#1B6B4D] shrink-0 mt-0.5">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0F3040]">Kedaulatan Data Medis Pasien</h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Di Lytera, tenaga medis di faskes primer hanya dapat mencari identitas dasar dengan NIK untuk membuat rujukan.
                      Akses rekam medis lengkap wajib menggunakan Kode Izin 6-digit yang Anda buat sendiri di atas.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </Reveal>
        )}

        {/* ── TAB RIWAYAT MEDIS ── */}
        {activeTab === "Riwayat Medis" && (
          <Reveal>
            <KartuRiwayatMedis />
          </Reveal>
        )}
      </main>
    </div>
  );
};
