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
} from "lucide-react";
import { CardInner } from "@/components/Card";
import { Badge } from "@/components/Badge";
import {
  bukaRekamMedisDokterAction,
  tambahRekamMedisDokterAction,
  type OpenMedicalRecordResult,
} from "@/app/actions/rekam-medis";

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

  // ── State Membuka Rekam Medis ──
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [records, setRecords] = useState<OpenMedicalRecordResult[] | null>(null);

  // ── State Penulisan Rekam Medis Baru ──
  const [showInputForm, setShowInputForm] = useState(false);
  const [diagnosisIcd10, setDiagnosisIcd10] = useState("");
  const [ringkasan, setRingkasan] = useState("");
  const [savingRecord, setSavingRecord] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

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

  // ── 1. Verifikasi Token & Buka Rekam Medis ──
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
      return;
    }

    // Otorisasi Sukses
    setActiveVerifiedToken(clean);
    setRecords(res.records ?? []);
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

    // Sukses: perbarui riwayat lokal
    setSaveSuccess(true);
    setShowInputForm(false);
    setDiagnosisIcd10("");
    setRingkasan("");

    // Tambahkan record baru ke daftar lokal
    setRecords((prev) => [
      {
        id: res.recordId || "new",
        patient_id: "",
        family_member_id: null,
        facility_name: "Fasilitas Anda",
        doctor_name: "Anda (Dokter Pemeriksa)",
        tanggal: new Date().toISOString(),
        diagnosis_icd10: diagnosisIcd10.trim(),
        ringkasan: ringkasan.trim(),
        referral_id: referralId,
      },
      ...(prev || []),
    ]);

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

          {/* ── TAMPILAN RIWAYAT MEDIS PASIEN (READ-ONLY) ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#0F3040] uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-[#8F5A4E]" />
                <span>Riwayat Kunjungan Medis Pasien ({records?.length || 0})</span>
              </h4>
              <Badge variant="info">Read-Only Otorisasi Pasien</Badge>
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
              <CardInner variant="cream" className="p-6 text-center border border-[#E2E8F0] rounded-xl">
                <Clock className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-[#0F3040]">Belum Ada Riwayat Kunjungan</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Pasien belum memiliki catatan rekam medis sebelumnya. Gunakan tombol &quot;Tambah Catatan Medis&quot; untuk mencatat kunjungan ini.
                </p>
              </CardInner>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
