"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  User,
  Building2,
  Stethoscope,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { buatRujukanAction } from "@/app/actions/rujukan";
import { Card, CardInner } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { Navbar } from "@/components/Navbar";
import { Reveal } from "@/components/Reveal";

interface PageProps {
  params: Promise<{
    peran: string;
    subperan: string;
  }>;
}

interface FoundPatient {
  id: string;
  nik: string;
  nama: string;
  dob: string | null;
  gender: string | null;
  phone: string | null;
  alamat: string | null;
  bpjsNumber: string | null;
  wilayah: string;
}

interface HospitalOption {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
}

interface DoctorOption {
  id: string;
  name: string;
  specialization: string | null;
}

const POLI_OPTIONS = [
  "Poli Penyakit Dalam",
  "Poli Jantung & Pembuluh Darah",
  "Poli Bedah Umum",
  "Poli Anak (Pediatri)",
  "Poli Saraf (Neurologi)",
  "Poli Mata (Oftalmologi)",
  "Poli Telinga Hidung Tenggorok (THT)",
  "Poli Kebidanan & Kandungan (Obgyn)",
  "Poli Paru & Saluran Napas",
  "Poli Kulit & Kelamin (Dermatologi)",
  "Poli Jiwa (Psikiatri)",
  "Poli Ortopedi & Traumatologi",
  "Poli Gigi & Mulut Spesialistik",
];

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

function maskNik(nik?: string | null): string {
  if (!nik) return "-";
  const clean = nik.trim();
  if (clean.length < 8) return clean;
  return `${clean.slice(0, 4)} •••• •••• ${clean.slice(-4)}`;
}

// Data wilayah pasien (province/city/district/village) disimpan dalam bentuk
// NAMA teks langsung (bukan kode/ID) oleh RegionCombobox, jadi cukup
// digabung apa adanya tanpa perlu tabel terjemahan kode -> nama.
function resolveRegion(
  province?: string | null,
  city?: string | null,
  district?: string | null,
  village?: string | null
): string {
  const parts = [village, district, city, province].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "-";
}

