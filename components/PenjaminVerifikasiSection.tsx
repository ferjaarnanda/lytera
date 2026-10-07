"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  ShieldCheck,
  FileCheck2,
  Upload,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileText,
  Info,
  X,
  ExternalLink,
} from "lucide-react";
import { Card, CardInner } from "@/components/Card";
import { Badge } from "@/components/Badge";
import {
  listMyVerificationsAction,
  submitVerificationAction,
  getMyPayerStatusAction,
  updatePatientPayerAction,
  getVerificationDocumentSignedUrlAction,
  MyVerificationItem,
  PayerSubjectInfo,
} from "@/app/actions/verifikasi";

interface PenjaminVerifikasiSectionProps {
  onRefreshParent?: () => void;
}

export function PenjaminVerifikasiSection({
  onRefreshParent,
}: PenjaminVerifikasiSectionProps) {
  // ── State Tab Internal ──
  const [activeSubTab, setActiveSubTab] = useState<"penjamin" | "verifikasi">("penjamin");

  // ── State Penjamin Biaya ──
  const [payerSubjects, setPayerSubjects] = useState<PayerSubjectInfo[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [loadingPayer, setLoadingPayer] = useState(true);
  const [savingPayer, setSavingPayer] = useState(false);
  const [payerMsg, setPayerMsg] = useState<{ text: string; type: "sukses" | "galat" } | null>(null);

  // Form Penjamin State
  const [formPayerType, setFormPayerType] = useState<"mandiri" | "bpjs" | "asuransi" | "jaminan_daerah">("mandiri");
  const [formBpjsNumber, setFormBpjsNumber] = useState("");
  const [formInsuranceName, setFormInsuranceName] = useState("");
  const [formInsurancePolicy, setFormInsurancePolicy] = useState("");

  // ── State Verifikasi Administrasi ──
  const [verifications, setVerifications] = useState<MyVerificationItem[]>([]);
  const [loadingVerifications, setLoadingVerifications] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyType, setApplyType] = useState<"domisili" | "kurang_mampu">("domisili");
  const [applySubjectId, setApplySubjectId] = useState<string>("");
  const [applyFile, setApplyFile] = useState<File | null>(null);
  const [applyNote, setApplyNote] = useState("");
  const [submittingApply, setSubmittingApply] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [applySuccess, setApplySuccess] = useState("");

  // ── Muat Data Awal ──
  const loadPayerData = useCallback(async () => {
    setLoadingPayer(true);
    const res = await getMyPayerStatusAction();
    if (res.success && res.subjects && res.subjects.length > 0) {
      setPayerSubjects(res.subjects);
      // Inisialisasi subjek pertama jika belum dipilih
      setSelectedSubjectId((prev) => {
        const found = res.subjects?.find((s) => s.id === prev);
        const activeSub = found || res.subjects?.[0];
        if (activeSub) {
          setFormPayerType(activeSub.payer_type);
          setFormBpjsNumber(activeSub.bpjs_number || "");
          setFormInsuranceName(activeSub.insurance_name || "");
          setFormInsurancePolicy(activeSub.insurance_policy_number || "");
          return activeSub.id;
        }
        return prev;
      });
    }
    setLoadingPayer(false);
  }, []);

  const loadVerifications = useCallback(async () => {
    setLoadingVerifications(true);
    const res = await listMyVerificationsAction();
    if (res.success && res.data) {
      setVerifications(res.data);
    }
    setLoadingVerifications(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPayerData();
    void loadVerifications();
  }, [loadPayerData, loadVerifications]);

  // Handle ganti subjek pada form penjamin
  const handleSelectSubject = (id: string) => {
    setSelectedSubjectId(id);
    setPayerMsg(null);
    const s = payerSubjects.find((item) => item.id === id);
    if (s) {
      setFormPayerType(s.payer_type);
      setFormBpjsNumber(s.bpjs_number || "");
      setFormInsuranceName(s.insurance_name || "");
      setFormInsurancePolicy(s.insurance_policy_number || "");
    }
  };

  // Simpan perubahan penjamin
  const handleSavePayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayerMsg(null);

    const s = payerSubjects.find((item) => item.id === selectedSubjectId);
    if (!s) return;

    if (formPayerType === "bpjs") {
      const cleanBpjs = formBpjsNumber.replace(/\D/g, "");
      if (cleanBpjs.length !== 13) {
        setPayerMsg({ text: "Nomor BPJS Kesehatan harus terdiri dari 13 digit angka.", type: "galat" });
        return;
      }
    }

    if (formPayerType === "asuransi") {
      if (!formInsuranceName.trim() || !formInsurancePolicy.trim()) {
        setPayerMsg({ text: "Nama asuransi dan nomor polis wajib diisi.", type: "galat" });
        return;
      }
    }

    setSavingPayer(true);
    const res = await updatePatientPayerAction({
      subjectId: s.id,
      isFamily: s.is_family,
      payerType: formPayerType,
      bpjsNumber: formPayerType === "bpjs" ? formBpjsNumber : undefined,
      insuranceName: formPayerType === "asuransi" ? formInsuranceName : undefined,
      insurancePolicyNumber: formPayerType === "asuransi" ? formInsurancePolicy : undefined,
    });

    setSavingPayer(false);
    if (!res.success) {
      setPayerMsg({ text: res.error || "Gagal menyimpan penjamin.", type: "galat" });
    } else {
      setPayerMsg({ text: "Data penjamin berhasil diperbarui.", type: "sukses" });
      await loadPayerData();
      if (onRefreshParent) onRefreshParent();
    }
  };

  // Submit pengajuan verifikasi
  const handleSubmitApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplyError("");
    setApplySuccess("");

    if (!applyFile) {
      setApplyError("Silakan pilih berkas dokumen yang akan diunggah.");
      return;
    }

    if (applyFile.size > 5 * 1024 * 1024) {
      setApplyError("Ukuran berkas melebihi batas maksimal 5 MB.");
      return;
    }

    setSubmittingApply(true);
    const fd = new FormData();
    fd.append("type", applyType);
    if (applySubjectId) {
      const s = payerSubjects.find((item) => item.id === applySubjectId);
      if (s && s.is_family) {
        fd.append("familyMemberId", s.id);
      }
    }
    if (applyNote.trim()) {
      fd.append("patientNote", applyNote.trim());
    }
    fd.append("file", applyFile);

    const res = await submitVerificationAction(fd);
    setSubmittingApply(false);

    if (!res.success) {
      setApplyError(res.error || "Gagal mengirimkan permohonan verifikasi.");
    } else {
      setApplySuccess("Permohonan verifikasi berhasil diajukan dan sedang menunggu peninjauan petugas.");
      setApplyFile(null);
      setApplyNote("");
      await loadVerifications();
      if (onRefreshParent) onRefreshParent();
      setTimeout(() => {
        setShowApplyModal(false);
        setApplySuccess("");
      }, 1500);
    }
  };

  // Buka dokumen lewat signed URL
  const handleOpenDoc = async (path: string) => {
    const res = await getVerificationDocumentSignedUrlAction(path);
    if (res.success && res.signedUrl) {
      window.open(res.signedUrl, "_blank", "noopener,noreferrer");
    } else {
      alert("Gagal membuka dokumen: " + (res.error || "Akses tidak diizinkan"));
    }
  };

  const selectedSubject = payerSubjects.find((s) => s.id === selectedSubjectId);

  // Status ringkasan verifikasi untuk subjek terpilih
  const currentSubjectVerifications = verifications.filter((v) => {
    if (!selectedSubject) return true;
    if (selectedSubject.is_family) {
      return v.subject_name === selectedSubject.full_name;
    }
    return !v.is_family;
  });

  const domisiliVerif = currentSubjectVerifications.find((v) => v.type === "domisili" && v.status === "disetujui") ||
    currentSubjectVerifications.find((v) => v.type === "domisili" && v.status === "menunggu") ||
    currentSubjectVerifications.find((v) => v.type === "domisili");

  const sktmVerif = currentSubjectVerifications.find((v) => v.type === "kurang_mampu" && v.status === "disetujui") ||
    currentSubjectVerifications.find((v) => v.type === "kurang_mampu" && v.status === "menunggu") ||
    currentSubjectVerifications.find((v) => v.type === "kurang_mampu");

  return (
    <div className="space-y-6">
      {/* ── SUB-NAVIGASI TAB ── */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
        <button
          type="button"
          onClick={() => setActiveSubTab("penjamin")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all inline-flex items-center gap-2 ${
            activeSubTab === "penjamin"
              ? "bg-[#0F3040] text-white shadow-2xs"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-[#E2E8F0]"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Penjamin Biaya Pasien</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("verifikasi")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all inline-flex items-center gap-2 ${
            activeSubTab === "verifikasi"
              ? "bg-[#0F3040] text-white shadow-2xs"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-[#E2E8F0]"
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>Verifikasi Administrasi & SKTM</span>
          {verifications.some((v) => v.status === "menunggu") && (
            <span className="w-2 h-2 rounded-full bg-[#8F5A4E]" />
          )}
        </button>
      </div>

      {/* ── BAGIAN 1: PENJAMIN BIAYA PASIEN ── */}
      {activeSubTab === "penjamin" && (
        <div className="space-y-6">
          <Card variant="white" className="p-6 sm:p-8 rounded-[24px] border border-[#E2E8F0] shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FAF5F2] flex items-center justify-center text-[#8F5A4E] shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#0F3040]">Pengaturan Penjamin Biaya</h2>
                  <p className="text-xs text-slate-500">
                    Tentukan penjamin pembiayaan pelayanan kesehatan saat berkunjung ke faskes rujukan.
                  </p>
                </div>
              </div>

              <span className="text-[11px] font-semibold text-slate-500 bg-[#FAF5F2] px-3 py-1 rounded-full border border-[#E2E8F0] inline-flex items-center gap-1.5 self-start sm:self-auto">
                <Info className="w-3.5 h-3.5 text-[#8F5A4E]" />
                <span>Dicatat sesuai pengakuan pasien (simulasi)</span>
              </span>
            </div>

            {loadingPayer ? (
              <div className="p-8 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#0F3040]" />
                <span>Memuat data penjamin...</span>
              </div>
            ) : (
              <form onSubmit={handleSavePayer} className="space-y-6">
                {/* Pemilih Subjek (khusus keluarga) */}
                {payerSubjects.length > 1 && (
                  <div>
                    <label className="text-xs font-bold text-[#0F3040] uppercase tracking-wider block mb-2">
                      Pilih Anggota Keluarga:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {payerSubjects.map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => handleSelectSubject(sub.id)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                            selectedSubjectId === sub.id
                              ? "bg-[#0F3040] text-white border-[#0F3040] shadow-2xs"
                              : "bg-white text-slate-600 border-[#E2E8F0] hover:bg-slate-50"
                          }`}
                        >
                          {sub.full_name} {sub.relation ? `(${sub.relation})` : "(Wali)"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Kartu Pilihan Penjamin */}
                <div>
                  <label className="text-xs font-bold text-[#0F3040] uppercase tracking-wider block mb-3">
                    Metode Penjamin untuk {selectedSubject?.full_name}:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {/* Mandiri */}
                    <div
                      onClick={() => setFormPayerType("mandiri")}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        formPayerType === "mandiri"
                          ? "bg-[#FAF5F2] border-[#8F5A4E] shadow-2xs"
                          : "bg-white border-[#E2E8F0] hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-[#0F3040]">Mandiri / Umum</span>
                        <input
                          type="radio"
                          name="payer_type"
                          checked={formPayerType === "mandiri"}
                          onChange={() => setFormPayerType("mandiri")}
                          className="accent-[#0F3040]"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Biaya pemeriksaan dibayarkan secara mandiri tanpa pihak penjamin.
                      </p>
                    </div>

                    {/* BPJS Kesehatan */}
                    <div
                      onClick={() => setFormPayerType("bpjs")}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        formPayerType === "bpjs"
                          ? "bg-[#EDF7F2] border-[#1B6B4D] shadow-2xs"
                          : "bg-white border-[#E2E8F0] hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-[#0F3040]">BPJS Kesehatan</span>
                        <input
                          type="radio"
                          name="payer_type"
                          checked={formPayerType === "bpjs"}
                          onChange={() => setFormPayerType("bpjs")}
                          className="accent-[#1B6B4D]"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Jaminan Kesehatan Nasional (JKN) dengan nomor kartu 13 digit.
                      </p>
                    </div>

                    {/* Asuransi Swasta */}
                    <div
                      onClick={() => setFormPayerType("asuransi")}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        formPayerType === "asuransi"
                          ? "bg-[#FAF5F2] border-[#8F5A4E] shadow-2xs"
                          : "bg-white border-[#E2E8F0] hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-[#0F3040]">Asuransi Swasta</span>
                        <input
                          type="radio"
                          name="payer_type"
                          checked={formPayerType === "asuransi"}
                          onChange={() => setFormPayerType("asuransi")}
                          className="accent-[#8F5A4E]"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Polis asuransi kesehatan komersial atau korporasi.
                      </p>
                    </div>

                    {/* Jaminan Daerah / Kurang Mampu */}
                    <div
                      onClick={() => setFormPayerType("jaminan_daerah")}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        formPayerType === "jaminan_daerah"
                          ? "bg-[#FAF5F2] border-[#8F5A4E] shadow-2xs"
                          : "bg-white border-[#E2E8F0] hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-[#0F3040]">Jaminan Daerah (SKTM)</span>
                        <input
                          type="radio"
                          name="payer_type"
                          checked={formPayerType === "jaminan_daerah"}
                          onChange={() => setFormPayerType("jaminan_daerah")}
                          className="accent-[#8F5A4E]"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Bantuan biaya daerah untuk warga kurang mampu (wajib verifikasi).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Form Isian Dinamis */}
                {formPayerType === "bpjs" && (
                  <CardInner variant="cream" className="p-4 sm:p-5 rounded-2xl border border-[#E2E8F0] space-y-2">
                    <label className="text-xs font-bold text-[#0F3040] block">
                      Nomor Kartu BPJS Kesehatan (13 Digit):
                    </label>
                    <input
                      type="text"
                      maxLength={13}
                      value={formBpjsNumber}
                      onChange={(e) => setFormBpjsNumber(e.target.value.replace(/\D/g, ""))}
                      placeholder="0001234567890"
                      className="w-full max-w-md px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-[#0F3040]"
                    />
                    <p className="text-[11px] text-slate-500">
                      Nomor kartu dicatat untuk kelengkapan administrasi faskes rujukan.
                    </p>
                  </CardInner>
                )}

                {formPayerType === "asuransi" && (
                  <CardInner variant="cream" className="p-4 sm:p-5 rounded-2xl border border-[#E2E8F0] space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-[#0F3040] block mb-1">
                          Nama Perusahaan Asuransi:
                        </label>
                        <input
                          type="text"
                          value={formInsuranceName}
                          onChange={(e) => setFormInsuranceName(e.target.value)}
                          placeholder="Misal: Prudential, AIA, Manulife"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0F3040]"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-[#0F3040] block mb-1">
                          Nomor Polis:
                        </label>
                        <input
                          type="text"
                          value={formInsurancePolicy}
                          onChange={(e) => setFormInsurancePolicy(e.target.value)}
                          placeholder="Misal: POL-98234-XYZ"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0F3040]"
                        />
                      </div>
                    </div>
                  </CardInner>
                )}

                {formPayerType === "jaminan_daerah" && (
                  <CardInner variant="cream" className="p-4 sm:p-5 rounded-2xl border border-[#E2E8F0] space-y-2">
                    <div className="flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-[#8F5A4E] shrink-0 mt-0.5" />
                      <div className="text-xs text-slate-600 leading-relaxed">
                        <strong className="text-[#0F3040]">Memerlukan Verifikasi Administrasi:</strong> Penjamin Jaminan Daerah memerlukan surat keterangan kurang mampu (SKTM) yang diverifikasi oleh petugas kelurahan/kecamatan/dinas sosial. Kamu dapat mengajukan verifikasi di tab{" "}
                        <button
                          type="button"
                          onClick={() => setActiveSubTab("verifikasi")}
                          className="font-bold text-[#8F5A4E] underline hover:text-[#0F3040]"
                        >
                          Verifikasi Administrasi & SKTM
                        </button>.
                      </div>
                    </div>
                  </CardInner>
                )}

                {/* Pesan status simpan */}
                {payerMsg && (
                  <div
                    className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                      payerMsg.type === "sukses"
                        ? "bg-[#EDF7F2] text-[#1B6B4D] border border-[#1B6B4D]/30"
                        : "bg-[#FDECEA] text-[#B3261E] border border-[#B3261E]/30"
                    }`}
                  >
                    {payerMsg.type === "sukses" ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{payerMsg.text}</span>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingPayer}
                    className="px-6 py-2.5 rounded-full bg-[#0F3040] text-white text-xs sm:text-sm font-semibold hover:bg-[#0A2230] transition-colors shadow-2xs inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    {savingPayer ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <span>Simpan Perubahan Penjamin</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </Card>
        </div>
      )}

      {/* ── BAGIAN 2: VERIFIKASI ADMINISTRASI & SKTM ── */}
      {activeSubTab === "verifikasi" && (
        <div className="space-y-6">
          {/* Ringkasan Status Verifikasi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Status Domisili */}
            <Card variant="white" className="p-5 rounded-[22px] border border-[#E2E8F0] shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#FAF5F2] flex items-center justify-center text-[#8F5A4E]">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0F3040]">Verifikasi Domisili</h3>
                    <p className="text-[11px] text-slate-500">Kesesuaian tempat tinggal resmi</p>
                  </div>
                </div>

                <Badge
                  variant={
                    domisiliVerif?.status === "disetujui"
                      ? "selesai"
                      : domisiliVerif?.status === "menunggu"
                      ? "proses"
                      : domisiliVerif?.status === "ditolak"
                      ? "bahaya"
                      : "netral"
                  }
                >
                  {domisiliVerif?.status === "disetujui"
                    ? "Terverifikasi"
                    : domisiliVerif?.status === "menunggu"
                    ? "Dalam Peninjauan"
                    : domisiliVerif?.status === "ditolak"
                    ? "Ditolak"
                    : "Belum Diajukan"}
                </Badge>
              </div>

              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Opsional. Memastikan hak akses bantuan program fasilitas kesehatan setempat.
              </p>

              {(!domisiliVerif || domisiliVerif.status === "ditolak") && (
                <button
                  type="button"
                  onClick={() => {
                    setApplyType("domisili");
                    setApplySubjectId(selectedSubjectId);
                    setShowApplyModal(true);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-white border border-[#E2E8F0] text-xs font-semibold text-[#0F3040] hover:bg-slate-50 transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Ajukan Verifikasi Domisili</span>
                </button>
              )}
            </Card>

            {/* Status SKTM / Kurang Mampu */}
            <Card variant="white" className="p-5 rounded-[22px] border border-[#E2E8F0] shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#EDF7F2] flex items-center justify-center text-[#1B6B4D]">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0F3040]">Jaminan Daerah / SKTM</h3>
                    <p className="text-[11px] text-slate-500">Keterangan kurang mampu pemda</p>
                  </div>
                </div>

                <Badge
                  variant={
                    sktmVerif?.status === "disetujui"
                      ? "selesai"
                      : sktmVerif?.status === "menunggu"
                      ? "proses"
                      : sktmVerif?.status === "ditolak"
                      ? "bahaya"
                      : "netral"
                  }
                >
                  {sktmVerif?.status === "disetujui"
                    ? `Terverifikasi${sktmVerif.valid_until ? ` s.d. ${sktmVerif.valid_until}` : ""}`
                    : sktmVerif?.status === "menunggu"
                    ? "Dalam Peninjauan"
                    : sktmVerif?.status === "ditolak"
                    ? "Ditolak"
                    : "Belum Diajukan"}
                </Badge>
              </div>

              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Opsional. Memungkinkan rumah sakit rujukan memproses pembiayaan lewat skema subsidi daerah.
              </p>

              {(!sktmVerif || sktmVerif.status === "ditolak") && (
                <button
                  type="button"
                  onClick={() => {
                    setApplyType("kurang_mampu");
                    setApplySubjectId(selectedSubjectId);
                    setShowApplyModal(true);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-white border border-[#E2E8F0] text-xs font-semibold text-[#0F3040] hover:bg-slate-50 transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Ajukan Verifikasi SKTM</span>
                </button>
              )}
            </Card>
          </div>

          {/* Daftar Riwayat Pengajuan */}
          <Card variant="white" className="p-6 sm:p-8 rounded-[24px] border border-[#E2E8F0] shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b border-[#E2E8F0]">
              <div>
                <h2 className="text-lg font-bold text-[#0F3040]">Riwayat Permohonan Verifikasi</h2>
                <p className="text-xs text-slate-500">
                  Seluruh permohonan yang diajukan ke dinas sosial atau kelurahan/kecamatan.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setApplyType("domisili");
                  setApplySubjectId(selectedSubjectId);
                  setShowApplyModal(true);
                }}
                className="px-4 py-2 rounded-full bg-[#0F3040] text-white text-xs font-semibold hover:bg-[#0A2230] transition-colors inline-flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Unggah Permohonan Baru</span>
              </button>
            </div>

            {loadingVerifications ? (
              <div className="p-8 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#0F3040]" />
                <span>Memuat riwayat verifikasi...</span>
              </div>
            ) : verifications.length === 0 ? (
              <CardInner variant="cream" className="p-8 text-center border border-[#E2E8F0]">
                <p className="text-sm font-semibold text-[#0F3040]">
                  Belum ada permohonan verifikasi yang diajukan
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Verifikasi domisili dan keterangan kurang mampu bersifat opsional dan tidak menghalangi rujukan medis.
                </p>
              </CardInner>
            ) : (
              <div className="space-y-3">
                {verifications.map((item) => (
                  <CardInner
                    key={item.id}
                    variant="cream"
                    className="p-4 sm:p-5 rounded-2xl border border-[#E2E8F0] space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            item.type === "domisili"
                              ? "info"
                              : "proses"
                          }
                        >
                          {item.type === "domisili" ? "Verifikasi Domisili" : "Kurang Mampu (SKTM)"}
                        </Badge>
                        <span className="text-xs font-bold text-[#0F3040]">
                          {item.subject_name} {item.is_family ? "(Anggota Keluarga)" : "(Pasien Utama)"}
                        </span>
                      </div>

                      <Badge
                        variant={
                          item.status === "disetujui"
                            ? "selesai"
                            : item.status === "ditolak"
                            ? "bahaya"
                            : "proses"
                        }
                      >
                        {item.status === "disetujui"
                          ? `Disetujui${item.valid_until ? ` (s.d. ${item.valid_until})` : ""}`
                          : item.status === "ditolak"
                          ? "Ditolak"
                          : "Menunggu Peninjauan"}
                      </Badge>
                    </div>

                    {/* Dokumen & Catatan */}
                    <div className="text-xs text-slate-600 space-y-1.5 pt-1 border-t border-[#E2E8F0]/60">
                      {item.patient_note && (
                        <p>
                          <span className="text-slate-400">Catatan Pemohon:</span> {item.patient_note}
                        </p>
                      )}

                      {item.status === "ditolak" && item.review_note && (
                        <p className="text-[#B3261E] bg-[#FDECEA] p-2 rounded-lg border border-[#B3261E]/20">
                          <strong>Alasan Penolakan Petugas:</strong> {item.review_note}
                        </p>
                      )}

                      {item.document_paths && item.document_paths.length > 0 && (
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-slate-400">Berkas Terlampir:</span>
                          {item.document_paths.map((p, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleOpenDoc(p)}
                              className="text-xs font-semibold text-[#0F3040] hover:text-[#8F5A4E] underline inline-flex items-center gap-1"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Lihat Berkas Dokumen</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardInner>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── MODAL PENGAJUAN VERIFIKASI ── */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-[24px] border border-[#E2E8F0] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#0F3040]">
                  {applyType === "domisili"
                    ? "Ajukan Verifikasi Domisili"
                    : "Ajukan Verifikasi Kurang Mampu (SKTM)"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lampirkan berkas bukti resmi dalam format JPG, PNG, atau PDF (maks. 5 MB).
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowApplyModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitApply} className="p-6 space-y-4">
              {/* Jenis Verifikasi */}
              <div>
                <label className="text-xs font-bold text-[#0F3040] block mb-1">
                  Jenis Verifikasi:
                </label>
                <select
                  value={applyType}
                  onChange={(e) => setApplyType(e.target.value as "domisili" | "kurang_mampu")}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#0F3040] focus:outline-none focus:ring-2 focus:ring-[#0F3040]"
                >
                  <option value="domisili">Verifikasi Domisili (KTP / KK / Surat Domisili)</option>
                  <option value="kurang_mampu">Keterangan Kurang Mampu (SKTM / Bukti Terdaftar DTKS)</option>
                </select>
              </div>

              {/* Subjek (jika ada keluarga) */}
              {payerSubjects.length > 1 && (
                <div>
                  <label className="text-xs font-bold text-[#0F3040] block mb-1">
                    Untuk Anggota:
                  </label>
                  <select
                    value={applySubjectId}
                    onChange={(e) => setApplySubjectId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#0F3040] focus:outline-none focus:ring-2 focus:ring-[#0F3040]"
                  >
                    {payerSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name} {s.relation ? `(${s.relation})` : "(Wali)"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Unggah Berkas */}
              <div>
                <label className="text-xs font-bold text-[#0F3040] block mb-1">
                  Unggah Dokumen Bukti (Maks. 5 MB):
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setApplyFile(f);
                  }}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#FAF5F2] file:text-[#8F5A4E] hover:file:bg-[#F3EBE7] cursor-pointer"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Format yang didukung: JPG, PNG, atau PDF.
                </p>
              </div>

              {/* Catatan Pasien */}
              <div>
                <label className="text-xs font-bold text-[#0F3040] block mb-1">
                  Catatan Tambahan (Opsional):
                </label>
                <textarea
                  rows={2}
                  value={applyNote}
                  onChange={(e) => setApplyNote(e.target.value)}
                  placeholder="Keterangan singkat jika diperlukan..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs focus:outline-none focus:ring-2 focus:ring-[#0F3040]"
                />
              </div>

              {/* Pesan Galat & Sukses */}
              {applyError && (
                <div className="p-3 rounded-xl bg-[#FDECEA] text-[#B3261E] border border-[#B3261E]/30 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{applyError}</span>
                </div>
              )}

              {applySuccess && (
                <div className="p-3 rounded-xl bg-[#EDF7F2] text-[#1B6B4D] border border-[#1B6B4D]/30 text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{applySuccess}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  disabled={submittingApply}
                  className="px-4 py-2 rounded-full border border-[#E2E8F0] text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={submittingApply}
                  className="px-5 py-2 rounded-full bg-[#0F3040] text-white text-xs font-semibold hover:bg-[#0A2230] transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submittingApply ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengunggah...</span>
                    </>
                  ) : (
                    <span>Kirim Permohonan</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
