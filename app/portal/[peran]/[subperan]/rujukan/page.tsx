"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
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

interface ReferralDisplayItem {
  id: string;
  patientName: string;
  patientNik: string;
  destinationFacilityName: string;
  destinationCity: string;
  poli: string;
  priority: "elektif" | "urgent" | "gawat_darurat" | string;
  status: "diajukan" | "diterima" | "dijadwalkan" | "selesai" | "ditolak" | string;
  diagnosisIcd10: string;
  catatanKlinis: string;
  createdAt: string;
}

const BULAN_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Ags",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

function formatDateTimeIndo(isoString?: string | null): string {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const dateNum = d.getDate();
    const month = BULAN_NAMES[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${dateNum} ${month} ${year}, ${hours}:${minutes} WIB`;
  } catch {
    return isoString;
  }
}

function maskNik(nik?: string | null): string {
  if (!nik) return "-";
  const clean = nik.trim();
  if (clean.length < 8) return clean;
  return `${clean.slice(0, 4)} •••• •••• ${clean.slice(-4)}`;
}

export default function DaftarRujukanFaskesPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { peran, subperan } = resolvedParams;

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [facilityInfo, setFacilityInfo] = useState<{
    facilityId: string;
    facilityName: string;
    staffName: string;
    staffRole: string;
  } | null>(null);

  const [referrals, setReferrals] = useState<ReferralDisplayItem[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isCancelled = false;

    async function loadReferralsData() {
      try {
        const supabase = createClient();

        // 1. Periksa sesi login
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (isCancelled) return;

        if (!user) {
          router.replace("/");
          return;
        }

        // 2. Dapatkan profil dan data facility_staff
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();

        const { data: staff, error: staffErr } = await supabase
          .from("facility_staff")
          .select("id, staff_role, status, facility_id, facilities(id, name)")
          .eq("profile_id", user.id)
          .maybeSingle();

        if (isCancelled) return;

        if (staffErr) {
          setErrorMsg("Gagal memverifikasi staf faskes: " + staffErr.message);
          setLoading(false);
          return;
        }

        if (!staff || !staff.facility_id) {
          setErrorMsg("Akun Anda belum terhubung ke fasilitas kesehatan.");
          setLoading(false);
          return;
        }

        const facData = staff.facilities as unknown as { id: string; name: string } | null;
        const facName = facData?.name || "Fasilitas Kesehatan";

        setFacilityInfo({
          facilityId: staff.facility_id,
          facilityName: facName,
          staffName: profile?.full_name || "Tenaga Medis",
          staffRole: staff.staff_role,
        });

        // 3. Ambil data referrals buatan faskes ini (where origin_facility_id = facility milik user)
        const { data: rawReferrals, error: refError } = await supabase
          .from("referrals")
          .select("*")
          .eq("origin_facility_id", staff.facility_id)
          .order("created_at", { ascending: false });

        if (isCancelled) return;

        if (refError) {
          setErrorMsg("Gagal memuat daftar rujukan: " + refError.message);
          setLoading(false);
          return;
        }

        if (!rawReferrals || rawReferrals.length === 0) {
          setReferrals([]);
          setLoading(false);
          return;
        }

        interface RawReferralRow {
          id: string;
          patient_id: string;
          destination_facility_id: string;
          destination_doctor_id?: string | null;
          poli: string;
          priority: string;
          status: string;
          diagnosis_icd10: string;
          catatan_klinis: string;
          created_at: string;
        }

        interface RawPatientRow {
          id: string;
          nik: string | null;
          profiles: { full_name: string } | { full_name: string }[] | null;
        }

        interface RawFacilityRow {
          id: string;
          name: string | null;
          city: string | null;
        }

        const referralRows = rawReferrals as RawReferralRow[];

        // 4. Kumpulkan ID pasien dan ID faskes tujuan untuk query data relasi
        const patientIds = Array.from(new Set(referralRows.map((r) => r.patient_id).filter(Boolean)));
        const destinationIds = Array.from(new Set(referralRows.map((r) => r.destination_facility_id).filter(Boolean)));

        // Ambil data pasien
        const patientMap: Record<string, { nama: string; nik: string }> = {};
        if (patientIds.length > 0) {
          const { data: patientsData } = await supabase
            .from("patients")
            .select("id, nik, profiles(full_name)")
            .in("id", patientIds);

          if (patientsData) {
            (patientsData as unknown as RawPatientRow[]).forEach((p) => {
              const pf = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
              patientMap[p.id] = {
                nama: pf?.full_name || "Pasien",
                nik: p.nik || "-",
              };
            });
          }
        }

        // Ambil data faskes tujuan
        const facilityMap: Record<string, { name: string; city: string }> = {};
        if (destinationIds.length > 0) {
          const { data: facilitiesData } = await supabase
            .from("facilities")
            .select("id, name, city")
            .in("id", destinationIds);

          if (facilitiesData) {
            (facilitiesData as unknown as RawFacilityRow[]).forEach((f) => {
              facilityMap[f.id] = {
                name: f.name || "Rumah Sakit Rujukan",
                city: f.city || "",
              };
            });
          }
        }

        if (isCancelled) return;

        // 5. Gabungkan menjadi daftar tampilan yang rapi
        const formatted: ReferralDisplayItem[] = referralRows.map((r) => ({
          id: r.id,
          patientName: patientMap[r.patient_id]?.nama || "Pasien Terdaftar",
          patientNik: patientMap[r.patient_id]?.nik || "-",
          destinationFacilityName: facilityMap[r.destination_facility_id]?.name || "Rumah Sakit",
          destinationCity: facilityMap[r.destination_facility_id]?.city || "",
          poli: r.poli || "Poli Spesialis",
          priority: r.priority || "elektif",
          status: r.status || "diajukan",
          diagnosisIcd10: r.diagnosis_icd10 || "-",
          catatanKlinis: r.catatan_klinis || "-",
          createdAt: r.created_at,
        }));

        setReferrals(formatted);
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

    loadReferralsData();

    return () => {
      isCancelled = true;
    };
  }, [router, reloadKey]);

  const handleRefresh = () => {
    setLoading(true);
    setErrorMsg(null);
    setReloadKey((k) => k + 1);
  };

  // Helper pemetaan StatusIcon & label
  const renderStatus = (status: string) => {
    let iconStatus: StatusType = "proses";
    let label = "Diajukan";

    if (status === "diterima" || status === "selesai") {
      iconStatus = "selesai";
      label = status === "diterima" ? "Diterima" : "Selesai";
    } else if (status === "dijadwalkan") {
      iconStatus = "proses";
      label = "Dijadwalkan";
    } else if (status === "ditolak") {
      iconStatus = "belum";
      label = "Ditolak";
    }

    return (
      <div className="inline-flex items-center gap-2">
        <StatusIcon status={iconStatus} size="sm" />
        <span className="text-xs font-semibold capitalize text-[#0F3040]">{label}</span>
      </div>
    );
  };

  // Helper pemetaan prioritas
  const renderPriorityBadge = (priority: string) => {
    if (priority === "gawat_darurat") {
      return (
        <Badge variant="bahaya" showDot>
          Gawat Darurat
        </Badge>
      );
    }
    if (priority === "urgent") {
      return (
        <Badge variant="proses" showDot>
          Urgent
        </Badge>
      );
    }
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
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#0F3040] hover:text-[#8F5A4E] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Portal {subperan === "puskesmas" ? "Puskesmas" : "Klinik"}</span>
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
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold bg-[#8F5A4E] text-white hover:bg-[#A56F63] transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Rujukan Baru</span>
            </Link>
          </div>
        </div>

        {/* Header Rujukan */}
        <Reveal>
          <Card variant="white" className="p-6 sm:p-8 shadow-sm border border-[#E2E8F0] mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="info">Faskes Pengirim</Badge>
                  <span className="text-xs text-slate-500 font-medium">
                    {facilityInfo?.facilityName}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F3040] tracking-tight">
                  Daftar Rujukan Pasien Keluar
                </h1>
                <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                  Pantau seluruh berkas surat rujukan digital yang diterbitkan oleh faskes ini ke rumah
                  sakit rujukan sekunder.
                </p>
              </div>

              {/* Ringkasan Jumlah Rujukan */}
              <div className="flex items-center gap-4 bg-[#FAF5F2] px-5 py-3 rounded-[18px] border border-[#E2E8F0]">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                    Total Rujukan
                  </span>
                  <span className="text-2xl font-extrabold text-[#0F3040] tabular-nums">
                    {referrals.length}
                  </span>
                </div>
                <div className="w-px h-8 bg-[#E2E8F0]" />
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                    Urgensi Tinggi
                  </span>
                  <span className="text-2xl font-extrabold text-[#B3261E] tabular-nums">
                    {referrals.filter((r) => r.priority === "gawat_darurat" || r.priority === "urgent").length}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </Reveal>

        {/* Galat jika gagal muat */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-[16px] bg-[#FDECEA] border border-[#B3261E]/20 text-[#B3261E] text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
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
        ) : referrals.length === 0 ? (
          <Reveal delayMs={100}>
            <Card variant="white" className="p-10 sm:p-14 text-center shadow-sm border border-[#E2E8F0]">
              <div className="w-14 h-14 rounded-2xl bg-[#FAF5F2] flex items-center justify-center text-[#8F5A4E] mx-auto mb-4 border border-[#E2E8F0]">
                <FileText className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-[#0F3040]">Belum Ada Rujukan yang Diterbitkan</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
                Fasilitas kesehatan ini belum memiliki riwayat pengiriman rujukan digital ke rumah sakit
                lanjutan. Klik tombol di bawah untuk membuat surat rujukan pertama.
              </p>
              <div className="mt-6">
                <Link
                  href={`/portal/${peran}/${subperan}/rujukan/baru`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#8F5A4E] text-white text-xs sm:text-sm font-semibold hover:bg-[#A56F63] transition-colors shadow-sm"
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
                        {/* Pasien */}
                        <td className="py-4 px-4 sm:px-6">
                          <span className="font-bold text-[#0F3040] block">{item.patientName}</span>
                          <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                            NIK: {maskNik(item.patientNik)}
                          </span>
                        </td>

                        {/* RS Tujuan & Poli */}
                        <td className="py-4 px-4">
                          <span className="font-semibold text-[#0F3040] block">
                            {item.destinationFacilityName}
                          </span>
                          <span className="text-[11px] text-[#8F5A4E] font-medium block">
                            {item.poli}
                          </span>
                          {item.destinationCity && (
                            <span className="text-[10px] text-slate-400 block">
                              {item.destinationCity}
                            </span>
                          )}
                        </td>

                        {/* Prioritas */}
                        <td className="py-4 px-4">
                          {renderPriorityBadge(item.priority)}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4">
                          {renderStatus(item.status)}
                        </td>

                        {/* Diagnosis */}
                        <td className="py-4 px-4 max-w-[200px]">
                          <span className="font-semibold text-[#0F3040] block truncate">
                            {item.diagnosisIcd10}
                          </span>
                          <span className="text-[11px] text-slate-500 block truncate" title={item.catatanKlinis}>
                            {item.catatanKlinis}
                          </span>
                        </td>

                        {/* Waktu */}
                        <td className="py-4 px-4 sm:px-6 text-slate-500 whitespace-nowrap">
                          {formatDateTimeIndo(item.createdAt)}
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
