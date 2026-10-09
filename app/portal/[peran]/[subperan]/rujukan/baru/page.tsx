"use client";

import React, { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  User,
  Building2,
  Stethoscope,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  ChevronDown,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  buatRujukanAction,
  cariPasienAction,
  cariFaskesAction,
  listDokterAction,
  type PatientSearchResult,
  type FasilitasOption,
  type DokterOption,
} from "@/app/actions/rujukan";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { Navbar } from "@/components/Navbar";

interface PageProps {
  params: Promise<{
    peran: string;
    subperan: string;
  }>;
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
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
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

function mapSpecializationToPoli(spec?: string | null): string | null {
  if (!spec) return null;
  const s = spec.toLowerCase();
  if (s.includes("penyakit dalam")) return "Poli Penyakit Dalam";
  if (s.includes("jantung")) return "Poli Jantung & Pembuluh Darah";
  if (s.includes("bedah")) return "Poli Bedah Umum";
  if (s.includes("anak") || s.includes("pediatri")) return "Poli Anak (Pediatri)";
  if (s.includes("saraf") || s.includes("neurologi")) return "Poli Saraf (Neurologi)";
  if (s.includes("mata") || s.includes("oftalmologi")) return "Poli Mata (Oftalmologi)";
  if (s.includes("tht") || s.includes("telinga")) return "Poli Telinga Hidung Tenggorok (THT)";
  if (s.includes("kebidanan") || s.includes("kandungan") || s.includes("obgyn")) return "Poli Kebidanan & Kandungan (Obgyn)";
  if (s.includes("paru")) return "Poli Paru & Saluran Napas";
  if (s.includes("kulit") || s.includes("kelamin") || s.includes("dermatologi")) return "Poli Kulit & Kelamin (Dermatologi)";
  if (s.includes("jiwa") || s.includes("psikiatri")) return "Poli Jiwa (Psikiatri)";
  if (s.includes("ortopedi") || s.includes("traumatologi")) return "Poli Ortopedi & Traumatologi";
  if (s.includes("gigi")) return "Poli Gigi & Mulut Spesialistik";
  return null;
}


// ============================================================================
// FacilityCombobox — kotak ketik + dropdown daftar RS
// ============================================================================
interface FacilityComboboxProps {
  value: FasilitasOption | null;
  onChange: (fac: FasilitasOption | null) => void;
}

function FacilityCombobox({ value, onChange }: FacilityComboboxProps) {
  const [query, setQuery] = useState(value?.name ?? "");
  const [options, setOptions] = useState<FasilitasOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    setLoading(true);
    const res = await cariFaskesAction(q, 20);
    setLoading(false);
    if (res.success && res.results) {
      setOptions(res.results);
    } else {
      setOptions([]);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    onChange(null); // reset pilihan saat user mengetik
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(q), 350);
  };

  const handleFocus = () => {
    setOpen(true);
    if (options.length === 0) doSearch(query || (value?.name ?? ""));
  };

