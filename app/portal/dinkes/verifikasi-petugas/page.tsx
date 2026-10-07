"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  UserCheck,
  Building,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RotateCw,
  MapPin,
  Mail,
} from "lucide-react";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { Navbar } from "@/components/Navbar";
import { Reveal } from "@/components/Reveal";
import {
  listPendingVerifiersAction,
  reviewVerifierAction,
  type PendingVerifierItem,
} from "@/app/actions/verifikasi";

export default function DinkesVerifikasiPetugasPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verifiers, setVerifiers] = useState<PendingVerifierItem[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    const res = await listPendingVerifiersAction();
    setLoading(false);

    if (res.success && res.data) {
      setVerifiers(res.data);
    } else {
      setErrorMsg(res.error || "Gagal memuat permohonan verifikator.");
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, []);

  const handleReview = async (id: string, decision: "aktif" | "ditolak", name: string) => {
    setProcessingId(id);
    setActionSuccess(null);
    setErrorMsg(null);

    const res = await reviewVerifierAction({ id, decision });
    setProcessingId(null);

    if (res.success) {
      setActionSuccess(`Akun verifikator ${name} berhasil ${decision === "aktif" ? "diaktifkan" : "ditolak"}.`);
      await loadData();
    } else {
      setErrorMsg(res.error || "Gagal memproses permohonan.");
    }
  };

  return (
    <div className="min-h-screen text-[#464858]" data-navbar-tone="light" data-portal-wallpaper="true">
      <Navbar
        variant="dinkes"
        facilityName="Dinas Kesehatan Kota Semarang"
        userName="Administrator Dinkes"
        userRole="Dinas Kesehatan"
        activeItem="Verifikasi Faskes"
        forceGlass={true}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        {/* Header Dinkes */}
        <Reveal>
          <div className="bg-white rounded-[24px] border border-[#E2E8F0] p-6 sm:p-8 shadow-sm mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-[#8F5A4E] uppercase tracking-wider">
                  Pusat Kendali Dinas Kesehatan
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#0F3040] mt-1">
                  Persetujuan Akun Petugas Verifikator
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
                  Validasi dan aktifkan akun petugas verifikator administrasi (Kelurahan, Kecamatan, dan Dinas Sosial) untuk memeriksa domisili dan jaminan biaya.
                </p>
              </div>

              {/* Navigasi Dinkes */}
              <div className="flex items-center gap-2">
                <Link
                  href="/portal/dinkes/verifikasi-faskes"
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-[#E2E8F0] bg-white text-slate-600 hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5"
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>Verifikasi Faskes</span>
                </Link>
                <button
                  type="button"
                  onClick={loadData}
                  className="p-2 rounded-xl border border-[#E2E8F0] bg-white text-slate-600 hover:bg-slate-50 transition-colors"
                  title="Segarkan data"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Notifikasi feedback */}
        {actionSuccess && (
          <div className="mb-6 p-4 rounded-[16px] bg-[#EDF7F2] border border-[#A8D5BD] text-[#1B6B4D] text-xs font-semibold flex items-center justify-between">
            <span>{actionSuccess}</span>
            <button type="button" onClick={() => setActionSuccess(null)} className="text-slate-400 hover:text-slate-600">
              Tutup
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 rounded-[16px] bg-[#FDECEA] border border-[#B3261E]/20 text-[#B3261E] text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tabel / Daftar Permohonan */}
        {loading ? (
          <Card variant="white" className="p-12 text-center shadow-sm border border-[#E2E8F0]">
            <Loader2 className="w-8 h-8 text-[#8F5A4E] animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#0F3040]">Memuat permohonan petugas verifikator...</p>
          </Card>
        ) : verifiers.length === 0 ? (
          <Reveal delayMs={100}>
            <Card variant="white" className="p-12 text-center shadow-sm border border-[#E2E8F0] rounded-[24px]">
              <div className="w-14 h-14 rounded-2xl bg-[#EDF7F2] flex items-center justify-center text-[#1B6B4D] mx-auto mb-4 border border-[#A8D5BD]">
                <UserCheck className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-[#0F3040]">Tidak Ada Permohonan Menunggu</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
                Semua pendaftaran akun petugas verifikator telah ditinjau dan berstatus aktif atau ditolak.
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
                      <th className="py-3.5 px-4 sm:px-6">Nama Petugas &amp; NIP</th>
                      <th className="py-3.5 px-4">Tingkat &amp; Jabatan</th>
                      <th className="py-3.5 px-4">Wilayah Tugas</th>
                      <th className="py-3.5 px-4">Kontak</th>
                      <th className="py-3.5 px-4 sm:px-6 text-right">Aksi Persetujuan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-xs">
                    {verifiers.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-4 sm:px-6">
                          <span className="font-bold text-[#0F3040] block">{v.full_name}</span>
                          <span className="text-[11px] font-mono text-slate-500">NIP: {v.nip || "-"}</span>
                        </td>

                        <td className="py-4 px-4">
                          <Badge variant="info" className="capitalize mb-1">
                            Tingkat {v.level}
                          </Badge>
                          <span className="text-[11px] text-slate-600 block">{v.jabatan || "-"}</span>
                          {v.unit && <span className="text-[10px] text-slate-400 block">{v.unit}</span>}
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1 text-[#0F3040] font-medium">
                            <MapPin className="w-3.5 h-3.5 text-[#8F5A4E] shrink-0" />
                            <span>
                              {v.village ? `Kel. ${v.village}, ` : ""}
                              {v.district ? `Kec. ${v.district}` : ""}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block ml-4.5">{v.city || v.province}</span>
                        </td>

                        <td className="py-4 px-4 text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>{v.email}</span>
                          </div>
                        </td>

                        <td className="py-4 px-4 sm:px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              disabled={processingId === v.id}
                              onClick={() => handleReview(v.id, "ditolak", v.full_name)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FDECEA] text-[#B3261E] hover:bg-[#FCD8D4] disabled:opacity-50 transition-colors inline-flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Tolak</span>
                            </button>
                            <button
                              type="button"
                              disabled={processingId === v.id}
                              onClick={() => handleReview(v.id, "aktif", v.full_name)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#EDF7F2] text-[#1B6B4D] hover:bg-[#D8F0E4] disabled:opacity-50 transition-colors inline-flex items-center gap-1"
                            >
                              {processingId === v.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              <span>Aktifkan</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </Reveal>
        )}
      </main>
    </div>
  );
}
