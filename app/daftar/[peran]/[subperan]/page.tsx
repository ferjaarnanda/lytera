"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Building2,
  CheckCircle2,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Briefcase,
  ShieldCheck,
  Building,
} from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { Logo } from "@/components/Logo";
import { Stepper, StepItem } from "@/components/Stepper";
import { FileUploadDropzone } from "@/components/FileUploadDropzone";
import { OtpInput } from "@/components/OtpInput";
import {
  isValidRole,
  isValidSubRole,
  getRoleMeta,
  getSubRoleMeta,
  RoleId,
} from "@/lib/roles";
import {
  DEMO_PROVINCES,
  DEMO_REGENCIES,
  DEMO_DISTRICTS,
  DEMO_SUBDISTRICTS,
} from "@/lib/demo-regions";
import { DEMO_FACILITIES } from "@/lib/demo-facilities";

interface PageProps {
  params: Promise<{
    peran: string;
    subperan: string;
  }>;
}

export default function PendaftaranPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { peran, subperan } = resolvedParams;

  // Validate route parameters
  const valid = isValidRole(peran) && isValidSubRole(peran as RoleId, subperan);

  useEffect(() => {
    if (!valid) {
      router.replace("/");
    }
  }, [valid, router]);

  const roleMeta = getRoleMeta(peran);
  const subRoleMeta = getSubRoleMeta(peran, subperan);

  // Stepper & Multi-step form state
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");

  // Common Form States
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [otpValue, setOtpValue] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Pasien Pribadi Form State
  const [pribadiData, setPribadiData] = useState({
    nik: "",
    nama: "",
    tanggalLahir: "",
    jenisKelamin: "L",
    noHp: "",
    provinsi: "33",
    kota: "3374",
    kecamatan: "337401",
    kelurahan: "33740101",
    alamatDetail: "",
    noBpjs: "",
    riwayatAlergi: "",
    setujuKetentuan: false,
  });

  // Pasien Keluarga Form State
  const [keluargaData, setKeluargaData] = useState({
    nikWali: "",
    namaWali: "",
    noHpWali: "",
    hubunganWali: "Kepala Keluarga",
    noKk: "",
    setujuKetentuan: false,
  });
  const [anggotaKeluarga, setAnggotaKeluarga] = useState<
    Array<{ id: string; nama: string; nik: string; tanggalLahir: string; hubungan: string }>
  >([
    { id: "1", nama: "", nik: "", tanggalLahir: "", hubungan: "Istri" },
  ]);

  // Fasilitas Health Worker / Admin Choice State
  const [jalurFaskes, setJalurFaskes] = useState<"admin" | "nakes">("admin");
  
  // Fasilitas Admin Form State
  const [faskesAdminData, setFaskesAdminData] = useState({
    namaFaskes: "",
    kodeFaskes: "",
    provinsi: "33",
    kota: "3374",
    kecamatan: "337401",
    kelurahan: "33740101",
    alamatLengkap: "",
    noTelp: "",
    penanggungJawab: "",
    emailFaskes: "",
    password: "",
    konfirmasiPassword: "",
    setujuKetentuan: false,
  });

  // Fasilitas Nakes Form State
  const [faskesNakesData, setFaskesNakesData] = useState({
    namaLengkap: "",
    nik: "",
    profesi: subperan === "apotek" ? "Apoteker" : "Dokter Umum",
    noStr: "",
    faskesTujuan: DEMO_FACILITIES[0].name,
    kodeUndangan: "",
    metodeFaskes: "cari" as "cari" | "undangan",
    email: "",
    password: "",
    konfirmasiPassword: "",
    setujuSumpah: false,
  });

  // Verifikator Form State
  const [verifikatorData, setVerifikatorData] = useState({
    provinsi: "33",
    kota: "3374",
    kecamatan: "337401",
    kelurahan: "33740101",
    namaLengkap: "",
    nip: "",
    jabatan: "",
    emailDinas: "",
    noHp: "",
    password: "",
    konfirmasiPassword: "",
    setujuIntegritas: false,
  });

  if (!valid || !roleMeta || !subRoleMeta) {
    return (
      <div className="min-h-screen bg-[#FAF5F2] flex items-center justify-center p-4">
        <p className="text-sm text-[#464858]">Memuat formulir...</p>
      </div>
    );
  }

  // Filtered lists for cascaded dropdowns
  const availableDistricts = DEMO_DISTRICTS.filter(
    (d) => d.regencyId === "3374"
  );
  const availableSubdistricts = DEMO_SUBDISTRICTS.filter((s) => {
    const selectedDist =
      peran === "pasien" && subperan === "pribadi"
        ? pribadiData.kecamatan
        : peran === "fasilitas"
        ? faskesAdminData.kecamatan
        : verifikatorData.kecamatan;
    return s.districtId === selectedDist;
  });

  // Steps definition based on role
  let steps: StepItem[] = [];
  if (peran === "pasien" && subperan === "pribadi") {
    steps = [
      { id: 1, title: "Identitas Diri", subtitle: "KTP & Kontak", status: currentStep === 0 ? "proses" : currentStep > 0 ? "selesai" : "belum" },
      { id: 2, title: "Alamat & Medis", subtitle: "Wilayah & Alergi", status: currentStep === 1 ? "proses" : currentStep > 1 ? "selesai" : "belum" },
      { id: 3, title: "Verifikasi", subtitle: "Persetujuan & OTP", status: currentStep === 2 ? "proses" : currentStep > 2 ? "selesai" : "belum" },
    ];
  } else if (peran === "pasien" && subperan === "keluarga") {
    steps = [
      { id: 1, title: "Data Wali", subtitle: "Kepala Keluarga", status: currentStep === 0 ? "proses" : currentStep > 0 ? "selesai" : "belum" },
      { id: 2, title: "Kartu Keluarga", subtitle: "Nomor & Berkas", status: currentStep === 1 ? "proses" : currentStep > 1 ? "selesai" : "belum" },
      { id: 3, title: "Anggota", subtitle: "Data Keluarga", status: currentStep === 2 ? "proses" : currentStep > 2 ? "selesai" : "belum" },
      { id: 4, title: "Verifikasi", subtitle: "Persetujuan & OTP", status: currentStep === 3 ? "proses" : currentStep > 3 ? "selesai" : "belum" },
    ];
  } else if (peran === "fasilitas") {
    steps = [
      { id: 1, title: jalurFaskes === "admin" ? "Data Fasilitas" : "Identitas Nakes", subtitle: jalurFaskes === "admin" ? "Profil & Izin" : "Profesi & STR", status: currentStep === 0 ? "proses" : currentStep > 0 ? "selesai" : "belum" },
      { id: 2, title: jalurFaskes === "admin" ? "Legalitas" : "Penempatan", subtitle: jalurFaskes === "admin" ? "Unggah Berkas" : "Fasilitas Kerja", status: currentStep === 1 ? "proses" : currentStep > 1 ? "selesai" : "belum" },
      { id: 3, title: "Akun Petugas", subtitle: "Sandi & Persetujuan", status: currentStep === 2 ? "proses" : currentStep > 2 ? "selesai" : "belum" },
    ];
  } else {
    // Verifikator
    steps = [
      { id: 1, title: "Wilayah Tugas", subtitle: "Instansi Pemerintahan", status: currentStep === 0 ? "proses" : currentStep > 0 ? "selesai" : "belum" },
      { id: 2, title: "Data Pegawai", subtitle: "Identitas & NIP", status: currentStep === 1 ? "proses" : currentStep > 1 ? "selesai" : "belum" },
      { id: 3, title: "Legalitas & Sandi", subtitle: "SK & Kredensial", status: currentStep === 2 ? "proses" : currentStep > 2 ? "selesai" : "belum" },
    ];
  }

  // Navigation validation
  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (peran === "pasien" && subperan === "pribadi") {
      if (currentStep === 0) {
        if (!/^\d{16}$/.test(pribadiData.nik)) {
          newErrors.nik = "NIK harus terdiri dari 16 digit angka";
        }
        if (!pribadiData.nama.trim()) {
          newErrors.nama = "Nama lengkap wajib diisi sesuai KTP";
        }
        if (!pribadiData.tanggalLahir) {
          newErrors.tanggalLahir = "Tanggal lahir wajib dipilih";
        }
        if (!/^(08|62)\d{8,12}$/.test(pribadiData.noHp.replace(/\D/g, ""))) {
          newErrors.noHp = "Nomor HP tidak valid (awalan 08 atau 62, 10-14 digit)";
        }
      } else if (currentStep === 1) {
        if (!pribadiData.alamatDetail.trim()) {
          newErrors.alamatDetail = "Alamat jalan / RT / RW wajib diisi";
        }
        if (pribadiData.noBpjs && !/^\d{13}$/.test(pribadiData.noBpjs)) {
          newErrors.noBpjs = "Nomor BPJS harus 13 digit angka";
        }
      } else if (currentStep === 2) {
        if (!pribadiData.setujuKetentuan) {
          newErrors.setujuKetentuan = "Anda harus menyetujui pemrosesan data medis";
        }
        if (otpValue !== "123456") {
          newErrors.otp = "Kode OTP tidak cocok. Masukkan kode demo 123456";
        }
      }
    } else if (peran === "pasien" && subperan === "keluarga") {
      if (currentStep === 0) {
        if (!/^\d{16}$/.test(keluargaData.nikWali)) {
          newErrors.nikWali = "NIK wali harus 16 digit angka";
        }
        if (!keluargaData.namaWali.trim()) {
          newErrors.namaWali = "Nama lengkap wali wajib diisi";
        }
        if (!/^(08|62)\d{8,12}$/.test(keluargaData.noHpWali.replace(/\D/g, ""))) {
          newErrors.noHpWali = "Nomor HP wali tidak valid";
        }
      } else if (currentStep === 1) {
        if (!/^\d{16}$/.test(keluargaData.noKk)) {
          newErrors.noKk = "Nomor KK harus 16 digit angka";
        }
        if (!uploadedFile) {
          newErrors.file = "Unggah foto atau scan Kartu Keluarga";
        }
      } else if (currentStep === 2) {
        if (anggotaKeluarga.length === 0) {
          newErrors.anggota = "Tambahkan minimal satu anggota keluarga";
        }
        anggotaKeluarga.forEach((ang, idx) => {
          if (!ang.nama.trim()) {
            newErrors[`anggota_nama_${idx}`] = "Nama anggota wajib diisi";
          }
          if (!/^\d{16}$/.test(ang.nik)) {
            newErrors[`anggota_nik_${idx}`] = "NIK 16 digit";
          }
          if (!ang.tanggalLahir) {
            newErrors[`anggota_tgl_${idx}`] = "Tanggal lahir wajib";
          }
        });
      } else if (currentStep === 3) {
        if (!keluargaData.setujuKetentuan) {
          newErrors.setujuKetentuan = "Anda harus menyetujui perwalian data keluarga";
        }
        if (otpValue !== "123456") {
          newErrors.otp = "Kode OTP tidak cocok. Masukkan kode demo 123456";
        }
      }
    } else if (peran === "fasilitas") {
      if (jalurFaskes === "admin") {
        if (currentStep === 0) {
          if (!faskesAdminData.namaFaskes.trim()) {
            newErrors.namaFaskes = "Nama fasilitas kesehatan wajib diisi";
          }
          if (!faskesAdminData.kodeFaskes.trim()) {
            newErrors.kodeFaskes = "Kode faskes / izin operasional wajib diisi";
          }
          if (!faskesAdminData.alamatLengkap.trim()) {
            newErrors.alamatLengkap = "Alamat lengkap faskes wajib diisi";
          }
          if (!faskesAdminData.noTelp.trim()) {
            newErrors.noTelp = "Nomor telepon operasional wajib diisi";
          }
        } else if (currentStep === 1) {
          if (!uploadedFile) {
            newErrors.file = "Unggah dokumen izin operasional faskes";
          }
          if (!faskesAdminData.penanggungJawab.trim()) {
            newErrors.penanggungJawab = "Nama kepala faskes / penanggung jawab wajib";
          }
          if (!faskesAdminData.emailFaskes.includes("@")) {
            newErrors.emailFaskes = "Email faskes tidak valid";
          }
        } else if (currentStep === 2) {
          if (faskesAdminData.password.length < 8) {
            newErrors.password = "Kata sandi minimal 8 karakter";
          }
          if (faskesAdminData.password !== faskesAdminData.konfirmasiPassword) {
            newErrors.konfirmasiPassword = "Kata sandi tidak cocok";
          }
          if (!faskesAdminData.setujuKetentuan) {
            newErrors.setujuKetentuan = "Setujui ketentuan jaringan rujukan";
          }
        }
      } else {
        // Nakes
        if (currentStep === 0) {
          if (!faskesNakesData.namaLengkap.trim()) {
            newErrors.namaLengkap = "Nama lengkap beserta gelar wajib diisi";
          }
          if (!/^\d{16}$/.test(faskesNakesData.nik)) {
            newErrors.nik = "NIK 16 digit angka";
          }
          if (!faskesNakesData.noStr.trim()) {
            newErrors.noStr = "Nomor STR / SIP / STRA / SIPA wajib diisi";
          }
        } else if (currentStep === 1) {
          if (faskesNakesData.metodeFaskes === "undangan" && !faskesNakesData.kodeUndangan.trim()) {
            newErrors.kodeUndangan = "Masukkan kode undangan fasilitas";
          }
        } else if (currentStep === 2) {
          if (!faskesNakesData.email.includes("@")) {
            newErrors.email = "Email tidak valid";
          }
          if (faskesNakesData.password.length < 8) {
            newErrors.password = "Kata sandi minimal 8 karakter";
          }
          if (faskesNakesData.password !== faskesNakesData.konfirmasiPassword) {
            newErrors.konfirmasiPassword = "Kata sandi tidak cocok";
          }
          if (!faskesNakesData.setujuSumpah) {
            newErrors.setujuSumpah = "Anda wajib menyetujui sumpah profesi & kerahasiaan medis";
          }
        }
      }
    } else if (peran === "verifikator") {
      if (currentStep === 0) {
        // Wilayah default valid
      } else if (currentStep === 1) {
        if (!verifikatorData.namaLengkap.trim()) {
          newErrors.namaLengkap = "Nama lengkap petugas wajib diisi";
        }
        if (!/^\d{18}$/.test(verifikatorData.nip)) {
          newErrors.nip = "NIP harus 18 digit angka";
        }
        if (!verifikatorData.jabatan.trim()) {
          newErrors.jabatan = "Jabatan / seksi penugasan wajib diisi";
        }
        if (!verifikatorData.emailDinas.includes("@")) {
          newErrors.emailDinas = "Email dinas tidak valid";
        }
      } else if (currentStep === 2) {
        if (!uploadedFile) {
          newErrors.file = "Unggah Surat Keputusan / Surat Tugas";
        }
        if (verifikatorData.password.length < 8) {
          newErrors.password = "Kata sandi minimal 8 karakter";
        }
        if (verifikatorData.password !== verifikatorData.konfirmasiPassword) {
          newErrors.konfirmasiPassword = "Kata sandi tidak cocok";
        }
        if (!verifikatorData.setujuIntegritas) {
          newErrors.setujuIntegritas = "Setujui pakta integritas verifikasi data";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;

    if (currentStep < steps.length - 1) {
      setDirection("next");
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Final submit simulation -> redirect to /daftar/selesai
      let url = `/daftar/selesai?peran=${peran}&sub=${subperan}`;
      if (peran === "fasilitas") {
        url += `&tipe=${jalurFaskes}`;
      }
      router.push(url);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setDirection("prev");
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const addAnggota = () => {
    setAnggotaKeluarga((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        nama: "",
        nik: "",
        tanggalLahir: "",
        hubungan: "Anak",
      },
    ]);
  };

  const removeAnggota = (idx: number) => {
    setAnggotaKeluarga((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="min-h-screen bg-[#FAF5F2] text-[#464858] pb-16">
      {/* Top Bar with BackButton */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 flex items-center justify-between">
        <BackButton href="/" label="← Kembali ke Beranda" />
        <Link href="/" className="flex items-center gap-2 group" aria-label="Beranda Lytera">
          <Logo tone="light" />
        </Link>
      </div>

      {/* Main Card Container */}
      <main className="max-w-[720px] mx-auto px-4 sm:px-6 mt-6 sm:mt-8">
        <div className="bg-white rounded-[24px] shadow-sm border border-[#E2E8F0] p-6 sm:p-10 transition-all">
          {/* Header Title & Subtitle */}
          <div className="border-b border-[#E2E8F0] pb-6 mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#EBF2F6] text-[#0F3040] mb-3">
              {peran === "pasien" && <User className="w-3.5 h-3.5 text-[#8F5A4E]" />}
              {peran === "fasilitas" && <Building2 className="w-3.5 h-3.5 text-[#8F5A4E]" />}
              {peran === "verifikator" && <ShieldCheck className="w-3.5 h-3.5 text-[#8F5A4E]" />}
              <span>
                {roleMeta.name} &bull; {subRoleMeta.name}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0F3040] tracking-tight">
              Pendaftaran {subRoleMeta.name}
            </h1>
            <p className="text-sm text-[#464858]/80 mt-1">
              Lengkapi formulir terverifikasi untuk terhubung ke jaringan rujukan digital Lytera.
            </p>

            {/* Stepper Display */}
            <div className="mt-6">
              <Stepper steps={steps} />
            </div>
          </div>

          {/* Form Step Content with Transition effect */}
          <div
            className={`transition-all duration-300 transform ${
              direction === "next"
                ? "animate-[fadeInRight_0.3s_ease-out]"
                : "animate-[fadeInLeft_0.3s_ease-out]"
            }`}
          >
            {/* ─────────────────────────────────────────────────────────── */}
            {/* 1. PASIEN PRIBADI */}
            {/* ─────────────────────────────────────────────────────────── */}
            {peran === "pasien" && subperan === "pribadi" && (
              <div className="space-y-5">
                {currentStep === 0 && (
                  <>
                    <h2 className="text-lg font-bold text-[#0F3040]">Identitas Diri Sesuai KTP</h2>
                    <div>
                      <label htmlFor="nik" className="block text-sm font-semibold text-[#0F3040] mb-1">
                        Nomor Induk Kependudukan (NIK) *
                      </label>
                      <input
                        id="nik"
                        type="text"
                        maxLength={16}
                        value={pribadiData.nik}
                        onChange={(e) =>
                          setPribadiData({ ...pribadiData, nik: e.target.value.replace(/\D/g, "") })
                        }
                        placeholder="Contoh: 3374012345670001"
                        className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none tabular-nums text-sm"
                      />
                      {errors.nik && <p className="text-xs text-[#B3261E] mt-1">{errors.nik}</p>}
                    </div>

                    <div>
                      <label htmlFor="nama" className="block text-sm font-semibold text-[#0F3040] mb-1">
                        Nama Lengkap *
                      </label>
                      <input
                        id="nama"
                        type="text"
                        value={pribadiData.nama}
                        onChange={(e) => setPribadiData({ ...pribadiData, nama: e.target.value })}
                        placeholder="Sesuai kartu identitas"
                        className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm"
                      />
                      {errors.nama && <p className="text-xs text-[#B3261E] mt-1">{errors.nama}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="tanggalLahir" className="block text-sm font-semibold text-[#0F3040] mb-1">
                          Tanggal Lahir *
                        </label>
                        <input
                          id="tanggalLahir"
                          type="date"
                          value={pribadiData.tanggalLahir}
                          onChange={(e) =>
                            setPribadiData({ ...pribadiData, tanggalLahir: e.target.value })
                          }
                          className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm"
                        />
                        {errors.tanggalLahir && (
                          <p className="text-xs text-[#B3261E] mt-1">{errors.tanggalLahir}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="jenisKelamin" className="block text-sm font-semibold text-[#0F3040] mb-1">
                          Jenis Kelamin *
                        </label>
                        <select
                          id="jenisKelamin"
                          value={pribadiData.jenisKelamin}
                          onChange={(e) =>
                            setPribadiData({ ...pribadiData, jenisKelamin: e.target.value })
                          }
                          className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm bg-white"
                        >
                          <option value="L">Laki-laki</option>
                          <option value="P">Perempuan</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="noHp" className="block text-sm font-semibold text-[#0F3040] mb-1">
                        Nomor Handphone / WhatsApp *
                      </label>
                      <input
                        id="noHp"
                        type="tel"
                        value={pribadiData.noHp}
                        onChange={(e) => setPribadiData({ ...pribadiData, noHp: e.target.value })}
                        placeholder="081234567890"
                        className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none tabular-nums text-sm"
                      />
                      <p className="text-xs text-[#464858]/70 mt-1">
                        Nomor ini akan digunakan untuk menerima kode verifikasi OTP saat masuk.
                      </p>
                      {errors.noHp && <p className="text-xs text-[#B3261E] mt-1">{errors.noHp}</p>}
                    </div>
                  </>
                )}

                {currentStep === 1 && (
                  <>
                    <h2 className="text-lg font-bold text-[#0F3040]">Alamat Domisili & Informasi Medis</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="provinsi" className="block text-sm font-semibold text-[#0F3040] mb-1">
                          Provinsi
                        </label>
                        <select
                          id="provinsi"
                          value={pribadiData.provinsi}
                          disabled
                          className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] bg-slate-50 text-sm"
                        >
                          {DEMO_PROVINCES.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="kota" className="block text-sm font-semibold text-[#0F3040] mb-1">
                          Kota / Kabupaten
                        </label>
                        <select
                          id="kota"
                          value={pribadiData.kota}
                          disabled
                          className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] bg-slate-50 text-sm"
                        >
                          {DEMO_REGENCIES.map((r) => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="kecamatan" className="block text-sm font-semibold text-[#0F3040] mb-1">
                          Kecamatan *
                        </label>
                        <select
                          id="kecamatan"
                          value={pribadiData.kecamatan}
                          onChange={(e) => {
                            const newKec = e.target.value;
                            const firstSub = DEMO_SUBDISTRICTS.find((s) => s.districtId === newKec);
                            setPribadiData({
                              ...pribadiData,
                              kecamatan: newKec,
                              kelurahan: firstSub ? firstSub.id : "",
                            });
                          }}
                          className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm bg-white"
                        >
                          {availableDistricts.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="kelurahan" className="block text-sm font-semibold text-[#0F3040] mb-1">
                          Kelurahan / Desa *
                        </label>
                        <select
                          id="kelurahan"
                          value={pribadiData.kelurahan}
                          onChange={(e) => setPribadiData({ ...pribadiData, kelurahan: e.target.value })}
                          className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm bg-white"
                        >
                          {availableSubdistricts.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="alamatDetail" className="block text-sm font-semibold text-[#0F3040] mb-1">
                        Alamat Detail (Jalan, RT/RW, No. Rumah) *
                      </label>
                      <textarea
                        id="alamatDetail"
                        rows={2}
                        value={pribadiData.alamatDetail}
                        onChange={(e) =>
                          setPribadiData({ ...pribadiData, alamatDetail: e.target.value })
                        }
                        placeholder="Contoh: Jl. Pandanaran No. 42 RT 02 / RW 04"
                        className="w-full p-3 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm"
                      />
                      {errors.alamatDetail && (
                        <p className="text-xs text-[#B3261E] mt-1">{errors.alamatDetail}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="noBpjs" className="block text-sm font-semibold text-[#0F3040] mb-1">
                        Nomor BPJS Kesehatan (Opsional)
                      </label>
                      <input
                        id="noBpjs"
                        type="text"
                        maxLength={13}
                        value={pribadiData.noBpjs}
                        onChange={(e) =>
                          setPribadiData({ ...pribadiData, noBpjs: e.target.value.replace(/\D/g, "") })
                        }
                        placeholder="13 digit angka kartu BPJS"
                        className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none tabular-nums text-sm"
                      />
                      {errors.noBpjs && <p className="text-xs text-[#B3261E] mt-1">{errors.noBpjs}</p>}
                    </div>

                    <div>
                      <label htmlFor="riwayatAlergi" className="block text-sm font-semibold text-[#0F3040] mb-1">
                        Riwayat Alergi Obat / Makanan (Opsional)
                      </label>
                      <input
                        id="riwayatAlergi"
                        type="text"
                        value={pribadiData.riwayatAlergi}
                        onChange={(e) =>
                          setPribadiData({ ...pribadiData, riwayatAlergi: e.target.value })
                        }
                        placeholder="Contoh: Alergi Penisilin, Asma, Makanan Laut"
                        className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm"
                      />
                    </div>
                  </>
                )}

                {currentStep === 2 && (
                  <>
                    <h2 className="text-lg font-bold text-[#0F3040]">Verifikasi & Persetujuan Medis</h2>
                    <div className="p-4 rounded-[16px] bg-[#EDF7F2] border border-[#1B6B4D]/20">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-[#1B6B4D] shrink-0 mt-0.5" />
                        <div className="text-xs text-[#0F3040] leading-relaxed">
                          <p className="font-semibold">Perlindungan Rekam Medis Bersama</p>
                          <p className="text-slate-600 mt-0.5">
                            Data kesehatan Anda hanya dapat diakses oleh dokter dan faskes rujukan yang Anda setujui melalui token digital satu kali pakai.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 pt-2">
                      <input
                        id="setujuKetentuan"
                        type="checkbox"
                        checked={pribadiData.setujuKetentuan}
                        onChange={(e) =>
                          setPribadiData({ ...pribadiData, setujuKetentuan: e.target.checked })
                        }
                        className="w-4 h-4 mt-1 rounded text-[#8F5A4E] border-[#E2E8F0] focus:ring-[#8F5A4E]"
                      />
                      <label htmlFor="setujuKetentuan" className="text-xs text-[#464858] leading-relaxed">
                        Saya menyetujui pemrosesan data identitas dan data kesehatan saya untuk keperluan rujukan faskes sesuai Undang-Undang Perlindungan Data Pribadi (UU PDP).
                      </label>
                    </div>
                    {errors.setujuKetentuan && (
                      <p className="text-xs text-[#B3261E]">{errors.setujuKetentuan}</p>
                    )}

                    <div className="pt-4 border-t border-[#E2E8F0]">
                      <OtpInput
                        value={otpValue}
                        onChange={setOtpValue}
                        error={errors.otp}
                        label="Masukkan 6 Digit Kode OTP Verifikasi"
                      />
                      <p className="text-xs text-[#8F5A4E] font-medium mt-2">
                        💡 Kode demo untuk pengujian: <span className="font-bold">123456</span>
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────── */}
            {/* 2. PASIEN KELUARGA */}
            {/* ─────────────────────────────────────────────────────────── */}
            {peran === "pasien" && subperan === "keluarga" && (
              <div className="space-y-5">
                {currentStep === 0 && (
                  <>
                    <h2 className="text-lg font-bold text-[#0F3040]">Data Wali / Kepala Keluarga</h2>
                    <div>
                      <label htmlFor="nikWali" className="block text-sm font-semibold text-[#0F3040] mb-1">
                        NIK Wali / Kepala Keluarga *
                      </label>
                      <input
                        id="nikWali"
                        type="text"
                        maxLength={16}
                        value={keluargaData.nikWali}
                        onChange={(e) =>
                          setKeluargaData({ ...keluargaData, nikWali: e.target.value.replace(/\D/g, "") })
                        }
                        placeholder="16 digit NIK Wali"
                        className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none tabular-nums text-sm"
                      />
                      {errors.nikWali && <p className="text-xs text-[#B3261E] mt-1">{errors.nikWali}</p>}
                    </div>

                    <div>
                      <label htmlFor="namaWali" className="block text-sm font-semibold text-[#0F3040] mb-1">
                        Nama Lengkap Wali *
                      </label>
                      <input
                        id="namaWali"
                        type="text"
                        value={keluargaData.namaWali}
                        onChange={(e) => setKeluargaData({ ...keluargaData, namaWali: e.target.value })}
                        placeholder="Nama lengkap sesuai KTP"
                        className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm"
                      />
                      {errors.namaWali && <p className="text-xs text-[#B3261E] mt-1">{errors.namaWali}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="noHpWali" className="block text-sm font-semibold text-[#0F3040] mb-1">
                          Nomor Handphone / WA *
                        </label>
                        <input
                          id="noHpWali"
                          type="tel"
                          value={keluargaData.noHpWali}
                          onChange={(e) => setKeluargaData({ ...keluargaData, noHpWali: e.target.value })}
                          placeholder="081234567890"
                          className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none tabular-nums text-sm"
                        />
                        {errors.noHpWali && (
                          <p className="text-xs text-[#B3261E] mt-1">{errors.noHpWali}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="hubunganWali" className="block text-sm font-semibold text-[#0F3040] mb-1">
                          Kedudukan dalam Keluarga *
                        </label>
                        <select
                          id="hubunganWali"
                          value={keluargaData.hubunganWali}
                          onChange={(e) =>
                            setKeluargaData({ ...keluargaData, hubunganWali: e.target.value })
                          }
                          className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm bg-white"
                        >
                          <option value="Kepala Keluarga">Kepala Keluarga</option>
                          <option value="Istri / Ibu">Istri / Ibu</option>
                          <option value="Orang Tua / Wali Sah">Orang Tua / Wali Sah</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {currentStep === 1 && (
                  <>
                    <h2 className="text-lg font-bold text-[#0F3040]">Data Kartu Keluarga (KK)</h2>
                    <div>
                      <label htmlFor="noKk" className="block text-sm font-semibold text-[#0F3040] mb-1">
                        Nomor Kartu Keluarga (KK) *
                      </label>
                      <input
                        id="noKk"
                        type="text"
                        maxLength={16}
                        value={keluargaData.noKk}
                        onChange={(e) =>
                          setKeluargaData({ ...keluargaData, noKk: e.target.value.replace(/\D/g, "") })
                        }
                        placeholder="16 digit nomor kartu keluarga"
                        className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none tabular-nums text-sm"
                      />
                      {errors.noKk && <p className="text-xs text-[#B3261E] mt-1">{errors.noKk}</p>}
                    </div>

                    <div>
                      <FileUploadDropzone
                        id="kk-file-dropzone"
                        label="Unggah Foto / Scan Kartu Keluarga *"
                        hint="Format PDF, JPG, atau PNG (Maks. 5 MB)"
                        value={uploadedFile}
                        onFile={setUploadedFile}
                        onClear={() => setUploadedFile(null)}
                        error={errors.file}
                      />
                    </div>
                  </>
                )}

                {currentStep === 2 && (
                  <>
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold text-[#0F3040]">Daftar Anggota Keluarga</h2>
                      <button
                        type="button"
                        onClick={addAnggota}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#8F5A4E] text-white hover:bg-[#A56F63] transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Tambah Anggota
                      </button>
                    </div>
                    {errors.anggota && <p className="text-xs text-[#B3261E]">{errors.anggota}</p>}

                    <div className="space-y-4">
                      {anggotaKeluarga.map((item, idx) => (
                        <div
                          key={item.id}
                          className="p-4 rounded-[18px] border border-[#E2E8F0] bg-slate-50 relative space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#0F3040]">
                              Anggota #{idx + 1}
                            </span>
                            {anggotaKeluarga.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeAnggota(idx)}
                                className="text-xs text-[#B3261E] hover:underline inline-flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Hapus
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label
                                htmlFor={`anggota-nama-${idx}`}
                                className="block text-xs font-medium text-slate-700 mb-1"
                              >
                                Nama Anggota *
                              </label>
                              <input
                                id={`anggota-nama-${idx}`}
                                type="text"
                                value={item.nama}
                                onChange={(e) => {
                                  const next = [...anggotaKeluarga];
                                  next[idx].nama = e.target.value;
                                  setAnggotaKeluarga(next);
                                }}
                                placeholder="Nama lengkap"
                                className="w-full h-10 px-3 rounded-[10px] border border-[#E2E8F0] bg-white text-xs outline-none focus:border-[#8F5A4E]"
                              />
                              {errors[`anggota_nama_${idx}`] && (
                                <p className="text-[11px] text-[#B3261E] mt-0.5">
                                  {errors[`anggota_nama_${idx}`]}
                                </p>
                              )}
                            </div>

                            <div>
                              <label
                                htmlFor={`anggota-nik-${idx}`}
                                className="block text-xs font-medium text-slate-700 mb-1"
                              >
                                NIK Anggota *
                              </label>
                              <input
                                id={`anggota-nik-${idx}`}
                                type="text"
                                maxLength={16}
                                value={item.nik}
                                onChange={(e) => {
                                  const next = [...anggotaKeluarga];
                                  next[idx].nik = e.target.value.replace(/\D/g, "");
                                  setAnggotaKeluarga(next);
                                }}
                                placeholder="16 digit NIK"
                                className="w-full h-10 px-3 rounded-[10px] border border-[#E2E8F0] bg-white text-xs tabular-nums outline-none focus:border-[#8F5A4E]"
                              />
                              {errors[`anggota_nik_${idx}`] && (
                                <p className="text-[11px] text-[#B3261E] mt-0.5">
                                  {errors[`anggota_nik_${idx}`]}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label
                                htmlFor={`anggota-tgl-${idx}`}
                                className="block text-xs font-medium text-slate-700 mb-1"
                              >
                                Tanggal Lahir *
                              </label>
                              <input
                                id={`anggota-tgl-${idx}`}
                                type="date"
                                value={item.tanggalLahir}
                                onChange={(e) => {
                                  const next = [...anggotaKeluarga];
                                  next[idx].tanggalLahir = e.target.value;
                                  setAnggotaKeluarga(next);
                                }}
                                className="w-full h-10 px-3 rounded-[10px] border border-[#E2E8F0] bg-white text-xs outline-none focus:border-[#8F5A4E]"
                              />
                              {errors[`anggota_tgl_${idx}`] && (
                                <p className="text-[11px] text-[#B3261E] mt-0.5">
                                  {errors[`anggota_tgl_${idx}`]}
                                </p>
                              )}
                            </div>

                            <div>
                              <label
                                htmlFor={`anggota-hub-${idx}`}
                                className="block text-xs font-medium text-slate-700 mb-1"
                              >
                                Hubungan Keluarga *
                              </label>
                              <select
                                id={`anggota-hub-${idx}`}
                                value={item.hubungan}
                                onChange={(e) => {
                                  const next = [...anggotaKeluarga];
                                  next[idx].hubungan = e.target.value;
                                  setAnggotaKeluarga(next);
                                }}
                                className="w-full h-10 px-3 rounded-[10px] border border-[#E2E8F0] bg-white text-xs outline-none focus:border-[#8F5A4E]"
                              >
                                <option value="Istri">Istri</option>
                                <option value="Suami">Suami</option>
                                <option value="Anak">Anak</option>
                                <option value="Orang Tua">Orang Tua</option>
                                <option value="Famili Lain">Famili Lain</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {currentStep === 3 && (
                  <>
                    <h2 className="text-lg font-bold text-[#0F3040]">Persetujuan Perwalian & OTP</h2>
                    <div className="flex items-start gap-3 pt-2">
                      <input
                        id="setujuKeluarga"
                        type="checkbox"
                        checked={keluargaData.setujuKetentuan}
                        onChange={(e) =>
                          setKeluargaData({ ...keluargaData, setujuKetentuan: e.target.checked })
                        }
                        className="w-4 h-4 mt-1 rounded text-[#8F5A4E] border-[#E2E8F0] focus:ring-[#8F5A4E]"
                      />
                      <label htmlFor="setujuKeluarga" className="text-xs text-[#464858] leading-relaxed">
                        Saya menyatakan secara sadar berhak mewakili data rekam medis dan rujukan anggota keluarga tercantum sesuai kartu keluarga yang diunggah.
                      </label>
                    </div>
                    {errors.setujuKetentuan && (
                      <p className="text-xs text-[#B3261E]">{errors.setujuKetentuan}</p>
                    )}

                    <div className="pt-4 border-t border-[#E2E8F0]">
                      <OtpInput
                        value={otpValue}
                        onChange={setOtpValue}
                        error={errors.otp}
                        label="Masukkan Kode OTP Wali"
                      />
                      <p className="text-xs text-[#8F5A4E] font-medium mt-2">
                        💡 Kode demo untuk pengujian: <span className="font-bold">123456</span>
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────── */}
            {/* 3. FASILITAS KESEHATAN */}
            {/* ─────────────────────────────────────────────────────────── */}
            {peran === "fasilitas" && (
              <div className="space-y-5">
                {currentStep === 0 && (
                  <>
                    {/* Choice between Admin Faskes vs Nakes */}
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-[#0F3040] mb-2">
                        Pilih Jalur Pendaftaran:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setJalurFaskes("admin")}
                          className={`p-4 rounded-[18px] border text-left transition-all ${
                            jalurFaskes === "admin"
                              ? "border-[#8F5A4E] bg-[#FAF5F2] ring-2 ring-[#8F5A4E]/20"
                              : "border-[#E2E8F0] bg-white hover:border-[#8F5A4E]/50"
                          }`}
                        >
                          <Building className="w-5 h-5 text-[#8F5A4E] mb-2" />
                          <p className="text-sm font-bold text-[#0F3040]">Admin Fasilitas Baru</p>
                          <p className="text-xs text-slate-500 mt-1">
                            Pendaftaran instansi faskes baru ke sistem rujukan Lytera.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setJalurFaskes("nakes")}
                          className={`p-4 rounded-[18px] border text-left transition-all ${
                            jalurFaskes === "nakes"
                              ? "border-[#8F5A4E] bg-[#FAF5F2] ring-2 ring-[#8F5A4E]/20"
                              : "border-[#E2E8F0] bg-white hover:border-[#8F5A4E]/50"
                          }`}
                        >
                          <Briefcase className="w-5 h-5 text-[#8F5A4E] mb-2" />
                          <p className="text-sm font-bold text-[#0F3040]">Tenaga Kesehatan</p>
                          <p className="text-xs text-slate-500 mt-1">
                            Dokter, Petugas Admisi, atau Apoteker yang bergabung ke faskes terdaftar.
                          </p>
                        </button>
                      </div>
                    </div>

                    {jalurFaskes === "admin" ? (
                      <>
                        <h2 className="text-lg font-bold text-[#0F3040]">Data Fasilitas Kesehatan</h2>
                        <div>
                          <label htmlFor="namaFaskes" className="block text-sm font-semibold text-[#0F3040] mb-1">
                            Nama Resmi Fasilitas *
                          </label>
                          <input
                            id="namaFaskes"
                            type="text"
                            value={faskesAdminData.namaFaskes}
                            onChange={(e) =>
                              setFaskesAdminData({ ...faskesAdminData, namaFaskes: e.target.value })
                            }
                            placeholder={`Contoh: ${subRoleMeta.name} Harapan Sehat`}
                            className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm"
                          />
                          {errors.namaFaskes && (
                            <p className="text-xs text-[#B3261E] mt-1">{errors.namaFaskes}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="kodeFaskes" className="block text-sm font-semibold text-[#0F3040] mb-1">
                              Kode Faskes / Izin Operasional *
                            </label>
                            <input
                              id="kodeFaskes"
                              type="text"
                              value={faskesAdminData.kodeFaskes}
                              onChange={(e) =>
                                setFaskesAdminData({ ...faskesAdminData, kodeFaskes: e.target.value })
                              }
                              placeholder="Contoh: FS-SMG-2026-09"
                              className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm"
                            />
                            {errors.kodeFaskes && (
                              <p className="text-xs text-[#B3261E] mt-1">{errors.kodeFaskes}</p>
                            )}
                          </div>

                          <div>
                            <label htmlFor="noTelpFaskes" className="block text-sm font-semibold text-[#0F3040] mb-1">
                              Nomor Telepon Operasional *
                            </label>
                            <input
                              id="noTelpFaskes"
                              type="tel"
                              value={faskesAdminData.noTelp}
                              onChange={(e) =>
                                setFaskesAdminData({ ...faskesAdminData, noTelp: e.target.value })
                              }
                              placeholder="024-8312345"
                              className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none tabular-nums text-sm"
                            />
                            {errors.noTelp && (
                              <p className="text-xs text-[#B3261E] mt-1">{errors.noTelp}</p>
                            )}
                          </div>
                        </div>

                        <div>
                          <label htmlFor="alamatLengkapFaskes" className="block text-sm font-semibold text-[#0F3040] mb-1">
                            Alamat Lengkap *
                          </label>
                          <textarea
                            id="alamatLengkapFaskes"
                            rows={2}
                            value={faskesAdminData.alamatLengkap}
                            onChange={(e) =>
                              setFaskesAdminData({ ...faskesAdminData, alamatLengkap: e.target.value })
                            }
                            placeholder="Jalan, RT/RW, dan patokan lokasi"
                            className="w-full p-3 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm"
                          />
                          {errors.alamatLengkap && (
                            <p className="text-xs text-[#B3261E] mt-1">{errors.alamatLengkap}</p>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <h2 className="text-lg font-bold text-[#0F3040]">Identitas Tenaga Medis</h2>
                        <div>
                          <label htmlFor="namaNakes" className="block text-sm font-semibold text-[#0F3040] mb-1">
                            Nama Lengkap Beserta Gelar *
                          </label>
                          <input
                            id="namaNakes"
                            type="text"
                            value={faskesNakesData.namaLengkap}
                            onChange={(e) =>
                              setFaskesNakesData({ ...faskesNakesData, namaLengkap: e.target.value })
                            }
                            placeholder="Contoh: dr. Budi Santoso, Sp.PD"
                            className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm"
                          />
                          {errors.namaLengkap && (
                            <p className="text-xs text-[#B3261E] mt-1">{errors.namaLengkap}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="nikNakes" className="block text-sm font-semibold text-[#0F3040] mb-1">
                              NIK (16 Digit) *
                            </label>
                            <input
                              id="nikNakes"
                              type="text"
                              maxLength={16}
                              value={faskesNakesData.nik}
                              onChange={(e) =>
                                setFaskesNakesData({ ...faskesNakesData, nik: e.target.value.replace(/\D/g, "") })
                              }
                              placeholder="16 digit NIK"
                              className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none tabular-nums text-sm"
                            />
                            {errors.nik && <p className="text-xs text-[#B3261E] mt-1">{errors.nik}</p>}
                          </div>

                          <div>
                            <label htmlFor="noStr" className="block text-sm font-semibold text-[#0F3040] mb-1">
                              Nomor STR / SIP / SIPA *
                            </label>
                            <input
                              id="noStr"
                              type="text"
                              value={faskesNakesData.noStr}
                              onChange={(e) =>
                                setFaskesNakesData({ ...faskesNakesData, noStr: e.target.value })
                              }
                              placeholder="Nomor izin praktik aktif"
                              className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm"
                            />
                            {errors.noStr && <p className="text-xs text-[#B3261E] mt-1">{errors.noStr}</p>}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}

                {currentStep === 1 && (
                  <>
                    {jalurFaskes === "admin" ? (
                      <>
                        <h2 className="text-lg font-bold text-[#0F3040]">Legalitas & Kontak Penanggung Jawab</h2>
                        <div>
                          <FileUploadDropzone
                            id="izin-faskes-dropzone"
                            label="Unggah Surat Izin Operasional Faskes *"
                            hint="Dokumen PDF/JPG dari Dinas Kesehatan atau PTSP (Maks 5MB)"
                            value={uploadedFile}
                            onFile={setUploadedFile}
                            onClear={() => setUploadedFile(null)}
                            error={errors.file}
                          />
                        </div>

                        <div>
                          <label htmlFor="penanggungJawab" className="block text-sm font-semibold text-[#0F3040] mb-1">
                            Nama Kepala Faskes / Penanggung Jawab *
                          </label>
                          <input
                            id="penanggungJawab"
                            type="text"
                            value={faskesAdminData.penanggungJawab}
                            onChange={(e) =>
                              setFaskesAdminData({ ...faskesAdminData, penanggungJawab: e.target.value })
                            }
                            placeholder="Nama direktur / penanggung jawab"
                            className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm"
                          />
                          {errors.penanggungJawab && (
                            <p className="text-xs text-[#B3261E] mt-1">{errors.penanggungJawab}</p>
                          )}
                        </div>

                        <div>
                          <label htmlFor="emailFaskes" className="block text-sm font-semibold text-[#0F3040] mb-1">
                            Email Resmi Instansi *
                          </label>
                          <input
                            id="emailFaskes"
                            type="email"
                            value={faskesAdminData.emailFaskes}
                            onChange={(e) =>
                              setFaskesAdminData({ ...faskesAdminData, emailFaskes: e.target.value })
                            }
                            placeholder="admin@puskesmas-contoh.go.id"
                            className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm"
                          />
                          {errors.emailFaskes && (
                            <p className="text-xs text-[#B3261E] mt-1">{errors.emailFaskes}</p>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <h2 className="text-lg font-bold text-[#0F3040]">Pilih Fasilitas Penugasan</h2>
                        <div className="flex gap-4 border-b border-[#E2E8F0] pb-3 mb-4">
                          <button
                            type="button"
                            onClick={() =>
                              setFaskesNakesData({ ...faskesNakesData, metodeFaskes: "cari" })
                            }
                            className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${
                              faskesNakesData.metodeFaskes === "cari"
                                ? "border-[#8F5A4E] text-[#8F5A4E]"
                                : "border-transparent text-slate-500 hover:text-[#0F3040]"
                            }`}
                          >
                            Pilih dari Fasilitas Terdaftar
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setFaskesNakesData({ ...faskesNakesData, metodeFaskes: "undangan" })
                            }
                            className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${
                              faskesNakesData.metodeFaskes === "undangan"
                                ? "border-[#8F5A4E] text-[#8F5A4E]"
                                : "border-transparent text-slate-500 hover:text-[#0F3040]"
                            }`}
                          >
                            Gunakan Kode Undangan
                          </button>
                        </div>

                        {faskesNakesData.metodeFaskes === "cari" ? (
                          <div>
                            <label htmlFor="faskesTujuan" className="block text-sm font-semibold text-[#0F3040] mb-1">
                              Daftar Fasilitas Kesehatan *
                            </label>
                            <select
                              id="faskesTujuan"
                              value={faskesNakesData.faskesTujuan}
                              onChange={(e) =>
                                setFaskesNakesData({ ...faskesNakesData, faskesTujuan: e.target.value })
                              }
                              className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm bg-white"
                            >
                              {DEMO_FACILITIES.map((f, i) => (
                                <option key={i} value={f.name}>
                                  {f.name} ({f.type} - Tk {f.tier})
                                </option>
                              ))}
                            </select>
                            <p className="text-xs text-[#464858]/70 mt-1.5">
                              Setelah mendaftar, admin fasilitas ini akan menerima permohonan persetujuan Anda.
                            </p>
                          </div>
                        ) : (
                          <div>
                            <label htmlFor="kodeUndangan" className="block text-sm font-semibold text-[#0F3040] mb-1">
                              Kode Undangan Fasilitas *
                            </label>
                            <input
                              id="kodeUndangan"
                              type="text"
                              value={faskesNakesData.kodeUndangan}
                              onChange={(e) =>
                                setFaskesNakesData({ ...faskesNakesData, kodeUndangan: e.target.value })
                              }
                              placeholder="Contoh: KODE-SMG-01"
                              className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm"
                            />
                            {errors.kodeUndangan && (
                              <p className="text-xs text-[#B3261E] mt-1">{errors.kodeUndangan}</p>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}

                {currentStep === 2 && (
                  <>
                    <h2 className="text-lg font-bold text-[#0F3040]">Pembuatan Akun & Kredensial</h2>
                    {jalurFaskes === "admin" ? (
                      <>
                        <div>
                          <label htmlFor="passwordAdmin" className="block text-sm font-semibold text-[#0F3040] mb-1">
                            Buat Kata Sandi *
                          </label>
                          <input
                            id="passwordAdmin"
                            type="password"
                            value={faskesAdminData.password}
                            onChange={(e) =>
                              setFaskesAdminData({ ...faskesAdminData, password: e.target.value })
                            }
                            placeholder="Minimal 8 karakter"
                            className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm"
                          />
                          {errors.password && (
                            <p className="text-xs text-[#B3261E] mt-1">{errors.password}</p>
                          )}
                        </div>

                        <div>
                          <label htmlFor="konfirmasiPasswordAdmin" className="block text-sm font-semibold text-[#0F3040] mb-1">
                            Ulangi Kata Sandi *
                          </label>
                          <input
                            id="konfirmasiPasswordAdmin"
                            type="password"
                            value={faskesAdminData.konfirmasiPassword}
                            onChange={(e) =>
                              setFaskesAdminData({
                                ...faskesAdminData,
                                konfirmasiPassword: e.target.value,
                              })
                            }
                            placeholder="Ketik ulang kata sandi"
                            className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm"
                          />
                          {errors.konfirmasiPassword && (
                            <p className="text-xs text-[#B3261E] mt-1">
                              {errors.konfirmasiPassword}
                            </p>
                          )}
                        </div>

                        <div className="flex items-start gap-3 pt-2">
                          <input
                            id="setujuKetentuanAdmin"
                            type="checkbox"
                            checked={faskesAdminData.setujuKetentuan}
                            onChange={(e) =>
                              setFaskesAdminData({
                                ...faskesAdminData,
                                setujuKetentuan: e.target.checked,
                              })
                            }
                            className="w-4 h-4 mt-1 rounded text-[#8F5A4E] border-[#E2E8F0] focus:ring-[#8F5A4E]"
                          />
                          <label htmlFor="setujuKetentuanAdmin" className="text-xs text-[#464858] leading-relaxed">
                            Kami menyatakan data fasilitas yang diberikan adalah benar dan siap mematuhi standar interoperabilitas rujukan medis Lytera.
                          </label>
                        </div>
                        {errors.setujuKetentuan && (
                          <p className="text-xs text-[#B3261E]">{errors.setujuKetentuan}</p>
                        )}
                      </>
                    ) : (
                      <>
                        <div>
                          <label htmlFor="emailNakes" className="block text-sm font-semibold text-[#0F3040] mb-1">
                            Email untuk Masuk *
                          </label>
                          <input
                            id="emailNakes"
                            type="email"
                            value={faskesNakesData.email}
                            onChange={(e) =>
                              setFaskesNakesData({ ...faskesNakesData, email: e.target.value })
                            }
                            placeholder="nama@email.com"
                            className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm"
                          />
                          {errors.email && (
                            <p className="text-xs text-[#B3261E] mt-1">{errors.email}</p>
                          )}
                        </div>

                        <div>
                          <label htmlFor="passwordNakes" className="block text-sm font-semibold text-[#0F3040] mb-1">
                            Buat Kata Sandi *
                          </label>
                          <input
                            id="passwordNakes"
                            type="password"
                            value={faskesNakesData.password}
                            onChange={(e) =>
                              setFaskesNakesData({ ...faskesNakesData, password: e.target.value })
                            }
                            placeholder="Minimal 8 karakter"
                            className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm"
                          />
                          {errors.password && (
                            <p className="text-xs text-[#B3261E] mt-1">{errors.password}</p>
                          )}
                        </div>

                        <div>
                          <label htmlFor="konfirmasiPasswordNakes" className="block text-sm font-semibold text-[#0F3040] mb-1">
                            Ulangi Kata Sandi *
                          </label>
                          <input
                            id="konfirmasiPasswordNakes"
                            type="password"
                            value={faskesNakesData.konfirmasiPassword}
                            onChange={(e) =>
                              setFaskesNakesData({
                                ...faskesNakesData,
                                konfirmasiPassword: e.target.value,
                              })
                            }
                            placeholder="Ketik ulang kata sandi"
                            className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm"
                          />
                          {errors.konfirmasiPassword && (
                            <p className="text-xs text-[#B3261E] mt-1">
                              {errors.konfirmasiPassword}
                            </p>
                          )}
                        </div>

                        <div className="flex items-start gap-3 pt-2">
                          <input
                            id="setujuSumpah"
                            type="checkbox"
                            checked={faskesNakesData.setujuSumpah}
                            onChange={(e) =>
                              setFaskesNakesData({
                                ...faskesNakesData,
                                setujuSumpah: e.target.checked,
                              })
                            }
                            className="w-4 h-4 mt-1 rounded text-[#8F5A4E] border-[#E2E8F0] focus:ring-[#8F5A4E]"
                          />
                          <label htmlFor="setujuSumpah" className="text-xs text-[#464858] leading-relaxed">
                            Saya berjanji menjunjung tinggi etika kerahasiaan medis dan hanya membuka rekam medis pasien sesuai wewenang penanganan.
                          </label>
                        </div>
                        {errors.setujuSumpah && (
                          <p className="text-xs text-[#B3261E]">{errors.setujuSumpah}</p>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────── */}
            {/* 4. VERIFIKATOR ADMINISTRASI */}
            {/* ─────────────────────────────────────────────────────────── */}
            {peran === "verifikator" && (
              <div className="space-y-5">
                {currentStep === 0 && (
                  <>
                    <h2 className="text-lg font-bold text-[#0F3040]">Wilayah Instansi Penugasan</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="provinsiVerif" className="block text-sm font-semibold text-[#0F3040] mb-1">
                          Provinsi
                        </label>
                        <select
                          id="provinsiVerif"
                          value={verifikatorData.provinsi}
                          disabled
                          className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] bg-slate-50 text-sm"
                        >
                          {DEMO_PROVINCES.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="kotaVerif" className="block text-sm font-semibold text-[#0F3040] mb-1">
                          Kota / Kabupaten
                        </label>
                        <select
                          id="kotaVerif"
                          value={verifikatorData.kota}
                          disabled
                          className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] bg-slate-50 text-sm"
                        >
                          {DEMO_REGENCIES.map((r) => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {subperan !== "dinas-sosial" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="kecamatanVerif" className="block text-sm font-semibold text-[#0F3040] mb-1">
                            Kecamatan *
                          </label>
                          <select
                            id="kecamatanVerif"
                            value={verifikatorData.kecamatan}
                            onChange={(e) => {
                              const newKec = e.target.value;
                              const firstSub = DEMO_SUBDISTRICTS.find((s) => s.districtId === newKec);
                              setVerifikatorData({
                                ...verifikatorData,
                                kecamatan: newKec,
                                kelurahan: firstSub ? firstSub.id : "",
                              });
                            }}
                            className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm bg-white"
                          >
                            {availableDistricts.map((d) => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        </div>

                        {subperan === "kelurahan" && (
                          <div>
                            <label htmlFor="kelurahanVerif" className="block text-sm font-semibold text-[#0F3040] mb-1">
                              Kelurahan / Desa *
                            </label>
                            <select
                              id="kelurahanVerif"
                              value={verifikatorData.kelurahan}
                              onChange={(e) =>
                                setVerifikatorData({ ...verifikatorData, kelurahan: e.target.value })
                              }
                              className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm bg-white"
                            >
                              {availableSubdistricts.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {currentStep === 1 && (
                  <>
                    <h2 className="text-lg font-bold text-[#0F3040]">Identitas Pegawai Verifikator</h2>
                    <div>
                      <label htmlFor="namaPetugas" className="block text-sm font-semibold text-[#0F3040] mb-1">
                        Nama Lengkap Petugas *
                      </label>
                      <input
                        id="namaPetugas"
                        type="text"
                        value={verifikatorData.namaLengkap}
                        onChange={(e) =>
                          setVerifikatorData({ ...verifikatorData, namaLengkap: e.target.value })
                        }
                        placeholder="Nama sesuai SK Penugasan"
                        className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm"
                      />
                      {errors.namaLengkap && (
                        <p className="text-xs text-[#B3261E] mt-1">{errors.namaLengkap}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="nipPetugas" className="block text-sm font-semibold text-[#0F3040] mb-1">
                          NIP (18 Digit Angka) *
                        </label>
                        <input
                          id="nipPetugas"
                          type="text"
                          maxLength={18}
                          value={verifikatorData.nip}
                          onChange={(e) =>
                            setVerifikatorData({
                              ...verifikatorData,
                              nip: e.target.value.replace(/\D/g, ""),
                            })
                          }
                          placeholder="198701012010011001"
                          className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none tabular-nums text-sm"
                        />
                        {errors.nip && <p className="text-xs text-[#B3261E] mt-1">{errors.nip}</p>}
                      </div>

                      <div>
                        <label htmlFor="jabatanPetugas" className="block text-sm font-semibold text-[#0F3040] mb-1">
                          Jabatan / Seksi *
                        </label>
                        <input
                          id="jabatanPetugas"
                          type="text"
                          value={verifikatorData.jabatan}
                          onChange={(e) =>
                            setVerifikatorData({ ...verifikatorData, jabatan: e.target.value })
                          }
                          placeholder="Contoh: Kasi Kesejahteraan Sosial"
                          className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm"
                        />
                        {errors.jabatan && (
                          <p className="text-xs text-[#B3261E] mt-1">{errors.jabatan}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="emailDinas" className="block text-sm font-semibold text-[#0F3040] mb-1">
                        Email Kedinasan *
                      </label>
                      <input
                        id="emailDinas"
                        type="email"
                        value={verifikatorData.emailDinas}
                        onChange={(e) =>
                          setVerifikatorData({ ...verifikatorData, emailDinas: e.target.value })
                        }
                        placeholder="petugas@semarangkota.go.id"
                        className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm"
                      />
                      {errors.emailDinas && (
                        <p className="text-xs text-[#B3261E] mt-1">{errors.emailDinas}</p>
                      )}
                    </div>
                  </>
                )}

                {currentStep === 2 && (
                  <>
                    <h2 className="text-lg font-bold text-[#0F3040]">Legalitas Penugasan & Kredensial</h2>
                    <div>
                      <FileUploadDropzone
                        id="sk-verifikator-dropzone"
                        label="Unggah Surat Keputusan / Surat Tugas *"
                        hint="Surat tugas resmi bertanda tangan pimpinan (PDF/JPG, Maks 5MB)"
                        value={uploadedFile}
                        onFile={setUploadedFile}
                        onClear={() => setUploadedFile(null)}
                        error={errors.file}
                      />
                    </div>

                    <div>
                      <label htmlFor="passwordVerif" className="block text-sm font-semibold text-[#0F3040] mb-1">
                        Buat Kata Sandi *
                      </label>
                      <input
                        id="passwordVerif"
                        type="password"
                        value={verifikatorData.password}
                        onChange={(e) =>
                          setVerifikatorData({ ...verifikatorData, password: e.target.value })
                        }
                        placeholder="Minimal 8 karakter"
                        className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm"
                      />
                      {errors.password && (
                        <p className="text-xs text-[#B3261E] mt-1">{errors.password}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="konfirmasiPasswordVerif" className="block text-sm font-semibold text-[#0F3040] mb-1">
                        Ulangi Kata Sandi *
                      </label>
                      <input
                        id="konfirmasiPasswordVerif"
                        type="password"
                        value={verifikatorData.konfirmasiPassword}
                        onChange={(e) =>
                          setVerifikatorData({
                            ...verifikatorData,
                            konfirmasiPassword: e.target.value,
                          })
                        }
                        placeholder="Ketik ulang kata sandi"
                        className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm"
                      />
                      {errors.konfirmasiPassword && (
                        <p className="text-xs text-[#B3261E] mt-1">
                          {errors.konfirmasiPassword}
                        </p>
                      )}
                    </div>

                    <div className="flex items-start gap-3 pt-2">
                      <input
                        id="setujuIntegritas"
                        type="checkbox"
                        checked={verifikatorData.setujuIntegritas}
                        onChange={(e) =>
                          setVerifikatorData({
                            ...verifikatorData,
                            setujuIntegritas: e.target.checked,
                          })
                        }
                        className="w-4 h-4 mt-1 rounded text-[#8F5A4E] border-[#E2E8F0] focus:ring-[#8F5A4E]"
                      />
                      <label htmlFor="setujuIntegritas" className="text-xs text-[#464858] leading-relaxed">
                        Saya bersedia mematuhi Pakta Integritas Verifikasi dan menjamin keabsahan validasi dokumen kependudukan serta SKTM masyarakat.
                      </label>
                    </div>
                    {errors.setujuIntegritas && (
                      <p className="text-xs text-[#B3261E]">{errors.setujuIntegritas}</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons at the Bottom */}
          <div className="mt-8 pt-6 border-t border-[#E2E8F0] flex items-center justify-between gap-4">
            {currentStep > 0 ? (
              <button
                type="button"
                onClick={handlePrev}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[14px] text-sm font-semibold text-[#0F3040] hover:bg-[#EBF2F6] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Kembali
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-[14px] text-sm font-semibold bg-[#8F5A4E] text-white hover:bg-[#A56F63] active:bg-[#7B4B40] transition-colors shadow-sm ml-auto"
            >
              <span>{currentStep === steps.length - 1 ? "Selesaikan Pendaftaran" : "Lanjutkan"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
