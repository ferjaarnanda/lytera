"use client";

import React, { useState } from "react";
import {
  Key,
  Stethoscope,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  FilePlus,
  Clock,
  History,
  Lock,
  RotateCw,
} from "lucide-react";
import { CardInner } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { createClient } from "@/lib/supabase/client";
import {
  bukaRekamMedisDokterAction,
  tambahRekamMedisDokterAction,
  type OpenMedicalRecordResult,
} from "@/app/actions/rekam-medis";

export interface DoctorPatientMedicalHistory {
  id: string | null;
  patient_id: string;
  family_member_id: string | null;
  subject_name: string | null;
  kondisi_penyakit: string;
  tahun_kejadian: string | null;
  status_riwayat: string | null;
  catatan: string | null;
  sumber_informasi: string | null;
  status_verifikasi: string | null;
  created_at: string | null;
}

interface RekamMedisDokterPanelProps {
  referralId: string;
  patientName: string;
  isDoctor: boolean;
  onRecordAdded?: () => void;
}

export function RekamMedisDokterPanel({
  referralId,
  patientName,
  isDoctor,
  onRecordAdded,
}: RekamMedisDokterPanelProps) {
  // ── State Otorisasi Token (Hanya di memori React, tidak di localStorage / URL) ──
  const [tokenInput, setTokenInput] = useState("");
  const [activeVerifiedToken, setActiveVerifiedToken] = useState<string | null>(null);

  // ── State Membuka Rekam Medis (Kunjungan & Riwayat Terdahulu) ──
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [records, setRecords] = useState<OpenMedicalRecordResult[] | null>(null);
  const [medicalHistories, setMedicalHistories] = useState<DoctorPatientMedicalHistory[] | null>(null);
  const [loadingHistories, setLoadingHistories] = useState(false);

  // ── State Penulisan Rekam Medis Baru ──
  const [showInputForm, setShowInputForm] = useState(false);
  const [diagnosisIcd10, setDiagnosisIcd10] = useState("");
  const [ringkasan, setRingkasan] = useState("");
  const [savingRecord, setSavingRecord] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [reloadingRecords, setReloadingRecords] = useState(false);

  // Jika bukan dokter aktif
  if (!isDoctor) {
    return (
      <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-slate-500 flex items-center gap-3">
        <Lock className="w-4 h-4 text-slate-400 shrink-0" />
        <p>
          Fitur rekam medis dan otorisasi berkunjung hanya dapat diakses oleh dokter aktif yang bertugas di fasilitas kesehatan.
        </p>
      </div>
    );
  }

  // ── 1. Verifikasi Token & Buka Rekam Medis & Riwayat Terdahulu ──
  const handleVerifyToken = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = tokenInput.trim();
    if (!clean || clean.length !== 6 || !/^\d{6}$/.test(clean)) {
      setVerifyError("Masukkan tepat 6 digit kode izin dari pasien.");
      return;
    }

    setVerifying(true);
    setVerifyError(null);

    const res = await bukaRekamMedisDokterAction({
      referralId,
      tokenCode: clean,
    });

    setVerifying(false);

    if (!res.success) {
      setVerifyError(res.error || "Gagal membuka rekam medis dengan kode tersebut.");
      setActiveVerifiedToken(null);
      setRecords(null);
      setMedicalHistories(null);
      return;
    }

    // Otorisasi Sukses
    setActiveVerifiedToken(clean);
    setRecords(res.records ?? []);

    // Muat Riwayat Kesehatan Terdahulu (Laporan Pasien) via RPC open_patient_medical_histories
    setLoadingHistories(true);
    try {
      const supabase = createClient();
      const { data: histData, error: histErr } = await supabase.rpc("open_patient_medical_histories", {
        p_referral_id: referralId,
        p_token_code: clean,
      });
      if (!histErr && histData) {
        const rows = histData as DoctorPatientMedicalHistory[];
        if (rows.length === 1 && rows[0].kondisi_penyakit === "KOSONG") {
          setMedicalHistories([]);
        } else if (rows.length > 0 && rows[0].kondisi_penyakit === "AKSES_DITOLAK") {
          setMedicalHistories(null);
        } else {
          setMedicalHistories(rows);
        }
      } else {
        setMedicalHistories([]);
      }
    } catch {
      setMedicalHistories([]);
    } finally {
      setLoadingHistories(false);
    }
  };

  // ── Segarkan Riwayat Medis dari Database secara Otoritatif ──
  const handleRefreshRecords = async () => {
    if (!activeVerifiedToken) return;
    setReloadingRecords(true);
    setSaveError(null);
    const res = await bukaRekamMedisDokterAction({
      referralId,
      tokenCode: activeVerifiedToken,
    });
    setReloadingRecords(false);
    if (res.success) {
      setRecords(res.records ?? []);
      // Segarkan juga riwayat kesehatan terdahulu
      try {
        const supabase = createClient();
        const { data: histData } = await supabase.rpc("open_patient_medical_histories", {
          p_referral_id: referralId,
          p_token_code: activeVerifiedToken,
        });
        if (histData) {
          const rows = histData as DoctorPatientMedicalHistory[];
          if (rows.length === 1 && rows[0].kondisi_penyakit === "KOSONG") {
            setMedicalHistories([]);
          } else if (rows.length > 0 && rows[0].kondisi_penyakit === "AKSES_DITOLAK") {
            setMedicalHistories(null);
          } else {
            setMedicalHistories(rows);
          }
        }
      } catch {
        // Abaikan error background refresh
      }
    } else {
      const err = res.error || "Gagal menyegarkan riwayat medis.";
      if (
        err.toLowerCase().includes("dicabut") ||
        err.toLowerCase().includes("kedaluwarsa") ||
        err.toLowerCase().includes("terkunci")
      ) {
        setActiveVerifiedToken(null);
        setRecords(null);
        setMedicalHistories(null);
        setShowInputForm(false);
        setVerifyError(err);
      } else {
        setSaveError(err);
      }
    }
  };

  // ── 2. Simpan Catatan Rekam Medis Baru ──
  const handleSaveMedicalRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVerifiedToken) {
      setSaveError("Sesi otorisasi telah berakhir. Masukkan kode izin kembali.");
      return;
    }

    if (!diagnosisIcd10.trim()) {
      setSaveError("Kode diagnosis ICD-10 wajib diisi.");
      return;
    }

    if (!ringkasan.trim()) {
      setSaveError("Ringkasan catatan klinis wajib diisi.");
      return;
    }

    setSavingRecord(true);
    setSaveError(null);

    const res = await tambahRekamMedisDokterAction({
      referralId,
      tokenCode: activeVerifiedToken,
      diagnosisIcd10: diagnosisIcd10.trim(),
      ringkasan: ringkasan.trim(),
    });

    setSavingRecord(false);

    if (!res.success) {
      // Jika token kedaluwarsa atau dicabut saat submit, reset sesi otorisasi
      const err = res.error || "Gagal menyimpan rekam medis.";
      if (
        err.toLowerCase().includes("dicabut") ||
        err.toLowerCase().includes("kedaluwarsa") ||
        err.toLowerCase().includes("terkunci")
      ) {
        setActiveVerifiedToken(null);
        setRecords(null);
        setShowInputForm(false);
        setVerifyError(err);
      } else {
        setSaveError(err);
      }
      return;
    }

    // Sukses: reset formulir input
    setShowInputForm(false);
    setDiagnosisIcd10("");
    setRingkasan("");
    setSaveError(null);

    // Ambil ulang riwayat rekam medis aktual secara otoritatif dari database menggunakan token sesi aktif
    setReloadingRecords(true);
    const reloadRes = await bukaRekamMedisDokterAction({
      referralId,
      tokenCode: activeVerifiedToken,
    });
    setReloadingRecords(false);

    if (reloadRes.success) {
      setRecords(reloadRes.records ?? []);
      setSaveSuccess(true);
    } else {
      setSaveError(
        "Catatan medis berhasil disimpan ke basis data, namun pemuatan ulang riwayat terkendala: " +
          (reloadRes.error || "Gagal membaca data terbaru") +
          ". Tekan tombol 'Segarkan Riwayat' untuk memuat ulang data."
      );
      setSaveSuccess(true);
    }

    if (onRecordAdded) {
      onRecordAdded();
    }
  };

  // ── 3. Reset Sesi ──
  const handleResetSession = () => {
    setActiveVerifiedToken(null);
    setRecords(null);
    setTokenInput("");
    setVerifyError(null);
    setShowInputForm(false);
    setSaveError(null);
    setSaveSuccess(false);
  };

  return (
    <div className="space-y-4 pt-3">
      {/* ── JIKA BELUM TERVERIFIKASI TOKEN ── */}
      {!activeVerifiedToken ? (
        <CardInner variant="cream" className="p-4 sm:p-5 rounded-[20px] border border-[#E2E8F0]">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#EDF7F2] flex items-center justify-center text-[#1B6B4D] shrink-0 mt-0.5">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#0F3040]">
                Otorisasi Akses Rekam Medis Pasien
              </h4>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Minta pasien <span className="font-semibold text-[#0F3040]">{patientName}</span> untuk menerbitkan Kode Izin 6-digit pada portal Lytera miliknya.
              </p>
            </div>
          </div>

          <form onSubmit={handleVerifyToken} className="space-y-3 mt-4">
            <div>
              <label htmlFor="tokenCodeInput" className="text-xs font-semibold text-slate-600 block mb-1">
                Kode Izin Pasien (6 Digit Angka)
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="tokenCodeInput"
                  type="text"
                  maxLength={6}
                  inputMode="numeric"
                  placeholder="Contoh: 839201"
                  value={tokenInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setTokenInput(val);
                    if (verifyError) setVerifyError(null);
                  }}
                  className="w-48 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] font-mono text-center text-lg font-bold tracking-widest text-[#0F3040] focus:outline-hidden focus:ring-2 focus:ring-[#0F3040]"
                />
                <button
                  type="submit"
                  disabled={verifying || tokenInput.length !== 6}
                  className="px-4 py-2 rounded-xl bg-[#0F3040] text-white text-xs font-semibold hover:bg-[#0A2230] disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5"
                >
                  {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  <span>{verifying ? "Memverifikasi..." : "Buka Rekam Medis"}</span>
                </button>
              </div>
            </div>

            {verifyError && (
              <div className="p-3 rounded-xl bg-[#FDECEA] border border-[#B3261E]/30 text-[#B3261E] text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{verifyError}</span>
              </div>
            )}

            <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1B6B4D]" />
              <span>Seluruh percobaan akses rekam medis diaudit realtime sesuai UU PDP.</span>
            </div>
          </form>
        </CardInner>
      ) : (
        /* ── JIKA TOKEN TELAH TERVERIFIKASI (SESI TERBUKA) ── */
        <div className="space-y-4">
          {/* Banner Otorisasi Sukses */}
          <div className="p-3.5 rounded-2xl bg-[#EDF7F2] border border-[#A8D5BD] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-[#1B6B4D]">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <div>
                <span className="font-bold block">Otorisasi Pasien Aktif</span>
                <span className="text-[11px] text-slate-600">
                  Sesi pemeriksaan terbuka. Seluruh akses tercatat di log audit pasien.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!showInputForm && (
                <button
                  type="button"
                  onClick={() => setShowInputForm(true)}
                  className="px-3 py-1.5 rounded-lg bg-[#1B6B4D] text-white font-semibold hover:bg-[#15533B] transition-colors inline-flex items-center gap-1"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                  <span>Tambah Catatan Medis</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleResetSession}
                className="px-3 py-1.5 rounded-lg border border-[#A8D5BD] bg-white text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
              >
                Tutup Sesi
              </button>
            </div>
          </div>

          {/* Feedback simpan berhasil */}
          {saveSuccess && (
            <div className="p-3 rounded-xl bg-[#EDF7F2] border border-[#A8D5BD] text-[#1B6B4D] text-xs flex items-center justify-between">
              <span className="font-semibold">Catatan kunjungan medis berhasil disimpan ke rekam medis pasien.</span>
              <button
                type="button"
                onClick={() => setSaveSuccess(false)}
                className="text-xs text-slate-500 hover:underline ml-2"
              >
                Tutup
              </button>
            </div>
          )}

          {/* ── FORM TAMBAH CATATAN MEDIS BARU ── */}
          {showInputForm && (
            <CardInner variant="cream" className="p-4 sm:p-5 rounded-[20px] border border-[#E2E8F0]">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-[#8F5A4E]" />
                  <h4 className="text-xs font-bold text-[#0F3040] uppercase tracking-wider">
                    Tambah Catatan Kunjungan Medis
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInputForm(false)}
                  className="text-xs text-slate-500 hover:underline"
                >
                  Batal
                </button>
              </div>

              <form onSubmit={handleSaveMedicalRecord} className="space-y-3">
                <div>
                  <label htmlFor="diagnosisIcd10Input" className="text-xs font-semibold text-slate-600 block mb-1">
                    Kode Diagnosis ICD-10 <span className="text-[#B3261E]">*</span>
                  </label>
                  <input
                    id="diagnosisIcd10Input"
                    type="text"
                    placeholder="Contoh: I10 - Hipertensi Esensial"
                    value={diagnosisIcd10}
                    onChange={(e) => setDiagnosisIcd10(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E2E8F0] text-xs font-mono text-[#0F3040] focus:outline-hidden focus:ring-2 focus:ring-[#0F3040]"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="ringkasanInput" className="text-xs font-semibold text-slate-600 block mb-1">
                    Ringkasan Anamnesis, Pemeriksaan &amp; Terapi <span className="text-[#B3261E]">*</span>
                  </label>
                  <textarea
                    id="ringkasanInput"
                    rows={3}
                    placeholder="Tuliskan catatan pemeriksaan klinis, tindakan, evaluasi kondisi, atau instruksi terapi..."
                    value={ringkasan}
                    onChange={(e) => setRingkasan(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#0F3040] focus:outline-hidden focus:ring-2 focus:ring-[#0F3040]"
                    required
                  />
                </div>

                {saveError && (
                  <div className="p-2.5 rounded-xl bg-[#FDECEA] border border-[#B3261E]/30 text-[#B3261E] text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{saveError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowInputForm(false)}
                    className="px-3.5 py-1.5 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingRecord}
                    className="px-4 py-2 rounded-xl bg-[#0F3040] text-white text-xs font-semibold hover:bg-[#0A2230] disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
                  >
                    {savingRecord ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FilePlus className="w-3.5 h-3.5" />}
                    <span>{savingRecord ? "Menyimpan..." : "Simpan Rekam Medis"}</span>
                  </button>
                </div>
              </form>
            </CardInner>
          )}

          {/* ── BAGIAN A: RIWAYAT KESEHATAN TERDAHULU (DILAPORKAN PASIEN) ── */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-[#0F3040] uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-[#8F5A4E]" />
                  <span>A. Riwayat Kesehatan Terdahulu ({medicalHistories?.length || 0})</span>
                </h4>
                <button
                  type="button"
                  onClick={handleRefreshRecords}
                  disabled={reloadingRecords}
                  title="Segarkan Riwayat"
                  className="p-1 rounded-md text-slate-400 hover:text-[#0F3040] hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${reloadingRecords ? "animate-spin text-[#0F3040]" : ""}`} />
                </button>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                <AlertTriangle className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                <span>Laporan Pasien — Belum Diverifikasi</span>
              </span>
            </div>

            {loadingHistories ? (
              <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memuat riwayat kesehatan terdahulu...</span>
              </div>
            ) : medicalHistories && medicalHistories.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {medicalHistories.map((h, idx) => (
                  <CardInner
                    key={h.id || idx}
                    variant="cream"
                    className="p-3 rounded-xl border border-[#E2E8F0] space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-[#0F3040] text-xs block">
                          {h.kondisi_penyakit}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span>
                            Status: <span className="font-semibold text-slate-700 capitalize">{h.status_riwayat?.replace(/_/g, " ") || "-"}</span>
                          </span>
                          {h.tahun_kejadian && <span>· Waktu: {h.tahun_kejadian}</span>}
                          {h.subject_name && <span>· Subjek: {h.subject_name}</span>}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded-full border border-[#E2E8F0] shrink-0">
                        {h.sumber_informasi === "laporan_wali" ? "Laporan Wali" : "Laporan Pasien"}
                      </span>
                    </div>
                    {h.catatan && (
                      <p className="text-[11px] text-slate-600 pl-2 border-l-2 border-[#E2E8F0] bg-white/60 p-1 rounded-r">
                        {h.catatan}
                      </p>
                    )}
                  </CardInner>
                ))}
              </div>
            ) : (
              <CardInner variant="cream" className="p-4 text-center border border-[#E2E8F0] rounded-xl">
                <p className="text-xs font-bold text-[#0F3040]">Data Belum Tersedia</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Pasien belum memasukkan catatan riwayat kesehatan terdahulu secara mandiri di portal pasien.
                </p>
              </CardInner>
            )}
          </div>

          {/* ── BAGIAN B: RIWAYAT KUNJUNGAN MEDIS DI LYTERA (DICATAT DOKTER) ── */}
          <div className="space-y-3 pt-3 border-t border-[#E2E8F0]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-[#0F3040] uppercase tracking-wider flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-[#8F5A4E]" />
                  <span>B. Riwayat Kunjungan Medis di Lytera ({records?.length || 0})</span>
                </h4>
              </div>
              <Badge variant="info">Dicatat Nakes di Fasilitas</Badge>
            </div>

            {records && records.length > 0 ? (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {records.map((r, idx) => (
                  <CardInner
                    key={r.id || idx}
                    variant="cream"
                    className="p-3.5 rounded-xl border border-[#E2E8F0] space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-[#0F3040] text-xs block">
                          {r.doctor_name || "Dokter Pemeriksa"}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          {r.facility_name || "Fasilitas Kesehatan"}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 bg-white px-2 py-0.5 rounded-full border border-[#E2E8F0]">
                        {r.tanggal ? new Date(r.tanggal).toLocaleDateString("id-ID") : "-"}
                      </span>
                    </div>

                    {r.diagnosis_icd10 && (
                      <div className="inline-block px-2 py-0.5 rounded-md bg-white border border-[#E2E8F0] text-[11px] font-mono font-semibold text-[#8F5A4E]">
                        ICD-10: {r.diagnosis_icd10}
                      </div>
                    )}

                    {r.ringkasan && (
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap pl-1 border-l-2 border-[#E2E8F0]">
                        {r.ringkasan}
                      </p>
                    )}
                  </CardInner>
                ))}
              </div>
            ) : (
              <CardInner variant="cream" className="p-6 text-center border border-[#E2E8F0] rounded-xl space-y-2">
                <Clock className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                <p className="text-xs font-bold text-[#0F3040]">Belum Ada Riwayat Kunjungan di Lytera</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Otorisasi izin pasien aktif. Pasien belum memiliki kunjungan klinis yang tercatat di sistem Lytera. Linimasa rujukan bukan rekam medis. Catat kunjungan ini secara sah dengan formulir di atas.
                </p>
                {!showInputForm && (
                  <button
                    type="button"
                    onClick={() => setShowInputForm(true)}
                    className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0F3040] text-white text-xs font-semibold hover:bg-[#0A2230] transition-colors"
                  >
                    <FilePlus className="w-3.5 h-3.5" />
                    <span>Tambah Catatan Kunjungan Pertama</span>
                  </button>
                )}
              </CardInner>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