  const handleSelect = (fac: FasilitasOption) => {
    onChange(fac);
    setQuery(fac.name);
    setOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery("");
    setOptions([]);
    setOpen(false);
  };

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const displayValue = open ? query : (value?.name ?? query);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative flex items-center">
        <Building2 className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={displayValue}
          onChange={handleInput}
          onFocus={handleFocus}
          placeholder="Ketik nama rumah sakit..."
          className="w-full pl-9 pr-16 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-sm text-[#0F3040] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#8F5A4E]/40 focus:border-[#8F5A4E]"
        />
        <div className="absolute right-3 flex items-center gap-1">
          {loading && <Loader2 className="w-4 h-4 text-[#8F5A4E] animate-spin" />}
          {value && !loading && (
            <button type="button" onClick={handleClear} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
          {!value && !loading && (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-[#E2E8F0] bg-white shadow-lg max-h-60 overflow-y-auto">
          {options.length === 0 && !loading ? (
            <p className="px-4 py-3 text-sm text-slate-500">
              {query.length === 0
                ? "Ketik nama rumah sakit untuk mencari..."
                : "Tidak ada rumah sakit aktif yang cocok."}
            </p>
          ) : (
            options.map((fac) => (
              <button
                key={fac.id}
                type="button"
                onClick={() => handleSelect(fac)}
                className="w-full text-left px-4 py-2.5 hover:bg-[#EBF2F6] transition-colors border-b border-[#F0F4F8] last:border-0"
              >
                <p className="text-sm font-semibold text-[#0F3040]">{fac.name}</p>
                <p className="text-xs text-slate-500">{fac.city ?? ""}{fac.district ? `, ${fac.district}` : ""}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function BuatRujukanBaruPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { peran, subperan } = resolvedParams;

  // --- Verifikasi Staf ---
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [staffInfo, setStaffInfo] = useState<{
    staffName: string;
    facilityName: string;
    facilityId: string;
    staffRole: string;
  } | null>(null);
  const [unauthorizedMsg, setUnauthorizedMsg] = useState<string | null>(null);

  // --- (a) Pencarian Pasien ---
  const [searchNik, setSearchNik] = useState("");
  const [searchingPatient, setSearchingPatient] = useState(false);
  const [patientSearchError, setPatientSearchError] = useState<string | null>(null);
  const [patientResults, setPatientResults] = useState<PatientSearchResult[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null);

  // --- (b) Faskes Tujuan ---
  const [selectedHospital, setSelectedHospital] = useState<FasilitasOption | null>(null);

  // --- (c) Dokter Tujuan (Opsional) ---
  const [doctors, setDoctors] = useState<DokterOption[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");

  // --- (d) Detail Klinis ---
  const [poli, setPoli] = useState("Poli Penyakit Dalam");
  const [priority, setPriority] = useState<"elektif" | "urgent" | "gawat_darurat">("elektif");
  const [diagnosisIcd10, setDiagnosisIcd10] = useState("");
  const [catatanKlinis, setCatatanKlinis] = useState("");

  // --- Submit ---
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // 1. Cek otentikasi staf
  useEffect(() => {
    async function checkStaffAuth() {
      setCheckingAuth(true);
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.replace("/"); return; }

        const { data: profile } = await supabase
          .from("profiles").select("full_name").eq("id", user.id).maybeSingle();

        const { data: staff, error: staffErr } = await supabase
          .from("facility_staff")
          .select("id, staff_role, status, facility_id, facilities(id, name, type, status)")
          .eq("profile_id", user.id)
          .maybeSingle();

        if (staffErr) { setUnauthorizedMsg("Gagal memverifikasi status staf: " + staffErr.message); return; }

        if (!staff || !staff.facility_id) {
          setUnauthorizedMsg("Akun Anda belum terdaftar sebagai staf pada fasilitas kesehatan mana pun di sistem Lytera.");
          return;
        }
        if (staff.staff_role !== "dokter") {
          setUnauthorizedMsg(`Halaman Buat Rujukan hanya dapat diakses oleh Dokter. Peran akun Anda: '${staff.staff_role}'.`);
          return;
        }
        if (staff.status !== "aktif") {
          setUnauthorizedMsg(`Status kepegawaian Anda saat ini '${staff.status}'. Hanya dokter berstatus aktif yang berwenang menerbitkan rujukan digital.`);
          return;
        }

        const f = staff.facilities as unknown as { id: string; name: string; type: string; status: string } | null;
        if (f?.status !== "aktif") {
          setUnauthorizedMsg(`Fasilitas Anda (${f?.name ?? "-"}) berstatus '${f?.status ?? "-"}'. Rujukan hanya dapat diterbitkan dari fasilitas aktif.`);
          return;
        }

        setStaffInfo({
          staffName: profile?.full_name || "Dokter",
          facilityName: f?.name || "Fasilitas Kesehatan",
          facilityId: staff.facility_id,
          staffRole: staff.staff_role,
        });
      } catch (err: unknown) {
        setUnauthorizedMsg("Terjadi kendala pemeriksaan otorisasi: " + (err instanceof Error ? err.message : String(err)));
      } finally {
        setCheckingAuth(false);
      }
    }
    checkStaffAuth();
  }, [router]);

  const handleHospitalChange = (fac: FasilitasOption | null) => {
    setSelectedHospital(fac);
    setSelectedDoctorId("");
    setDoctors([]);
    if (fac) setLoadingDoctors(true);
  };

  // 2. Muat dokter saat RS tujuan berubah
  useEffect(() => {
    let ignore = false;
    if (!selectedHospital) return;

    listDokterAction(selectedHospital.id).then((res) => {
      if (!ignore) {
        setDoctors(res.success && res.results ? res.results : []);
        setLoadingDoctors(false);
      }
    });

    return () => {
      ignore = true;
    };
  }, [selectedHospital]);

  // (a) Cari Pasien
  const handleSearchPatient = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanNik = searchNik.trim();
    if (!cleanNik || cleanNik.length !== 16) {
      setPatientSearchError("Masukkan 16 digit NIK pasien dengan lengkap.");
      setPatientResults([]);
      setSelectedPatient(null);
      return;
    }

    setSearchingPatient(true);
    setPatientSearchError(null);
    setPatientResults([]);
    setSelectedPatient(null);

    const res = await cariPasienAction(cleanNik);
    setSearchingPatient(false);

    if (!res.success) {
      setPatientSearchError(res.error || "Pasien tidak ditemukan atau akunnya belum aktif.");
      return;
    }

    const results = res.results ?? [];
    setPatientResults(results);

    // Jika hanya 1 hasil, langsung pilih
    if (results.length === 1) {
      setSelectedPatient(results[0]);
    }
  };

  // Submit Rujukan
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setFieldErrors({});

    if (!selectedPatient) {
      setServerError("Harap cari dan pilih pasien terlebih dahulu.");
      return;
    }
    if (!selectedHospital) {
      setServerError("Harap pilih fasilitas kesehatan rumah sakit rujukan tujuan.");
      return;
    }
    if (!diagnosisIcd10.trim()) {
      setFieldErrors((p) => ({ ...p, diagnosisIcd10: "Diagnosis ICD-10 wajib diisi" }));
      return;
    }
    if (!catatanKlinis.trim()) {
      setFieldErrors((p) => ({ ...p, catatanKlinis: "Catatan klinis wajib diisi minimal 5 karakter" }));
      return;
    }

    setSubmitting(true);
    const res = await buatRujukanAction({
      patientId: selectedPatient.patient_id,
      familyMemberId: selectedPatient.family_member_id || null,
      destinationFacilityId: selectedHospital.id,
      destinationDoctorId: selectedDoctorId || null,
      poli,
      priority,
      diagnosisIcd10,
      catatanKlinis,
    });
    setSubmitting(false);

    if (!res.success) {
      setServerError(res.error || "Gagal menyimpan surat rujukan.");
      if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      return;
    }
    router.push(`/portal/${peran}/${subperan}/rujukan`);
  };

  // ---- Render: Loading Auth ----
  if (checkingAuth) {
    return (
      <div className="min-h-screen text-[#464858]" data-navbar-tone="light" data-portal-wallpaper="true">
        <Navbar variant="dokter-puskesmas" userName="Tenaga Medis" userRole="Fasilitas Kesehatan" forceGlass={true} />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-16 text-center">
          <Card variant="white" className="p-10 shadow-sm border border-[#E2E8F0]">
            <Loader2 className="w-8 h-8 text-[#8F5A4E] animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#0F3040]">Memverifikasi izin staf fasilitas...</p>
          </Card>
        </main>
      </div>
    );
  }

  // ---- Render: Tidak Diizinkan ----
  if (unauthorizedMsg) {
    return (
      <div className="min-h-screen text-[#464858]" data-navbar-tone="light" data-portal-wallpaper="true">
        <Navbar variant="dokter-puskesmas" userName="Tenaga Medis" userRole="Fasilitas Kesehatan" forceGlass={true} />
        <main className="max-w-xl mx-auto px-4 sm:px-6 pt-28 pb-16 text-center">
          <Card variant="white" className="p-8 sm:p-10 shadow-sm border border-[#E2E8F0]">
            <div className="w-12 h-12 rounded-full bg-[#FDECEA] flex items-center justify-center text-[#B3261E] mx-auto mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-[#0F3040] mb-2">Akses Dibatasi</h1>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">{unauthorizedMsg}</p>
            <Link
              href={`/portal/${peran}/${subperan}`}
              className="px-5 py-2.5 rounded-full bg-[#0F3040] text-white text-sm font-semibold hover:bg-[#0A2230] transition-colors"
            >
              Kembali ke Portal
            </Link>
          </Card>
        </main>
      </div>
    );
  }

  // ---- Render: Form Utama ----
  return (
    <div className="min-h-screen text-[#464858]" data-navbar-tone="light" data-portal-wallpaper="true">
      <Navbar
        variant="dokter-puskesmas"
        facilityName={staffInfo?.facilityName}
        userName={staffInfo?.staffName || "Tenaga Medis"}
        userRole="Dokter"
        forceGlass={true}
      />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-20">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/portal/${peran}/${subperan}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/90 hover:text-white mb-4"
          >
            ← Kembali ke Portal
          </Link>
          <h1 className="text-2xl font-bold text-white drop-shadow">Buat Surat Rujukan Digital</h1>
          <p className="text-sm text-white/80 mt-1">
            Dari: <span className="font-semibold">{staffInfo?.facilityName}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ── (a) Pencarian Pasien ── */}
          <Card variant="white" className="p-5 shadow-sm border border-[#E2E8F0]">
            <h2 className="flex items-center gap-2 text-sm font-bold text-[#0F3040] mb-4">
              <span className="w-6 h-6 rounded-full bg-[#0F3040] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
              Cari Pasien
            </h2>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={16}
                  value={searchNik}
                  onChange={(e) => {
                    setSearchNik(e.target.value.replace(/\D/g, ""));
                    setPatientSearchError(null);
                    setPatientResults([]);
                    setSelectedPatient(null);
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearchPatient(); } }}
                  placeholder="Masukkan 16 digit NIK pasien"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-sm text-[#0F3040] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#8F5A4E]/40 focus:border-[#8F5A4E] font-mono tracking-wider"
                />
              </div>
              <button
                type="button"
                onClick={() => handleSearchPatient()}
                disabled={searchingPatient || searchNik.length !== 16}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F3040] text-white text-sm font-semibold hover:bg-[#0A2230] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                {searchingPatient ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Cari
              </button>
            </div>

            {/* Pesan Galat Pencarian */}
            {patientSearchError && (
              <div className="mt-3 flex items-start gap-2 text-sm text-[#B3261E] bg-[#FDECEA] rounded-xl px-3 py-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{patientSearchError}</span>
              </div>
            )}

            {/* Hasil Pencarian (lebih dari 1 → pilih) */}
            {patientResults.length > 1 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-slate-500 font-medium">Ditemukan {patientResults.length} pasien. Pilih yang sesuai:</p>
                {patientResults.map((p) => (
                  <button
                    key={p.patient_id + (p.family_member_id ?? "")}
                    type="button"
                    onClick={() => setSelectedPatient(p)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border transition-colors ${
                      selectedPatient?.patient_id === p.patient_id && selectedPatient?.family_member_id === p.family_member_id
                        ? "border-[#8F5A4E] bg-[#FDF5F3]"
                        : "border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[#0F3040]">{p.full_name}</p>
                      {p.family_member_id && p.relation && (
                        <Badge variant="proses">{p.relation}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{p.nik_masked}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Kartu Pasien Terpilih */}
            {selectedPatient && (
              <div className="mt-3 rounded-xl border border-[#D1FAE5] bg-[#F0FDF4] px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] flex-shrink-0" />
                    <p className="text-sm font-bold text-[#0F3040]">{selectedPatient.full_name}</p>
                    {selectedPatient.family_member_id && selectedPatient.relation && (
                      <Badge variant="proses">
                        Anggota keluarga ({selectedPatient.relation})
                      </Badge>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedPatient(null); setPatientResults([]); setSearchNik(""); }}
                    className="text-slate-400 hover:text-slate-600 flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                  <span><span className="text-slate-400">NIK:</span> <span className="font-mono">{selectedPatient.nik_masked}</span></span>
                  <span><span className="text-slate-400">Lahir:</span> {formatDateIndo(selectedPatient.dob)}</span>
                  <span><span className="text-slate-400">Kelamin:</span> {selectedPatient.gender === "L" ? "Laki-laki" : selectedPatient.gender === "P" ? "Perempuan" : "-"}</span>
                  <span><span className="text-slate-400">Kota:</span> {selectedPatient.city ?? "-"}</span>
                </div>
              </div>
            )}
          </Card>

          {/* ── (b) Rumah Sakit Tujuan ── */}
          <Card variant="white" className="p-5 shadow-sm border border-[#E2E8F0]">
            <h2 className="flex items-center gap-2 text-sm font-bold text-[#0F3040] mb-4">
              <span className="w-6 h-6 rounded-full bg-[#0F3040] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
              Rumah Sakit Tujuan
            </h2>
            <FacilityCombobox value={selectedHospital} onChange={handleHospitalChange} />
            {selectedHospital && (
              <p className="mt-2 text-xs text-[#16A34A] font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {selectedHospital.name} — {selectedHospital.city ?? ""}
              </p>
            )}
          </Card>

          {/* ── (c) Dokter Tujuan (Opsional) ── */}
          {selectedHospital && (
            <Card variant="white" className="p-5 shadow-sm border border-[#E2E8F0]">
              <h2 className="flex items-center gap-2 text-sm font-bold text-[#0F3040] mb-4">
                <span className="w-6 h-6 rounded-full bg-[#0F3040] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                Dokter Tujuan
                <span className="ml-1 text-xs font-normal text-slate-400">(opsional)</span>
              </h2>
              {/* (c) Dokter Tujuan */}
              {loadingDoctors ? (
                <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Memuat daftar dokter spesialis terverifikasi...
                </div>
              ) : doctors.length > 0 ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <select
                      value={selectedDoctorId}
                      onChange={(e) => {
                        const newDocId = e.target.value;
                        setSelectedDoctorId(newDocId);
                        if (newDocId) {
                          const doc = doctors.find((d) => d.staff_id === newDocId);
                          if (doc?.specialization) {
                            const suggestedPoli = mapSpecializationToPoli(doc.specialization);
                            if (suggestedPoli && POLI_OPTIONS.includes(suggestedPoli)) {
                              setPoli(suggestedPoli);
                            }
                          }
                        }
                      }}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-sm text-[#0F3040] focus:outline-none focus:ring-2 focus:ring-[#8F5A4E]/40 focus:border-[#8F5A4E] appearance-none"
                    >
                      <option value="">Tanpa dokter tertentu (Ditugaskan oleh RS)</option>
                      {doctors.map((d) => (
                        <option key={d.staff_id} value={d.staff_id}>
                          {d.full_name}{d.specialization ? ` — Sp. ${d.specialization}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedDoctorId && (
                    <div className="flex items-center gap-1.5 text-xs text-[#16A34A] bg-[#F0FDF4] border border-[#DCFCE7] rounded-lg px-3 py-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>
                        Dokter spesialis terpilih. Poli tujuan otomatis diselaraskan sesuai kompetensi.
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-[#E2E8F0] bg-[#FAF5F2] p-3.5 text-xs text-slate-600 space-y-1">
                  <p className="font-semibold text-[#0F3040]">Rujukan Berjenjang Terbuka</p>
                  <p>
                    Rumah sakit ini melayani rujukan poli. Dokter Penanggung Jawab Pelayanan (DPJP) spesialis akan ditugaskan langsung oleh tim medis rumah sakit saat penjadwalan antrean.
                  </p>
                </div>
              )}
            </Card>
          )}

          {/* ── (d) Detail Klinis ── */}
          <Card variant="white" className="p-5 shadow-sm border border-[#E2E8F0]">
            <h2 className="flex items-center gap-2 text-sm font-bold text-[#0F3040] mb-4">
              <span className="w-6 h-6 rounded-full bg-[#0F3040] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
              Detail Klinis
            </h2>

            <div className="space-y-4">
              {/* Poli */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-600">Poli / Spesialisasi Tujuan</label>
                  {selectedHospital && doctors.length > 0 && (
                    <span className="text-[11px] text-slate-500">
                      Tersedia {doctors.length} dokter di RS ini
                    </span>
                  )}
                </div>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select
                    value={poli}
                    onChange={(e) => setPoli(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-sm text-[#0F3040] focus:outline-none focus:ring-2 focus:ring-[#8F5A4E]/40 focus:border-[#8F5A4E] appearance-none"
                  >
                    {POLI_OPTIONS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Prioritas */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Prioritas Rujukan</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["elektif", "urgent", "gawat_darurat"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-colors ${
                        priority === p
                          ? p === "gawat_darurat"
                            ? "bg-[#B3261E] text-white border-[#B3261E]"
                            : p === "urgent"
                            ? "bg-[#D97706] text-white border-[#D97706]"
                            : "bg-[#0F3040] text-white border-[#0F3040]"
                          : "bg-white text-slate-600 border-[#E2E8F0] hover:bg-[#F8FAFC]"
                      }`}
                    >
                      {p === "elektif" ? "Elektif" : p === "urgent" ? "Urgent" : "Gawat Darurat"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Diagnosis ICD-10 */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Kode Diagnosis ICD-10 <span className="text-[#B3261E]">*</span>
                </label>
                <input
                  type="text"
                  value={diagnosisIcd10}
                  onChange={(e) => { setDiagnosisIcd10(e.target.value); if (fieldErrors.diagnosisIcd10) setFieldErrors(p => ({ ...p, diagnosisIcd10: "" })); }}
                  placeholder="Cth: A09, J18.9, I21.0"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-sm text-[#0F3040] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#8F5A4E]/40 focus:border-[#8F5A4E] font-mono"
                />
                {fieldErrors.diagnosisIcd10 && (
                  <p className="mt-1 text-xs text-[#B3261E]">{fieldErrors.diagnosisIcd10}</p>
                )}
              </div>

              {/* Catatan Klinis */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Catatan Klinis & Riwayat <span className="text-[#B3261E]">*</span>
                </label>
                <textarea
                  value={catatanKlinis}
                  onChange={(e) => { setCatatanKlinis(e.target.value); if (fieldErrors.catatanKlinis) setFieldErrors(p => ({ ...p, catatanKlinis: "" })); }}
                  rows={4}
                  placeholder="Deskripsikan kondisi pasien, riwayat penyakit, hasil pemeriksaan awal, dan alasan rujukan..."
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-sm text-[#0F3040] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#8F5A4E]/40 focus:border-[#8F5A4E] resize-none"
                />
                {fieldErrors.catatanKlinis && (
                  <p className="mt-1 text-xs text-[#B3261E]">{fieldErrors.catatanKlinis}</p>
                )}
              </div>
            </div>
          </Card>

          {/* Galat Server */}
          {serverError && (
            <div className="flex items-start gap-2 text-sm text-[#B3261E] bg-white/90 border border-[#FECACA] rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Tombol Submit */}
          <div className="flex gap-3 justify-end pt-2">
            <Link
              href={`/portal/${peran}/${subperan}`}
              className="px-5 py-2.5 rounded-full border border-white/60 bg-white/20 text-white text-sm font-semibold hover:bg-white/30 transition-colors"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={submitting || !selectedPatient || !selectedHospital}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#8F5A4E] text-white text-sm font-bold hover:bg-[#7A4A3E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
              ) : (
                <><User className="w-4 h-4" /> Kirim Rujukan</>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}