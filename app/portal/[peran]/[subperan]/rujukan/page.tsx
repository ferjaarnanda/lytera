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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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

// Hasil rpc list_facility_referrals
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

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [facilityInfo, setFacilityInfo] = useState<{
    facilityName: string;
    staffName: string;
    staffRole: string;
  } | null>(null);

  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

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

        // Info staf (untuk header nama faskes)
        const { data: profile } = await supabase
          .from("profiles").select("full_name").eq("id", user.id).maybeSingle();

        const { data: staff, error: staffErr } = await supabase
          .from("facility_staff")
          .select("id, staff_role, status, facility_id, facilities(id, name)")
          .eq("profile_id", user.id)
          .maybeSingle();

        if (isCancelled) return;

        if (staffErr) { setErrorMsg("Gagal memverifikasi staf faskes: " + staffErr.message); setLoading(false); return; }
        if (!staff || !staff.facility_id) { setErrorMsg("Akun Anda belum terhubung ke fasilitas kesehatan."); setLoading(false); return; }

        const facData = staff.facilities as unknown as { id: string; name: string } | null;
        setFacilityInfo({
          facilityName: facData?.name || "Fasilitas Kesehatan",
          staffName: profile?.full_name || "Tenaga Medis",
          staffRole: staff.staff_role,
        });

        // Pakai rpc list_facility_referrals('keluar')
        const { data, error: refError } = await supabase.rpc("list_facility_referrals", {
          p_direction: "keluar",
        });

        if (isCancelled) return;

        if (refError) { setErrorMsg("Gagal memuat daftar rujukan: " + refError.message); setLoading(false); return; }

        setReferrals(Array.isArray(data) ? (data as ReferralRow[]) : []);
      } catch (err: unknown) {
        if (!isCancelled) {
          setErrorMsg("Terjadi kendala saat memuat data: " + (err instanceof Error ? err.message : String(err)));
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    load();
    return () => { isCancelled = true; };
  }, [router, reloadKey]);

  const handleRefresh = () => { setLoading(true); setErrorMsg(null); setReloadKey((k) => k + 1); };

  const renderStatus = (status: string) => {
    let iconStatus: StatusType = "proses";
    let label = "Diajukan";
    if (status === "diterima") { iconStatus = "selesai"; label = "Diterima"; }
    else if (status === "dijadwalkan") { iconStatus = "proses"; label = "Dijadwalkan"; }
    else if (status === "selesai") { iconStatus = "selesai"; label = "Selesai"; }
    else if (status === "ditolak") { iconStatus = "belum"; label = "Ditolak"; }
    return (
      <div className="inline-flex items-center gap-2">
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
        userRole={facilityInfo?.staffRole === "dokter" ? "Dokter Faskes" : "Petugas Faskes"}
        forceGlass={true}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-20">
        {/* Navigasi Atas & Aksi */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            href={`/portal/${peran}/${subperan}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white transition-colors"
          >
            ← Kembali ke Portal {subperan === "puskesmas" ? "Puskesmas" : "Klinik"}
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

            <Link
              href={`/portal/${peran}/${subperan}/rujukan/baru`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-[#8F5A4E] text-white hover:bg-[#A56F63] transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Rujukan Baru</span>
            </Link>
          </div>
        </div>

        {/* Header */}
        <Reveal>
          <Card variant="white" className="p-6 sm:p-8 shadow-sm border border-[#E2E8F0] mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="info">Faskes Pengirim</Badge>
                  <span className="text-xs text-slate-500 font-medium">{facilityInfo?.facilityName}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F3040] tracking-tight">
                  Daftar Rujukan Pasien Keluar
                </h1>
                <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                  Pantau seluruh berkas surat rujukan digital yang diterbitkan oleh faskes ini ke rumah sakit rujukan sekunder.
                </p>
              </div>

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
          </Card>
        </Reveal>

        {/* Galat */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-[16px] bg-[#FDECEA] border border-[#B3261E]/20 text-[#B3261E] text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Gagal Memuat Rujukan</p>
              <p className="text-xs mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Konten */}
        {loading ? (
          <Card variant="white" className="p-12 text-center shadow-sm border border-[#E2E8F0]">
            <Loader2 className="w-8 h-8 text-[#8F5A4E] animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#0F3040]">Memuat data rujukan faskes...</p>
          </Card>
        ) : referrals.length === 0 ? (
          <Reveal delayMs={100}>
            <Card variant="white" className="p-10 sm:p-14 text-center shadow-sm border border-[#E2E8F0]">
              <div className="w-14 h-14 rounded-2xl bg-[#FAF5F2] flex items-center justify-center text-[#8F5A4E] mx-auto mb-4 border border-[#E2E8F0]">
                <FileText className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-[#0F3040]">Belum Ada Rujukan yang Diterbitkan</h2>
              <p className="text-sm text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
                Fasilitas kesehatan ini belum memiliki riwayat pengiriman rujukan digital ke rumah sakit lanjutan.
              </p>
              <div className="mt-6">
                <Link
                  href={`/portal/${peran}/${subperan}/rujukan/baru`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#8F5A4E] text-white text-sm font-semibold hover:bg-[#A56F63] transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Buat Rujukan Pasien Baru</span>
                </Link>
              </div>
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
                      <th className="py-3.5 px-4">Rumah Sakit &amp; Poli</th>
                      <th className="py-3.5 px-4">Prioritas</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Diagnosis ICD-10</th>
                      <th className="py-3.5 px-4 sm:px-6">Waktu Pengajuan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-xs">
                    {referrals.map((item) => (
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
                          <span className="font-semibold text-[#0F3040] block">{item.destination_name}</span>
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

                        <td className="py-4 px-4 sm:px-6 text-slate-500 whitespace-nowrap">
                          {formatDateTimeIndo(item.created_at)}
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