export default function BuatRujukanBaruPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { peran, subperan } = resolvedParams;

  // State Verifikasi Staf & Faskes Asal
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [staffInfo, setStaffInfo] = useState<{
    staffName: string;
    facilityName: string;
    facilityId: string;
    staffRole: string;
  } | null>(null);
  const [unauthorizedMsg, setUnauthorizedMsg] = useState<string | null>(null);

  // State Formulir (a) Pencarian Pasien
  const [searchNik, setSearchNik] = useState("");
  const [searchingPatient, setSearchingPatient] = useState(false);
  const [patientSearchError, setPatientSearchError] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<FoundPatient | null>(null);

  // State Formulir (b) Faskes Tujuan
  const [hospitals, setHospitals] = useState<HospitalOption[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [selectedHospitalId, setSelectedHospitalId] = useState("");

  // State Formulir (c) Dokter Tujuan (Opsional)
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");

  // State Formulir (d) Detail Klinis
  const [poli, setPoli] = useState("Poli Penyakit Dalam");
  const [priority, setPriority] = useState<"elektif" | "urgent" | "gawat_darurat">("elektif");
  const [diagnosisIcd10, setDiagnosisIcd10] = useState("");
  const [catatanKlinis, setCatatanKlinis] = useState("");

  // State Submit
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // 1. Periksa Otorisasi Staf saat komponen dimuat
  useEffect(() => {
    async function checkStaffAuth() {
      setCheckingAuth(true);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/");
          return;
        }

        // Ambil profil
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();

        // Ambil baris facility_staff
        const { data: staff, error: staffErr } = await supabase
          .from("facility_staff")
          .select("id, staff_role, status, facility_id, facilities(id, name, type)")
          .eq("profile_id", user.id)
          .maybeSingle();

        if (staffErr) {
          setUnauthorizedMsg("Gagal memverifikasi status staf: " + staffErr.message);
          setCheckingAuth(false);
          return;
        }

        if (!staff || !staff.facility_id) {
          setUnauthorizedMsg(
            "Akun Anda belum terdaftar sebagai staf pada fasilitas kesehatan mana pun di sistem Lytera."
          );
          setCheckingAuth(false);
          return;
        }

        if (staff.status !== "aktif") {
          setUnauthorizedMsg(
            `Status kepegawaian Anda saat ini '${staff.status}'. Hanya staf aktif yang berwenang menerbitkan surat rujukan.`
          );
          setCheckingAuth(false);
          return;
        }

        if (staff.staff_role !== "dokter" && staff.staff_role !== "petugas") {
          setUnauthorizedMsg(
            "Hak akses terbatas: Hanya dokter dan petugas fasilitas kesehatan yang berwenang membuat rujukan."
          );
          setCheckingAuth(false);
          return;
        }

        // Type cast facilities relationship safely
        const f = staff.facilities as unknown as { id: string; name: string; type: string } | null;
        const facName = f?.name || "Fasilitas Kesehatan";

        setStaffInfo({
          staffName: profile?.full_name || "Tenaga Medis",
          facilityName: facName,
          facilityId: staff.facility_id,
          staffRole: staff.staff_role,
        });

        // Muat daftar rumah sakit tujuan (inline agar tidak ada hoisting issue)
        setLoadingHospitals(true);
        try {
          const { data: hData, error: hError } = await supabase
            .from("facilities")
            .select("id, name, address, city")
            .eq("type", "rumah_sakit")
            .eq("status", "aktif")
            .order("name", { ascending: true });

          if (hError) {
            console.error("Gagal memuat rumah sakit:", hError.message);
          } else if (hData) {
            setHospitals(hData as HospitalOption[]);
            if (hData.length > 0) {
              setSelectedHospitalId(hData[0].id);
            }
          }
        } finally {
          setLoadingHospitals(false);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setUnauthorizedMsg("Terjadi kendala pemeriksaan otorisasi: " + msg);
      } finally {
        setCheckingAuth(false);
      }
    }

    checkStaffAuth();
  }, [router]);

  // Muat Dokter Spesialis saat Rumah Sakit Tujuan Dipilih
  useEffect(() => {
    interface RawDoctorRow {
      id: string;
      specialization?: string | null;
      profiles?: { full_name: string } | { full_name: string }[] | null;
    }

    async function loadDoctors() {
      if (!selectedHospitalId) {
        setDoctors([]);
        setSelectedDoctorId("");
        return;
      }
      setLoadingDoctors(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("facility_staff")
          .select("id, specialization, profiles(full_name)")
          .eq("facility_id", selectedHospitalId)
          .eq("staff_role", "dokter")
          .eq("status", "aktif");

        if (error) {
          console.error("Gagal memuat dokter tujuan:", error.message);
          setDoctors([]);
        } else if (data) {
          const docList: DoctorOption[] = (data as unknown as RawDoctorRow[]).map((d) => {
            const pf = Array.isArray(d.profiles) ? d.profiles[0] : d.profiles;
            return {
              id: d.id,
              name: pf?.full_name ? `dr. ${pf.full_name}` : "Dokter Spesialis",
              specialization: d.specialization || null,
            };
          });
          setDoctors(docList);
        }
      } finally {
        setLoadingDoctors(false);
      }
    }

    loadDoctors();
  }, [selectedHospitalId]);

  // Handler (a) Cari Pasien lewat NIK
  const handleSearchPatient = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanNik = searchNik.trim();

    if (!cleanNik || cleanNik.length !== 16) {
      setPatientSearchError("Masukkan 16 digit NIK pasien dengan lengkap.");
      setSelectedPatient(null);
      return;
    }

    setSearchingPatient(true);
    setPatientSearchError(null);
    setSelectedPatient(null);

    try {
      const supabase = createClient();

      // Query tabel patients where nik = input
      const { data: patient, error: patientErr } = await supabase
        .from("patients")
        .select("id, nik, address, province, city, district, village, dob, gender, phone, bpjs_number, profiles(full_name)")
        .eq("nik", cleanNik)
        .maybeSingle();

      if (patientErr) {
        setPatientSearchError("Gagal memeriksa data pasien: " + patientErr.message);
        return;
      }

      if (!patient) {
        setPatientSearchError("Pasien belum terdaftar di Lytera");
        return;
      }

      const pProfile = patient.profiles as unknown as { full_name: string } | null;
      const namaLengkap = pProfile?.full_name || "Pasien Lytera";
      const wilayahStr = resolveRegion(
        patient.province,
        patient.city,
        patient.district,
        patient.village
      );

      setSelectedPatient({
        id: patient.id,
        nik: patient.nik,
        nama: namaLengkap,
        dob: patient.dob,
        gender: patient.gender,
        phone: patient.phone,
        alamat: patient.address,
        bpjsNumber: patient.bpjs_number,
        wilayah: wilayahStr,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPatientSearchError("Terjadi kendala pencarian pasien: " + msg);
    } finally {
      setSearchingPatient(false);
    }
  };

  // Handler Submit Rujukan
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setFieldErrors({});

    if (!selectedPatient) {
      setServerError("Harap cari dan pilih pasien terlebih dahulu sebelum membuat rujukan.");
      return;
    }

    if (!selectedHospitalId) {
      setServerError("Harap pilih fasilitas kesehatan rumah sakit rujukan tujuan.");
      return;
    }

    if (!diagnosisIcd10.trim()) {
      setFieldErrors((prev) => ({ ...prev, diagnosisIcd10: "Diagnosis ICD-10 wajib diisi" }));
      return;
    }

    if (!catatanKlinis.trim()) {
      setFieldErrors((prev) => ({ ...prev, catatanKlinis: "Catatan klinis wajib diisi minimal 5 karakter" }));
      return;
    }

    setSubmitting(true);

    try {
      const res = await buatRujukanAction({
        patientId: selectedPatient.id,
        destinationFacilityId: selectedHospitalId,
        destinationDoctorId: selectedDoctorId ? selectedDoctorId : null,
        poli,
        priority,
        diagnosisIcd10,
        catatanKlinis,
      });

      if (!res.success) {
        setServerError(res.error || "Gagal menyimpan surat rujukan.");
        if (res.fieldErrors) {
          setFieldErrors(res.fieldErrors);
        }
        return;
      }

      // Berhasil: Redirect ke halaman daftar rujukan buatan faskes ini
      router.push(`/portal/${peran}/${subperan}/rujukan`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setServerError("Terjadi kesalahan jaringan atau server: " + msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Tampilan Memeriksa Otorisasi
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#464858]" data-navbar-tone="light">
        <Navbar variant="dokter-puskesmas" userName="Tenaga Medis" userRole="Fasilitas Kesehatan" />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-16 text-center">
          <Card variant="white" className="p-10 shadow-sm border border-[#E2E8F0]">
            <Loader2 className="w-8 h-8 text-[#8F5A4E] animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#0F3040]">Memverifikasi izin staf fasilitas...</p>
          </Card>
        </main>
      </div>
    );
  }

  // Tampilan Tidak Diizinkan
  if (unauthorizedMsg) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#464858]" data-navbar-tone="light">
        <Navbar variant="dokter-puskesmas" userName="Tenaga Medis" userRole="Fasilitas Kesehatan" />
        <main className="max-w-xl mx-auto px-4 sm:px-6 pt-28 pb-16 text-center">
          <Card variant="white" className="p-8 sm:p-10 shadow-sm border border-[#E2E8F0]">
            <div className="w-12 h-12 rounded-full bg-[#FDECEA] flex items-center justify-center text-[#B3261E] mx-auto mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-[#0F3040] mb-2">Akses Pembuatan Rujukan Dibatasi</h1>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">{unauthorizedMsg}</p>
            <div className="flex justify-center gap-3">
              <Link
                href={`/portal/${peran}/${subperan}`}
                className="px-5 py-2.5 rounded-full bg-[#0F3040] text-white text-xs sm:text-sm font-semibold hover:bg-[#0A2230] transition-colors"
              >
                Kembali ke Portal
              </Link>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#464858]" data-navbar-tone="light">
      <Navbar
        variant="dokter-puskesmas"
        facilityName={staffInfo?.facilityName}
        userName={staffInfo?.staffName || "Tenaga Medis"}
        userRole={staffInfo?.staffRole === "dokter" ? "Dokter Faskes" : "Petugas Faskes"}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-20">
        {/* Navigasi Atas */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href={`/portal/${peran}/${subperan}`}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#0F3040] hover:text-[#8F5A4E] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Portal {subperan === "puskesmas" ? "Puskesmas" : "Klinik"}</span>
          </Link>

          <Link
            href={`/portal/${peran}/${subperan}/rujukan`}
            className="text-xs sm:text-sm font-semibold text-[#8F5A4E] hover:underline"
          >
            Lihat Daftar Rujukan Keluar &rarr;
          </Link>
        </div>

        {/* Header Form */}
        <Reveal>
          <Card variant="white" className="p-6 sm:p-8 shadow-sm border border-[#E2E8F0] mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="info">Fasilitas Primer</Badge>
                  <span className="text-xs text-slate-500 font-medium">
                    Asal: <strong className="text-[#0F3040]">{staffInfo?.facilityName}</strong>
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F3040] tracking-tight">
                  Buat Surat Rujukan Pasien
                </h1>
                <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                  Terbitkan rujukan digital terintegrasi ke rumah sakit rujukan sekunder. Berkas klinis
                  akan langsung terkirim secara aman sesuai standar SatuSehat.
                </p>
              </div>

              <div className="shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#EDF7F2] text-[#1B6B4D]">
                  <span className="w-2 h-2 rounded-full bg-[#1B6B4D] animate-pulse" />
                  Sesi Staf Aktif
                </span>
              </div>
            </div>
          </Card>
        </Reveal>

        {/* Galat Server Utama */}
        {serverError && (
          <div className="mb-6 p-4 rounded-[16px] bg-[#FDECEA] border border-[#B3261E]/20 text-[#B3261E] text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <p className="font-semibold">Gagal Memproses Rujukan</p>
              <p className="text-xs mt-0.5">{serverError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* ============================================================== */}
          {/* LANGKAH (A): CARI PASIEN LEWAT NIK                            */}
          {/* ============================================================== */}
          <Reveal delayMs={100}>
            <Card variant="white" className="p-6 sm:p-8 shadow-sm border border-[#E2E8F0]">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#E2E8F0]">
                <div className="w-9 h-9 rounded-xl bg-[#FAF5F2] flex items-center justify-center text-[#8F5A4E] shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#0F3040]">1. Identitas Pasien</h2>
                  <p className="text-xs text-slate-500">
                    Cari pasien terdaftar di Lytera menggunakan Nomor Induk Kependudukan (NIK 16 digit).
                  </p>
                </div>
              </div>

              {!selectedPatient ? (
                <div>
                  <label htmlFor="search-nik" className="block text-xs font-semibold text-[#0F3040] mb-1.5">
                    Nomor Induk Kependudukan (NIK) Pasien *
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <input
                        id="search-nik"
                        type="text"
                        maxLength={16}
                        inputMode="numeric"
                        value={searchNik}
                        onChange={(e) => setSearchNik(e.target.value.replace(/\D/g, ""))}
                        placeholder="Contoh: 3374012345670001"
                        className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] font-mono tabular-nums text-sm outline-none focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSearchPatient()}
                      disabled={searchingPatient || searchNik.length !== 16}
                      className="h-12 px-6 rounded-[14px] bg-[#0F3040] text-white text-xs sm:text-sm font-semibold hover:bg-[#0A2230] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                    >
                      {searchingPatient ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Mencari...</span>
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4" />
                          <span>Cari Pasien</span>
                        </>
                      )}
                    </button>
                  </div>

                  {patientSearchError && (
                    <div className="mt-4 p-4 rounded-[14px] bg-[#FFF4D6] border border-[#E0A100]/30 text-[#7A5200] text-xs flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#E0A100]" />
                      <div className="leading-relaxed">
                        <span className="font-bold">{patientSearchError}</span>
                        {patientSearchError.includes("belum terdaftar") && (
                          <p className="mt-1 text-slate-600">
                            Pastikan 16 digit NIK telah benar, atau arahkan pasien/keluarga untuk melakukan
                            pendaftaran akun pasien terlebih dahulu agar berkas rekam medis dapat terhubung.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <CardInner variant="cream" className="p-5 border border-[#E2E8F0] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0]/70">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-[#1B6B4D]" />
                      <span className="text-sm font-bold text-[#0F3040]">{selectedPatient.nama}</span>
                      <Badge variant="selesai" showDot>
                        Pasien Terdaftar
                      </Badge>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPatient(null);
                        setSearchNik("");
                      }}
                      className="text-xs font-semibold text-[#8F5A4E] hover:underline text-left"
                    >
                      Ganti Pasien Lain
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block">NIK Pasien:</span>
                      <span className="font-mono font-semibold text-[#0F3040]">
                        {maskNik(selectedPatient.nik)}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block">Tanggal Lahir:</span>
                      <span className="font-semibold text-[#0F3040]">
                        {formatDateIndo(selectedPatient.dob)} (
                        {selectedPatient.gender === "L" ? "Laki-laki" : "Perempuan"})
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block">No. BPJS Kesehatan:</span>
                      <span className="font-semibold text-[#0F3040]">
                        {selectedPatient.bpjsNumber || "Tidak ada"}
                      </span>
                    </div>

                    <div className="sm:col-span-2">
                      <span className="text-slate-500 block">Alamat Domisili:</span>
                      <span className="font-medium text-[#0F3040]">
                        {selectedPatient.alamat || "-"}, {selectedPatient.wilayah}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block">Kontak Pasien:</span>
                      <span className="font-semibold text-[#0F3040]">
                        {selectedPatient.phone || "-"}
                      </span>
                    </div>
                  </div>
                </CardInner>
              )}
            </Card>
          </Reveal>

          {/* ============================================================== */}
          {/* LANGKAH (B) & (C): PILIH FASKES & DOKTER TUJUAN                */}
          {/* ============================================================== */}
          <Reveal delayMs={150}>
            <Card variant="white" className="p-6 sm:p-8 shadow-sm border border-[#E2E8F0]">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#E2E8F0]">
                <div className="w-9 h-9 rounded-xl bg-[#EBF2F6] flex items-center justify-center text-[#0F3040] shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#0F3040]">2. Fasilitas & Dokter Rujukan Tujuan</h2>
                  <p className="text-xs text-slate-500">
                    Pilih rumah sakit rujukan sekunder terakreditasi dan dokter spesialis tujuan.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* (b) Faskes Tujuan */}
                <div>
                  <label htmlFor="hospital-select" className="block text-xs font-semibold text-[#0F3040] mb-1.5">
                    Rumah Sakit Rujukan (Faskes Tujuan) *
                  </label>
                  <select
                    id="hospital-select"
                    value={selectedHospitalId}
                    onChange={(e) => setSelectedHospitalId(e.target.value)}
                    disabled={loadingHospitals || hospitals.length === 0}
                    className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] bg-white text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E]"
                  >
                    {loadingHospitals ? (
                      <option value="">Memuat daftar rumah sakit...</option>
                    ) : hospitals.length === 0 ? (
                      <option value="">Tidak ada rumah sakit aktif ditemukan</option>
                    ) : (
                      hospitals.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name} {h.city ? `(${h.city})` : ""}
                        </option>
                      ))
                    )}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Hanya menampilkan rumah sakit yang terintegrasi aktif pada jaringan Lytera.
                  </p>
                </div>

                {/* (c) Dokter Tujuan (Opsional) */}
                <div>
                  <label htmlFor="doctor-select" className="block text-xs font-semibold text-[#0F3040] mb-1.5">
                    Dokter Spesialis Tujuan (Opsional)
                  </label>
                  <select
                    id="doctor-select"
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    disabled={loadingDoctors || !selectedHospitalId}
                    className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] bg-white text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E]"
                  >
                    <option value="">-- Ditujukan ke Poli Umum RS (Tanpa Dokter Tertentu) --</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.specialization ? `(${d.specialization})` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {loadingDoctors
                      ? "Memuat dokter..."
                      : doctors.length === 0
                      ? "Belum ada dokter spesialis terdaftar khusus di faskes ini."
                      : `${doctors.length} dokter spesialis tersedia di rumah sakit ini.`}
                  </p>
                </div>
              </div>
            </Card>
          </Reveal>

          {/* ============================================================== */}
          {/* LANGKAH (D): DETAIL KLINIS, POLI, PRIORITAS, ICD-10, CATATAN   */}
          {/* ============================================================== */}
          <Reveal delayMs={200}>
            <Card variant="white" className="p-6 sm:p-8 shadow-sm border border-[#E2E8F0]">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#E2E8F0]">
                <div className="w-9 h-9 rounded-xl bg-[#FAF5F2] flex items-center justify-center text-[#8F5A4E] shrink-0">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#0F3040]">3. Informasi Medis & Triase Rujukan</h2>
                  <p className="text-xs text-slate-500">
                    Lengkapi poli spesialisasi, derajat urgensi, kode diagnosis klinis, dan riwayat pemeriksaan.
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                {/* Baris Poli & Prioritas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="poli-input" className="block text-xs font-semibold text-[#0F3040] mb-1.5">
                      Poli Spesialisasi Tujuan *
                    </label>
                    <input
                      id="poli-input"
                      type="text"
                      list="poli-list"
                      value={poli}
                      onChange={(e) => setPoli(e.target.value)}
                      placeholder="Pilih atau ketik poli spesialis"
                      className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E]"
                    />
                    <datalist id="poli-list">
                      {POLI_OPTIONS.map((p) => (
                        <option key={p} value={p} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0F3040] mb-1.5">
                      Derajat Prioritas (Triase Klinis) *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setPriority("elektif")}
                        className={`py-2.5 px-3 rounded-[12px] text-xs font-semibold border transition-all text-center ${
                          priority === "elektif"
                            ? "bg-[#0F3040] text-white border-[#0F3040] shadow-sm"
                            : "bg-white text-slate-600 border-[#E2E8F0] hover:bg-slate-50"
                        }`}
                      >
                        Elektif
                      </button>

                      <button
                        type="button"
                        onClick={() => setPriority("urgent")}
                        className={`py-2.5 px-3 rounded-[12px] text-xs font-semibold border transition-all text-center ${
                          priority === "urgent"
                            ? "bg-[#FFF4D6] text-[#7A5200] border-[#E0A100] ring-2 ring-[#E0A100]/30 shadow-sm"
                            : "bg-white text-slate-600 border-[#E2E8F0] hover:bg-slate-50"
                        }`}
                      >
                        Urgent
                      </button>

                      <button
                        type="button"
                        onClick={() => setPriority("gawat_darurat")}
                        className={`py-2.5 px-3 rounded-[12px] text-xs font-semibold border transition-all text-center ${
                          priority === "gawat_darurat"
                            ? "bg-[#FDECEA] text-[#B3261E] border-[#B3261E] ring-2 ring-[#B3261E]/30 shadow-sm"
                            : "bg-white text-slate-600 border-[#E2E8F0] hover:bg-slate-50"
                        }`}
                      >
                        Gawat Darurat
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {priority === "elektif" && "Rujukan terjadwal untuk kasus stabil kronis / elektif."}
                      {priority === "urgent" && "Penanganan dalam 24-48 jam untuk mencegah komplikasi lanjut."}
                      {priority === "gawat_darurat" && "Kondisi kritis mengancam jiwa atau kegawatdaruratan akut."}
                    </p>
                  </div>
                </div>

                {/* Diagnosis ICD-10 */}
                <div>
                  <label htmlFor="icd10-input" className="block text-xs font-semibold text-[#0F3040] mb-1.5">
                    Diagnosis Kerja / Kode ICD-10 *
                  </label>
                  <input
                    id="icd10-input"
                    type="text"
                    value={diagnosisIcd10}
                    onChange={(e) => setDiagnosisIcd10(e.target.value)}
                    placeholder="Contoh: I10 - Hipertensi Esensial Primer atau E11.9 - DM Tipe 2"
                    className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E]"
                  />
                  {fieldErrors.diagnosisIcd10 && (
                    <p className="text-xs text-[#B3261E] mt-1">{fieldErrors.diagnosisIcd10}</p>
                  )}
                </div>

                {/* Catatan Klinis */}
                <div>
                  <label htmlFor="catatan-klinis" className="block text-xs font-semibold text-[#0F3040] mb-1.5">
                    Catatan Klinis &amp; Terapi Awal Faskes Primer *
                  </label>
                  <textarea
                    id="catatan-klinis"
                    rows={4}
                    value={catatanKlinis}
                    onChange={(e) => setCatatanKlinis(e.target.value)}
                    placeholder="Tuliskan anamnesis singkat, hasil pemeriksaan fisik/laboratorium awal, terapi yang sudah diberikan di puskesmas, serta alasan spesifik rujukan lanjutan..."
                    className="w-full p-4 rounded-[14px] border border-[#E2E8F0] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] leading-relaxed"
                  />
                  {fieldErrors.catatanKlinis && (
                    <p className="text-xs text-[#B3261E] mt-1">{fieldErrors.catatanKlinis}</p>
                  )}
                </div>
              </div>
            </Card>
          </Reveal>

          {/* Tombol Aksi Submit */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#E2E8F0]">
            <Link
              href={`/portal/${peran}/${subperan}`}
              className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-[#0F3040] transition-colors"
            >
              Batalkan &amp; Kembali
            </Link>

            <button
              type="submit"
              disabled={submitting || !selectedPatient}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#8F5A4E] text-white text-sm font-semibold hover:bg-[#A56F63] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengirimkan Rujukan Digital...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Kirim Rujukan ke Rumah Sakit</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}