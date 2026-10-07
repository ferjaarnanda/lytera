"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  MapPin,
  X,
  FileCheck,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { Reveal } from "@/components/Reveal";
import {
  listVerificationQueueAction,
  reviewVerificationAction,
  getVerificationDocumentSignedUrlAction,
  type VerificationQueueItem,
} from "@/app/actions/verifikasi";

interface VerifikatorDashboardProps {
  subperan: string;
}

export function VerifikatorDashboard({ subperan }: VerifikatorDashboardProps) {
  const [activeTab, setActiveTab] = useState<"Verifikasi" | "Riwayat">("Verifikasi");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [items, setItems] = useState<VerificationQueueItem[]>([]);

  // Modal Peninjauan
  const [selectedItem, setSelectedItem] = useState<VerificationQueueItem | null>(null);
  const [actionType, setActionType] = useState<"disetujui" | "ditolak" | null>(null);
  const [note, setNote] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Signed URLs dokumen yang sedang dibuka
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});
  const [loadingDoc, setLoadingDoc] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    const statusParam = activeTab === "Verifikasi" ? "menunggu" : "semua";
    const res = await listVerificationQueueAction(statusParam);
    setLoading(false);

    if (res.success && res.data) {
      // Jika tab Riwayat, tampilkan yang sudah diproses (disetujui / ditolak)
      if (activeTab === "Riwayat") {
        setItems(res.data.filter((i) => i.status !== "menunggu"));
      } else {
        setItems(res.data.filter((i) => i.status === "menunggu"));
      }
    } else {
      setErrorMsg(res.error || "Gagal memuat antrean verifikasi.");
      setItems([]);
    }
  }, [activeTab]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  // Buka detail berkas
  const handleOpenDetail = async (item: VerificationQueueItem) => {
    setSelectedItem(item);
    setActionType(null);
    setNote("");
    setValidUntil("");
    setActionError(null);

    // Ambil signed URL untuk berkas lampiran
    if (item.document_paths && item.document_paths.length > 0) {
      setLoadingDoc(true);
      const urlMap: Record<string, string> = {};
      for (const p of item.document_paths) {
        const sRes = await getVerificationDocumentSignedUrlAction(p);
        if (sRes.success && sRes.signedUrl) {
          urlMap[p] = sRes.signedUrl;
        }
      }
      setDocUrls(urlMap);
      setLoadingDoc(false);
    } else {
      setDocUrls({});
    }
  };

  const handleExecuteReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !actionType) return;

    if (actionType === "ditolak" && !note.trim()) {
      setActionError("Alasan penolakan berkas wajib disertakan.");
      return;
    }

    setActionLoading(true);
    setActionError(null);

    const res = await reviewVerificationAction({
      id: selectedItem.id,
      decision: actionType,
      note: note.trim() || undefined,
      validUntil: validUntil ? validUntil : undefined,
    });

    setActionLoading(false);

    if (!res.success) {
      setActionError(res.error || "Gagal memproses verifikasi.");
      return;
    }

    // Sukses: tutup modal & segarkan daftar
    setSelectedItem(null);
    setActionType(null);
    await loadData();
  };

  return (
    <div className="min-h-screen text-[#464858]" data-navbar-tone="light" data-portal-wallpaper="true">
      <Navbar
        variant="verifikator"
        facilityName={`Wilayah ${subperan.toUpperCase()}`}
        userName="Petugas Verifikator"
        userRole="Verifikator Administrasi"
        activeItem={activeTab}
        onItemClick={(item) => {
          if (item === "Verifikasi" || item === "Riwayat") {
            setActiveTab(item);
          }
        }}
        forceGlass={true}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        {/* Banner Identitas & Kewenangan Wilayah */}
        <Reveal>
          <div className="bg-white rounded-[24px] border border-[#E2E8F0] p-6 sm:p-8 shadow-sm mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-[#8F5A4E] uppercase tracking-wider">
                    Portal Verifikasi Administrasi Wilayah
                  </span>
                  <Badge variant="info">Tanpa Data Medis</Badge>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#0F3040]">
                  {activeTab === "Verifikasi" ? "Antrean Permohonan Masuk" : "Riwayat Verifikasi Selesai"}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
                  Memverifikasi berkas domisili dan keterangan kurang mampu (SKTM) sesuai batas wilayah kewenangan Anda.
                </p>
              </div>

              {/* Tab Selector Navigasi */}
              <div className="flex items-center gap-2 bg-[#F8FAFC] p-1.5 rounded-2xl border border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setActiveTab("Verifikasi")}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    activeTab === "Verifikasi"
                      ? "bg-[#0F3040] text-white shadow-2xs"
                      : "text-slate-600 hover:bg-[#E2E8F0]"
                  }`}
                >
                  Antrean Aktif
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("Riwayat")}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    activeTab === "Riwayat"
                      ? "bg-[#0F3040] text-white shadow-2xs"
                      : "text-slate-600 hover:bg-[#E2E8F0]"
                  }`}
                >
                  Riwayat Diproses
                </button>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Galat jika gagal muat */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-[16px] bg-[#FDECEA] border border-[#B3261E]/20 text-[#B3261E] text-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tabel Antrean */}
        {loading ? (
          <Card variant="white" className="p-12 text-center shadow-sm border border-[#E2E8F0]">
            <Loader2 className="w-8 h-8 text-[#8F5A4E] animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#0F3040]">Memuat antrean verifikasi...</p>
          </Card>
        ) : items.length === 0 ? (
          <Reveal delayMs={100}>
            <Card variant="white" className="p-12 text-center shadow-sm border border-[#E2E8F0] rounded-[24px]">
              <div className="w-14 h-14 rounded-2xl bg-[#EDF7F2] flex items-center justify-center text-[#1B6B4D] mx-auto mb-4 border border-[#A8D5BD]">
                <FileCheck className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-[#0F3040]">
                {activeTab === "Verifikasi" ? "Tidak Ada Permohonan Menunggu" : "Belum Ada Riwayat Peninjauan"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
                {activeTab === "Verifikasi"
                  ? "Semua permohonan dalam cakupan wilayah Anda telah ditinjau."
                  : "Daftar permohonan yang disetujui atau ditolak akan tersimpan rapi di sini."}
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
                      <th className="py-3.5 px-4 sm:px-6">Nama Pemohon &amp; NIK</th>
                      <th className="py-3.5 px-4">Jenis Verifikasi</th>
                      <th className="py-3.5 px-4">Wilayah Domisili</th>
                      <th className="py-3.5 px-4">Tanggal Pengajuan</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 sm:px-6 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-xs">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-4 sm:px-6">
                          <span className="font-bold text-[#0F3040] block">{item.subject_name}</span>
                          <span className="text-[11px] font-mono text-slate-500">
                            NIK: {item.nik_masked ?? "-"}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          <span className="font-semibold text-[#0F3040] block capitalize">
                            {item.type === "domisili" ? "Verifikasi Domisili" : "Kurang Mampu (SKTM)"}
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            {item.document_paths.length} berkas terlampir
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1 text-[#0F3040] font-medium">
                            <MapPin className="w-3.5 h-3.5 text-[#8F5A4E] shrink-0" />
                            <span>
                              {item.village ? `${item.village}, ` : ""}
                              {item.district}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block ml-4.5">{item.city}</span>
                        </td>

                        <td className="py-4 px-4 text-slate-500">
                          {new Date(item.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>

                        <td className="py-4 px-4">
                          {item.status === "disetujui" ? (
                            <Badge variant="selesai">Disetujui</Badge>
                          ) : item.status === "ditolak" ? (
                            <Badge variant="bahaya">Ditolak</Badge>
                          ) : (
                            <Badge variant="proses">Menunggu</Badge>
                          )}
                        </td>

                        <td className="py-4 px-4 sm:px-6 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F3040] text-white text-xs font-semibold hover:bg-[#0A2230] transition-colors"
                          >
                            <span>Tinjau Berkas</span>
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

        {/* ── MODAL PENINJAUAN & VERIFIKASI ── */}
        {selectedItem && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-[24px] max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-[#E2E8F0]">
              {/* Header Modal */}
              <div className="flex items-start justify-between pb-4 border-b border-[#E2E8F0]">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="info">
                      {selectedItem.type === "domisili" ? "Verifikasi Domisili" : "Verifikasi Kurang Mampu"}
                    </Badge>
                    {selectedItem.status === "disetujui" ? (
                      <Badge variant="selesai">Disetujui</Badge>
                    ) : selectedItem.status === "ditolak" ? (
                      <Badge variant="bahaya">Ditolak</Badge>
                    ) : (
                      <Badge variant="proses">Menunggu Keputusan</Badge>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-[#0F3040] mt-1.5">{selectedItem.subject_name}</h2>
                  <p className="text-xs text-slate-500 font-mono">NIK: {selectedItem.nik_masked}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Data Administrasi Wilayah */}
              <div className="py-4 space-y-3 text-xs">
                <div className="bg-[#FAF5F2] p-3.5 rounded-xl border border-[#E2E8F0]">
                  <span className="text-slate-400 block mb-0.5">Wilayah Domisili Pemohon</span>
                  <p className="font-semibold text-[#0F3040] text-sm">
                    {selectedItem.village ? `Kel. ${selectedItem.village}, ` : ""}
                    Kec. {selectedItem.district}, {selectedItem.city}
                  </p>
                  <span className="text-[11px] text-slate-500 block mt-0.5">{selectedItem.province}</span>
                </div>

                {selectedItem.patient_note && (
                  <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E2E8F0]">
                    <span className="text-slate-400 block mb-0.5">Catatan Pemohon</span>
                    <p className="text-slate-700 italic leading-relaxed">&ldquo;{selectedItem.patient_note}&rdquo;</p>
                  </div>
                )}

                {/* Berkas Lampiran */}
                <div>
                  <span className="text-xs font-bold text-[#0F3040] block mb-2 uppercase tracking-wider">
                    Dokumen Pendukung ({selectedItem.document_paths.length})
                  </span>
                  {loadingDoc ? (
                    <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[#8F5A4E]" />
                      <span>Menyiapkan akses berkas aman...</span>
                    </div>
                  ) : selectedItem.document_paths.length === 0 ? (
                    <p className="text-xs text-slate-400">Tidak ada lampiran dokumen digital.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedItem.document_paths.map((p, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-[#8F5A4E] shrink-0" />
                            <span className="text-xs font-mono text-slate-600 truncate">{p.split("/").pop()}</span>
                          </div>
                          {docUrls[p] ? (
                            <a
                              href={docUrls[p]}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1 rounded-lg bg-[#FAF5F2] hover:bg-[#F0EAE6] text-[#8F5A4E] font-semibold text-xs inline-flex items-center gap-1 shrink-0"
                            >
                              <span>Lihat Berkas</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400">Gagal memuat URL</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Hasil Review Sebelumnya (jika sudah ditinjau) */}
                {selectedItem.review_note && (
                  <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <span className="text-slate-400 block mb-0.5">Catatan Peninjauan</span>
                    <p className="text-slate-700 font-medium leading-relaxed">{selectedItem.review_note}</p>
                    {selectedItem.valid_until && (
                      <span className="text-[11px] text-[#1B6B4D] font-semibold block mt-1">
                        Berlaku hingga: {new Date(selectedItem.valid_until).toLocaleDateString("id-ID")}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* ── FORM AKSI VERIFIKATOR (Hanya jika status 'menunggu') ── */}
              {selectedItem.status === "menunggu" && (
                <div className="pt-4 border-t border-[#E2E8F0]">
                  {!actionType ? (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => { setActionType("ditolak"); setActionError(null); }}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#FDECEA] text-[#B3261E] hover:bg-[#FCD8D4] transition-colors inline-flex items-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Tolak Permohonan</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setActionType("disetujui"); setActionError(null); }}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#EDF7F2] text-[#1B6B4D] hover:bg-[#D8F0E4] transition-colors inline-flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Setujui Permohonan</span>
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleExecuteReview} className="p-4 rounded-2xl bg-[#FAF5F2] border border-[#E2E8F0] space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                        <h4 className="text-xs font-bold text-[#0F3040] uppercase tracking-wider">
                          Konfirmasi: {actionType === "disetujui" ? "Setujui Permohonan" : "Tolak Permohonan"}
                        </h4>
                        <button
                          type="button"
                          onClick={() => setActionType(null)}
                          className="text-xs text-slate-500 hover:underline"
                        >
                          Batal
                        </button>
                      </div>

                      {/* Jika Setujui: Input tanggal berlaku sampai (opsional) */}
                      {actionType === "disetujui" && (
                        <div>
                          <label htmlFor="validUntilInput" className="text-xs font-semibold text-slate-600 block mb-1">
                            Masa Berlaku Verifikasi (Opsional)
                          </label>
                          <input
                            id="validUntilInput"
                            type="date"
                            value={validUntil}
                            onChange={(e) => setValidUntil(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#0F3040] focus:outline-hidden focus:ring-2 focus:ring-[#0F3040]"
                          />
                        </div>
                      )}

                      {/* Catatan / Alasan (Wajib jika tolak) */}
                      <div>
                        <label htmlFor="verifNoteInput" className="text-xs font-semibold text-slate-600 block mb-1">
                          {actionType === "ditolak" ? (
                            <span>Alasan Penolakan <span className="text-[#B3261E]">*</span></span>
                          ) : (
                            <span>Catatan Verifikasi (Opsional)</span>
                          )}
                        </label>
                        <textarea
                          id="verifNoteInput"
                          rows={2}
                          placeholder={
                            actionType === "ditolak"
                              ? "Contoh: Foto KTP buram / tidak terbaca, lampirkan ulang..."
                              : "Catatan hasil verifikasi berkas..."
                          }
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#0F3040] focus:outline-hidden focus:ring-2 focus:ring-[#0F3040]"
                          required={actionType === "ditolak"}
                        />
                      </div>

                      {actionError && (
                        <div className="p-2.5 rounded-xl bg-[#FDECEA] border border-[#B3261E]/30 text-[#B3261E] text-xs flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>{actionError}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setActionType(null)}
                          className="px-3.5 py-1.5 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          disabled={actionLoading}
                          className="px-4 py-2 rounded-xl bg-[#0F3040] text-white text-xs font-semibold hover:bg-[#0A2230] disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
                        >
                          {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          <span>{actionType === "disetujui" ? "Simpan Persetujuan" : "Simpan Penolakan"}</span>
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
