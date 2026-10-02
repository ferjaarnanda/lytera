"use client";

import React, { useState, useEffect, use, useMemo } from "react";
import { useRouter } from "next/navigation";
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
  AlertCircle,
  Loader2,
} from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { Logo } from "@/components/Logo";
import { Stepper, StepItem } from "@/components/Stepper";
import { StatusType } from "@/components/StatusIcon";
import { FileUploadDropzone } from "@/components/FileUploadDropzone";
import { OtpInput } from "@/components/OtpInput";
import { DatePicker } from "@/components/DatePicker";
import { submitPendaftaranAction } from "@/app/actions/pendaftaran";
import {
  COMMON_VALIDATION_ERROR_BANNER,
  findFirstErrorStepAndField,
  getErrorStepIndices,
  focusAndScrollToField,
  getFieldElementId,
  getFieldStep,
} from "@/lib/form-helpers";
import {
  isValidRole,
  isValidSubRole,
  getRoleMeta,
  getSubRoleMeta,
  RoleId,
} from "@/lib/roles";
import { RegionCombobox } from "@/components/RegionCombobox";
import { FacilityCombobox } from "@/components/FacilityCombobox";

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
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  // Pasien Pribadi Form State
  const [pribadiData, setPribadiData] = useState({
    nik: "",
    nama: "",
    tanggalLahir: "",
    jenisKelamin: "L",
    noHp: "",
    provinsi: "",
    kota: "",
    kecamatan: "",
    kelurahan: "",
    alamatDetail: "",
    noBpjs: "",
    riwayatAlergi: "",
    email: "",
    password: "",
    konfirmasiPassword: "",
    setujuKetentuan: false,
  });

  // Pasien Keluarga Form State
  const [keluargaData, setKeluargaData] = useState({
    nikWali: "",
    namaWali: "",
    noHpWali: "",
    hubunganWali: "Kepala Keluarga",
    noKk: "",
    provinsi: "",
    kota: "",
    kecamatan: "",
    kelurahan: "",
    alamatWali: "",
    emailWali: "",
    passwordWali: "",
    konfirmasiPasswordWali: "",
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
    provinsi: "",
    kota: "",
    kecamatan: "",
    kelurahan: "",
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
    facilityId: "",
    faskesTujuan: "",
    kodeUndangan: "",
    metodeFaskes: "cari" as "cari" | "undangan",
    email: "",
    password: "",
    konfirmasiPassword: "",
    setujuSumpah: false,
  });

  // Verifikator Form State
  const [verifikatorData, setVerifikatorData] = useState({
    provinsi: "",
    kota: "",
    kecamatan: "",
    kelurahan: "",
    namaLengkap: "",
    nip: "",
    jabatan: "",
    emailDinas: "",
    noHp: "",
    password: "",
    konfirmasiPassword: "",
    setujuIntegritas: false,
  });

  // Internal region codes tracking for cascading async API fetching
  const [pribadiCodes, setPribadiCodes] = useState({ province: "", regency: "", district: "" });
  const [keluargaCodes, setKeluargaCodes] = useState({ province: "", regency: "", district: "" });
  const [faskesCodes, setFaskesCodes] = useState({ province: "", regency: "", district: "" });
  const [verifikatorCodes, setVerifikatorCodes] = useState({ province: "", regency: "", district: "" });

  // Hitung langkah-langkah yang memiliki error validasi secara reaktif (Hooks must precede early returns)
  const errorStepIndices = useMemo(() => {
    return getErrorStepIndices(errors, peran, subperan, jalurFaskes);
  }, [errors, peran, subperan, jalurFaskes]);

  const getStepStatus = (stepIdx: number): StatusType => {
    if (errorStepIndices.has(stepIdx)) return "error";
    if (currentStep === stepIdx) return "proses";
    if (currentStep > stepIdx) return "selesai";
    return "belum";
  };

  if (!valid || !roleMeta || !subRoleMeta) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${peran === "verifikator" ? "bg-[#FAF5F2]" : ""}`}>
        <p className="text-sm text-[#464858]">Memuat formulir...</p>
      </div>
    );
  }


  // Steps definition based on role
  let steps: StepItem[] = [];
  if (peran === "pasien" && subperan === "pribadi") {
    steps = [
      { id: 1, title: "Identitas Diri", subtitle: "KTP & Kontak", status: getStepStatus(0) },
      { id: 2, title: "Alamat & Medis", subtitle: "Wilayah & Alergi", status: getStepStatus(1) },
      { id: 3, title: "Verifikasi", subtitle: "Persetujuan & OTP", status: getStepStatus(2) },
    ];
  } else if (peran === "pasien" && subperan === "keluarga") {
    steps = [
      { id: 1, title: "Data Wali", subtitle: "Kepala Keluarga", status: getStepStatus(0) },
      { id: 2, title: "Kartu Keluarga", subtitle: "Nomor & Berkas", status: getStepStatus(1) },
      { id: 3, title: "Anggota", subtitle: "Data Keluarga", status: getStepStatus(2) },
      { id: 4, title: "Verifikasi", subtitle: "Persetujuan & OTP", status: getStepStatus(3) },
    ];
  } else if (peran === "fasilitas") {
    steps = [
      { id: 1, title: jalurFaskes === "admin" ? "Data Fasilitas" : "Identitas Nakes", subtitle: jalurFaskes === "admin" ? "Profil & Izin" : "Profesi & STR", status: getStepStatus(0) },
      { id: 2, title: jalurFaskes === "admin" ? "Legalitas" : "Penempatan", subtitle: jalurFaskes === "admin" ? "Unggah Berkas" : "Fasilitas Kerja", status: getStepStatus(1) },
      { id: 3, title: "Akun Petugas", subtitle: "Sandi & Persetujuan", status: getStepStatus(2) },
    ];
  } else {
    // Verifikator
    steps = [
      { id: 1, title: "Wilayah Tugas", subtitle: "Instansi Pemerintahan", status: getStepStatus(0) },
      { id: 2, title: "Data Pegawai", subtitle: "Identitas & NIP", status: getStepStatus(1) },
      { id: 3, title: "Legalitas & Sandi", subtitle: "SK & Kredensial", status: getStepStatus(2) },
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
          newErrors.nama = "Nama lengkap wajib diisi sesuai kartu identitas";
        }
        if (!pribadiData.tanggalLahir) {
          newErrors.tanggalLahir = "Tanggal lahir wajib dipilih";
        }
        if (!/^(08|62|\+62)\d{8,12}$/.test(pribadiData.noHp.replace(/\D/g, ""))) {
          newErrors.noHp = "Nomor HP tidak valid, gunakan format 08xx atau 62xx (10-14 digit)";
        }
      } else if (currentStep === 1) {
        if (!pribadiData.provinsi) {
          newErrors.provinsi = "Provinsi wajib dipilih";
        }
        if (!pribadiData.kota) {
          newErrors.kota = "Kota / Kabupaten wajib dipilih";
        }
        if (!pribadiData.kecamatan) {
          newErrors.kecamatan = "Kecamatan wajib dipilih";
        }
        if (!pribadiData.alamatDetail.trim() || pribadiData.alamatDetail.trim().length < 5) {
          newErrors.alamatDetail = "Alamat lengkap wajib diisi minimal 5 karakter";
        }
        if (pribadiData.noBpjs && !/^\d{13}$/.test(pribadiData.noBpjs)) {
          newErrors.noBpjs = "Nomor BPJS harus 13 digit angka";
        }
      } else if (currentStep === 2) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pribadiData.email.trim())) {
          newErrors.email = "Format email tidak valid, gunakan format seperti nama@contoh.com";
        }
        if (pribadiData.password.length < 6) {
          newErrors.password = "Kata sandi minimal 6 karakter";
        }
        if (pribadiData.password !== pribadiData.konfirmasiPassword) {
          newErrors.konfirmasiPassword = "Konfirmasi kata sandi tidak cocok";
        }
        if (!pribadiData.setujuKetentuan) {
          newErrors.setujuKetentuan = "Anda wajib menyetujui pemrosesan data medis untuk melanjutkan";
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
          newErrors.namaWali = "Nama lengkap wali wajib diisi sesuai KTP";
        }
        if (!/^(08|62|\+62)\d{8,12}$/.test(keluargaData.noHpWali.replace(/\D/g, ""))) {
          newErrors.noHpWali = "Nomor HP wali tidak valid, gunakan format 08xx atau 62xx (10-14 digit)";
        }
      } else if (currentStep === 1) {
        if (!/^\d{16}$/.test(keluargaData.noKk)) {
          newErrors.noKk = "Nomor Kartu Keluarga harus 16 digit angka";
        }
        if (!uploadedFile) {
          newErrors.file = "Unggah foto atau scan Kartu Keluarga";
        } else if (uploadedFile.size > 5 * 1024 * 1024) {
          newErrors.file = "Ukuran berkas melebihi batas maksimal 5 MB. Silakan kompres atau pilih berkas yang lebih kecil.";
        }
      } else if (currentStep === 2) {
        if (anggotaKeluarga.length === 0) {
          newErrors.anggota = "Tambahkan minimal satu anggota keluarga";
        }
        anggotaKeluarga.forEach((ang, idx) => {
          if (!ang.nama.trim()) {
            newErrors[`anggota_nama_${idx}`] = "Nama anggota keluarga wajib diisi";
          }
          if (!/^\d{16}$/.test(ang.nik)) {
            newErrors[`anggota_nik_${idx}`] = "NIK anggota harus 16 digit angka";
          }
          if (!ang.tanggalLahir) {
            newErrors[`anggota_tgl_${idx}`] = "Tanggal lahir anggota wajib dipilih";
          }
        });
      } else if (currentStep === 3) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(keluargaData.emailWali.trim())) {
          newErrors.emailWali = "Format email tidak valid, gunakan format seperti nama@contoh.com";
        }
        if (keluargaData.passwordWali.length < 6) {
          newErrors.passwordWali = "Kata sandi minimal 6 karakter";
        }
        if (keluargaData.passwordWali !== keluargaData.konfirmasiPasswordWali) {
          newErrors.konfirmasiPasswordWali = "Konfirmasi kata sandi tidak cocok";
        }
        if (!keluargaData.setujuKetentuan) {
          newErrors.setujuKetentuan = "Anda wajib menyetujui perwalian data keluarga untuk melanjutkan";
        }
        if (otpValue !== "123456") {
          newErrors.otp = "Kode OTP tidak cocok. Masukkan kode demo 123456";
        }
      }
    } else if (peran === "fasilitas") {
      if (jalurFaskes === "admin") {
        if (currentStep === 0) {
          if (!faskesAdminData.namaFaskes.trim()) {
            newErrors.namaFaskes = "Nama resmi fasilitas kesehatan wajib diisi";
          }
          if (!faskesAdminData.kodeFaskes.trim()) {
            newErrors.kodeFaskes = "Kode faskes atau nomor izin operasional wajib diisi";
          }
          if (!faskesAdminData.provinsi) {
            newErrors.faskesProvinsi = "Provinsi faskes wajib dipilih";
          }
          if (!faskesAdminData.kota) {
            newErrors.faskesKota = "Kota / Kabupaten faskes wajib dipilih";
          }
          if (!faskesAdminData.alamatLengkap.trim() || faskesAdminData.alamatLengkap.trim().length < 5) {
            newErrors.alamatLengkap = "Alamat lengkap faskes wajib diisi minimal 5 karakter";
          }
          if (!faskesAdminData.noTelp.trim() || faskesAdminData.noTelp.trim().length < 6) {
            newErrors.noTelp = "Nomor telepon operasional faskes wajib diisi";
          }
        } else if (currentStep === 1) {
          if (!uploadedFile) {
            newErrors.file = "Unggah dokumen izin operasional faskes";
          } else if (uploadedFile.size > 5 * 1024 * 1024) {
            newErrors.file = "Ukuran berkas melebihi batas maksimal 5 MB. Silakan kompres atau pilih berkas yang lebih kecil.";
          }
          if (!faskesAdminData.penanggungJawab.trim()) {
            newErrors.penanggungJawab = "Nama kepala faskes atau penanggung jawab wajib diisi";
          }
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(faskesAdminData.emailFaskes.trim())) {
            newErrors.emailFaskes = "Format email tidak valid, gunakan format seperti nama@contoh.com";
          }
        } else if (currentStep === 2) {
          if (faskesAdminData.password.length < 6) {
            newErrors.password = "Kata sandi minimal 6 karakter";
          }
          if (faskesAdminData.password !== faskesAdminData.konfirmasiPassword) {
            newErrors.konfirmasiPassword = "Konfirmasi kata sandi tidak cocok";
          }
          if (!faskesAdminData.setujuKetentuan) {
            newErrors.setujuKetentuan = "Anda wajib menyetujui ketentuan jaringan rujukan untuk melanjutkan";
          }
        }
      } else {
        // Nakes
        if (currentStep === 0) {
          if (!faskesNakesData.namaLengkap.trim()) {
            newErrors.namaLengkap = "Nama lengkap beserta gelar wajib diisi";
          }
          if (!/^\d{16}$/.test(faskesNakesData.nik)) {
            newErrors.nik = "NIK harus 16 digit angka";
          }
          if (!faskesNakesData.noStr.trim() || faskesNakesData.noStr.trim().length < 5) {
            newErrors.noStr = "Nomor STR / SIP / STRA / SIPA aktif wajib diisi";
          }
        } else if (currentStep === 1) {
          if (faskesNakesData.metodeFaskes === "cari" && !faskesNakesData.facilityId) {
            newErrors.faskesTujuan = "Fasilitas kesehatan aktif tempat bertugas wajib dipilih";
          }
          if (faskesNakesData.metodeFaskes === "undangan" && !faskesNakesData.kodeUndangan.trim()) {
            newErrors.kodeUndangan = "Masukkan kode undangan fasilitas";
          }
        } else if (currentStep === 2) {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(faskesNakesData.email.trim())) {
            newErrors.email = "Format email tidak valid, gunakan format seperti nama@contoh.com";
          }
          if (faskesNakesData.password.length < 6) {
            newErrors.password = "Kata sandi minimal 6 karakter";
          }
          if (faskesNakesData.password !== faskesNakesData.konfirmasiPassword) {
            newErrors.konfirmasiPassword = "Konfirmasi kata sandi tidak cocok";
          }
          if (!faskesNakesData.setujuSumpah) {
            newErrors.setujuSumpah = "Anda wajib menyetujui sumpah profesi dan kerahasiaan medis untuk melanjutkan";
          }
        }
      }
    } else if (peran === "verifikator") {
      if (currentStep === 0) {
        if (!verifikatorData.provinsi) {
          newErrors.provinsiVerif = "Provinsi penugasan wajib dipilih";
        }
        if (!verifikatorData.kota) {
          newErrors.kotaVerif = "Kota / Kabupaten penugasan wajib dipilih";
        }
        if (subperan !== "dinas-sosial" && !verifikatorData.kecamatan) {
          newErrors.kecamatanVerif = "Kecamatan penugasan wajib dipilih";
        }
        if (subperan === "kelurahan" && !verifikatorData.kelurahan) {
          newErrors.kelurahanVerif = "Kelurahan / Desa penugasan wajib dipilih";
        }
      } else if (currentStep === 1) {
        if (!verifikatorData.namaLengkap.trim()) {
          newErrors.namaLengkap = "Nama lengkap petugas verifikator wajib diisi";
        }
        if (!/^\d{18}$/.test(verifikatorData.nip)) {
          newErrors.nip = "NIP harus 18 digit angka";
        }
        if (!verifikatorData.jabatan.trim()) {
          newErrors.jabatan = "Jabatan atau seksi penugasan wajib diisi";
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(verifikatorData.emailDinas.trim())) {
          newErrors.emailDinas = "Format email tidak valid, gunakan format seperti nama@contoh.com";
        }
      } else if (currentStep === 2) {
        if (!uploadedFile) {
          newErrors.file = "Unggah Surat Keputusan / Surat Tugas";
        } else if (uploadedFile.size > 5 * 1024 * 1024) {
          newErrors.file = "Ukuran berkas melebihi batas maksimal 5 MB. Silakan kompres atau pilih berkas yang lebih kecil.";
        }
        if (verifikatorData.password.length < 6) {
          newErrors.password = "Kata sandi minimal 6 karakter";
        }
        if (verifikatorData.password !== verifikatorData.konfirmasiPassword) {
          newErrors.konfirmasiPassword = "Konfirmasi kata sandi tidak cocok";
        }
        if (!verifikatorData.setujuIntegritas) {
          newErrors.setujuIntegritas = "Anda wajib menyetujui pakta integritas verifikasi data untuk melanjutkan";
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...newErrors }));
      setServerError(COMMON_VALIDATION_ERROR_BANNER);
      const firstField = Object.keys(newErrors)[0];
      const elementId = getFieldElementId(peran, subperan, jalurFaskes, firstField);
      focusAndScrollToField(elementId);
      return false;
    }

    // Bersihkan error untuk langkah ini bila isian sudah valid
    setErrors((prev) => {
      const next = { ...prev };
      // Hapus kunci error yang berada di langkah aktif
      for (const k of Object.keys(prev)) {
        if (getFieldStep(peran, subperan, jalurFaskes, k) === currentStep) {
          delete next[k];
        }
      }
      return next;
    });
    setServerError("");
    return true;
  };

  const handleNext = async () => {
    setServerError("");
    if (!validateStep()) return;

    if (currentStep < steps.length - 1) {
      setDirection("next");
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setSubmitting(true);
      let payload: unknown = null;

      if (peran === "pasien" && subperan === "pribadi") {
        payload = {
          peran: "pasien",
          subperan: "pribadi",
          ...pribadiData,
        };
      } else if (peran === "pasien" && subperan === "keluarga") {
        payload = {
          peran: "pasien",
          subperan: "keluarga",
          email: keluargaData.emailWali,
          password: keluargaData.passwordWali,
          nikWali: keluargaData.nikWali,
          namaWali: keluargaData.namaWali,
          noHpWali: keluargaData.noHpWali,
          hubunganWali: keluargaData.hubunganWali,
          noKk: keluargaData.noKk,
          provinsi: keluargaData.provinsi,
          kota: keluargaData.kota,
          kecamatan: keluargaData.kecamatan,
          kelurahan: keluargaData.kelurahan,
          alamatWali: keluargaData.alamatWali,
          anggotaKeluarga,
          setujuKetentuan: keluargaData.setujuKetentuan,
        };
      } else if (peran === "fasilitas" && jalurFaskes === "admin") {
        payload = {
          peran: "fasilitas",
          subperan,
          tipe: "admin",
          ...faskesAdminData,
        };
      } else if (peran === "fasilitas" && jalurFaskes === "nakes") {
        payload = {
          peran: "fasilitas",
          subperan,
          tipe: "nakes",
          ...faskesNakesData,
        };
      } else if (peran === "verifikator") {
        payload = {
          peran: "verifikator",
          subperan,
          ...verifikatorData,
        };
      }

      let submissionPayload: unknown = payload;
      if (peran === "fasilitas" && jalurFaskes === "admin") {
        if (uploadedFile && uploadedFile.size > 5 * 1024 * 1024) {
          setSubmitting(false);
          setServerError("Ukuran dokumen izin operasional melebihi batas maksimal 5 MB. Silakan pilih atau kompres berkas Anda.");
          setErrors((prev) => ({
            ...prev,
            file: "Ukuran berkas melebihi batas maksimal 5 MB",
          }));
          return;
        }
        const formData = new FormData();
        formData.append("payload", JSON.stringify(payload));
        if (uploadedFile) {
          formData.append("file", uploadedFile);
        }
        submissionPayload = formData;
      }

      try {
        const res = await submitPendaftaranAction(submissionPayload);
        setSubmitting(false);

        if (!res.success) {
          setServerError(res.error || COMMON_VALIDATION_ERROR_BANNER);
          if (res.fieldErrors && Object.keys(res.fieldErrors).length > 0) {
            const combinedErrors = { ...errors, ...res.fieldErrors };
            setErrors(combinedErrors);

            // Cari langkah yang memuat error pertama (terutama jika berada di langkah sebelumnya)
            const errInfo = findFirstErrorStepAndField(
              combinedErrors,
              peran,
              subperan,
              jalurFaskes
            );

            if (errInfo) {
              if (errInfo.targetStep !== currentStep) {
                setDirection(errInfo.targetStep < currentStep ? "prev" : "next");
                setCurrentStep(errInfo.targetStep);
              }
              focusAndScrollToField(errInfo.elementId);
              return;
            }
          }
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }

        let url = `/daftar/selesai?peran=${peran}&sub=${subperan}`;
        if (peran === "fasilitas") {
          url += `&tipe=${jalurFaskes}`;
        }
        router.push(url);
      } catch (err: unknown) {
        setSubmitting(false);
        const errMsg = err instanceof Error ? err.message : String(err);
        if (
          errMsg.toLowerCase().includes("failed to fetch") ||
          errMsg.toLowerCase().includes("network")
        ) {
          setServerError(
            "Gagal mengirim dokumen ke server. Pastikan ukuran file tidak melebihi 5 MB dan koneksi internet Anda stabil."
          );
        } else {
          setServerError(`Terjadi kendala saat memproses pendaftaran: ${errMsg}`);
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
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
    <div className={`min-h-screen text-[#464858] pb-16 ${peran === "verifikator" ? "bg-[#FAF5F2]" : ""}`} data-portal-wallpaper={peran !== "verifikator" ? "true" : undefined}>
      {/* Top Bar: Logo kiri, BackButton kanan */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 flex items-center justify-between">
        <Logo tone={peran === "verifikator" ? "light" : "dark"} size="sm" />
        <BackButton href="/" label="Kembali ke Beranda" />
      </div>

      {/* Main Card Container */}
      <main className="max-w-[720px] mx-auto px-4 sm:px-6 mt-6 sm:mt-8">
        <div className="bg-white rounded-[24px] shadow-sm border border-[#E2E8F0] p-6 sm:p-10">
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

          {serverError && (
            <div className="mb-6 p-4 rounded-[14px] bg-[#FDECEA] border border-[#B3261E]/20 text-[#B3261E] text-xs sm:text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Form Step Content with Transition effect */}
          <div
            className={`transition-[opacity,transform] duration-300 transform ${
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
                        <DatePicker
                          id="tanggalLahir"
                          value={pribadiData.tanggalLahir}
                          onChange={(iso) =>
                            setPribadiData({ ...pribadiData, tanggalLahir: iso })
                          }
                          error={errors.tanggalLahir}
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
                    <h2 className="text-lg font-bold text-[#0F3040]">Alamat Domisili &amp; Informasi Medis</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <RegionCombobox
                        id="provinsi"
                        label="Provinsi"
                        placeholder="Ketik atau pilih provinsi..."
                        level="province"
                        value={pribadiData.provinsi}
                        onChange={(val, item) => {
                          setPribadiData({ ...pribadiData, provinsi: val, kota: "", kecamatan: "", kelurahan: "" });
                          setPribadiCodes({ province: item?.code || "", regency: "", district: "" });
                        }}
                        required
                        error={errors.provinsi}
                      />

                      <RegionCombobox
                        id="kota"
                        label="Kota / Kabupaten"
                        placeholder={pribadiData.provinsi ? "Ketik atau pilih kota..." : "Pilih provinsi dulu"}
                        level="regency"
                        parentCode={pribadiCodes.province}
                        value={pribadiData.kota}
                        onChange={(val, item) => {
                          setPribadiData({ ...pribadiData, kota: val, kecamatan: "", kelurahan: "" });
                          setPribadiCodes((prev) => ({ ...prev, regency: item?.code || "", district: "" }));
                        }}
                        disabled={!pribadiData.provinsi}
                        required
                        error={errors.kota}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <RegionCombobox
                        id="kecamatan"
                        label="Kecamatan"
                        placeholder={pribadiData.kota ? "Ketik atau pilih kecamatan..." : "Pilih kota dulu"}
                        level="district"
                        parentCode={pribadiCodes.regency}
                        value={pribadiData.kecamatan}
                        onChange={(val, item) => {
                          setPribadiData({ ...pribadiData, kecamatan: val, kelurahan: "" });
                          setPribadiCodes((prev) => ({ ...prev, district: item?.code || "" }));
                        }}
                        disabled={!pribadiData.kota}
                        required
                        error={errors.kecamatan}
                      />

                      <RegionCombobox
                        id="kelurahan"
                        label="Kelurahan / Desa"
                        placeholder={pribadiData.kecamatan ? "Ketik atau pilih kelurahan..." : "Pilih kecamatan dulu"}
                        level="village"
                        parentCode={pribadiCodes.district}
                        value={pribadiData.kelurahan}
                        onChange={(val) => {
                          setPribadiData({ ...pribadiData, kelurahan: val });
                        }}
                        disabled={!pribadiData.kecamatan}
                        error={errors.kelurahan}
                      />
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

                    <div>
                      <label htmlFor="emailPribadi" className="block text-sm font-semibold text-[#0F3040] mb-1">
                        Alamat Email Aktif *
                      </label>
                      <input
                        id="emailPribadi"
                        type="email"
                        autoComplete="email"
                        value={pribadiData.email}
                        onChange={(e) =>
                          setPribadiData({ ...pribadiData, email: e.target.value })
                        }
                        placeholder="nama@email.com"
                        className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm"
                      />
                      {errors.email && (
                        <p className="text-xs text-[#B3261E] mt-1">{errors.email}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="passwordPribadi" className="block text-sm font-semibold text-[#0F3040] mb-1">
                          Kata Sandi Akun *
                        </label>
                        <input
                          id="passwordPribadi"
                          type="password"
                          autoComplete="new-password"
                          value={pribadiData.password}
                          onChange={(e) =>
                            setPribadiData({ ...pribadiData, password: e.target.value })
                          }
                          placeholder="Minimal 6 karakter"
                          className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm"
                        />
                        {errors.password && (
                          <p className="text-xs text-[#B3261E] mt-1">{errors.password}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="konfirmasiPasswordPribadi" className="block text-sm font-semibold text-[#0F3040] mb-1">
                          Ulangi Kata Sandi *
                        </label>
                        <input
                          id="konfirmasiPasswordPribadi"
                          type="password"
                          autoComplete="new-password"
                          value={pribadiData.konfirmasiPassword}
                          onChange={(e) =>
                            setPribadiData({
                              ...pribadiData,
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
                          <option value="Anak">Anak</option>
                          <option value="Kerabat">Kerabat</option>
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
                      <p className="text-sm font-semibold text-[#0F3040] mb-3">Alamat Domisili Wali</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <RegionCombobox
                          id="keluarga-provinsi"
                          label="Provinsi"
                          placeholder="Ketik atau pilih provinsi..."
                          level="province"
                          value={keluargaData.provinsi}
                          onChange={(val, item) => {
                            setKeluargaData({ ...keluargaData, provinsi: val, kota: "", kecamatan: "", kelurahan: "" });
                            setKeluargaCodes({ province: item?.code || "", regency: "", district: "" });
                          }}
                          required
                        />
                        <RegionCombobox
                          id="keluarga-kota"
                          label="Kota / Kabupaten"
                          placeholder={keluargaData.provinsi ? "Ketik atau pilih kota..." : "Pilih provinsi dulu"}
                          level="regency"
                          parentCode={keluargaCodes.province}
                          value={keluargaData.kota}
                          onChange={(val, item) => {
                            setKeluargaData({ ...keluargaData, kota: val, kecamatan: "", kelurahan: "" });
                            setKeluargaCodes((prev) => ({ ...prev, regency: item?.code || "", district: "" }));
                          }}
                          disabled={!keluargaData.provinsi}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        <RegionCombobox
                          id="keluarga-kecamatan"
                          label="Kecamatan"
                          placeholder={keluargaData.kota ? "Ketik atau pilih kecamatan..." : "Pilih kota dulu"}
                          level="district"
                          parentCode={keluargaCodes.regency}
                          value={keluargaData.kecamatan}
                          onChange={(val, item) => {
                            setKeluargaData({ ...keluargaData, kecamatan: val, kelurahan: "" });
                            setKeluargaCodes((prev) => ({ ...prev, district: item?.code || "" }));
                          }}
                          disabled={!keluargaData.kota}
                        />
                        <RegionCombobox
                          id="keluarga-kelurahan"
                          label="Kelurahan / Desa"
                          placeholder={keluargaData.kecamatan ? "Ketik atau pilih kelurahan..." : "Pilih kecamatan dulu"}
                          level="village"
                          parentCode={keluargaCodes.district}
                          value={keluargaData.kelurahan}
                          onChange={(val) => {
                            setKeluargaData({ ...keluargaData, kelurahan: val });
                          }}
                          disabled={!keluargaData.kecamatan}
                        />
                      </div>
                      <div className="mt-4">
                        <label htmlFor="alamatWali" className="block text-sm font-semibold text-[#0F3040] mb-1">
                          Detail Alamat (Jalan, RT/RW) (Opsional)
                        </label>
                        <input
                          id="alamatWali"
                          type="text"
                          value={keluargaData.alamatWali}
                          onChange={(e) => setKeluargaData({ ...keluargaData, alamatWali: e.target.value })}
                          placeholder="Contoh: Jl. Melati No. 5 RT 02 / RW 03"
                          className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm"
                        />
                      </div>
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
                              <DatePicker
                                id={`anggota-tgl-${idx}`}
                                size="sm"
                                value={item.tanggalLahir}
                                onChange={(iso) => {
                                  const next = [...anggotaKeluarga];
                                  next[idx].tanggalLahir = iso;
                                  setAnggotaKeluarga(next);
                                }}
                                error={errors[`anggota_tgl_${idx}`]}
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
                    <div>
                      <label htmlFor="emailWali" className="block text-sm font-semibold text-[#0F3040] mb-1">
                        Alamat Email Wali *
                      </label>
                      <input
                        id="emailWali"
                        type="email"
                        autoComplete="email"
                        value={keluargaData.emailWali}
                        onChange={(e) =>
                          setKeluargaData({ ...keluargaData, emailWali: e.target.value })
                        }
                        placeholder="wali@email.com"
                        className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm"
                      />
                      {errors.emailWali || errors.email ? (
                        <p className="text-xs text-[#B3261E] mt-1">{errors.emailWali || errors.email}</p>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="passwordWali" className="block text-sm font-semibold text-[#0F3040] mb-1">
                          Kata Sandi Akun *
                        </label>
                        <input
                          id="passwordWali"
                          type="password"
                          autoComplete="new-password"
                          value={keluargaData.passwordWali}
                          onChange={(e) =>
                            setKeluargaData({ ...keluargaData, passwordWali: e.target.value })
                          }
                          placeholder="Minimal 6 karakter"
                          className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm"
                        />
                        {errors.passwordWali || errors.password ? (
                          <p className="text-xs text-[#B3261E] mt-1">{errors.passwordWali || errors.password}</p>
                        ) : null}
                      </div>

                      <div>
                        <label htmlFor="konfirmasiPasswordWali" className="block text-sm font-semibold text-[#0F3040] mb-1">
                          Ulangi Kata Sandi *
                        </label>
                        <input
                          id="konfirmasiPasswordWali"
                          type="password"
                          autoComplete="new-password"
                          value={keluargaData.konfirmasiPasswordWali}
                          onChange={(e) =>
                            setKeluargaData({
                              ...keluargaData,
                              konfirmasiPasswordWali: e.target.value,
                            })
                          }
                          placeholder="Ketik ulang kata sandi"
                          className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm"
                        />
                        {errors.konfirmasiPasswordWali && (
                          <p className="text-xs text-[#B3261E] mt-1">
                            {errors.konfirmasiPasswordWali}
                          </p>
                        )}
                      </div>
                    </div>

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

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <RegionCombobox
                            id="faskesProvinsi"
                            label="Provinsi"
                            placeholder="Ketik atau pilih provinsi..."
                            level="province"
                            value={faskesAdminData.provinsi}
                            onChange={(val, item) => {
                              setFaskesAdminData({ ...faskesAdminData, provinsi: val, kota: "", kecamatan: "", kelurahan: "" });
                              setFaskesCodes({ province: item?.code || "", regency: "", district: "" });
                            }}
                            required
                            error={errors.faskesProvinsi}
                          />

                          <RegionCombobox
                            id="faskesKota"
                            label="Kota / Kabupaten"
                            placeholder={faskesAdminData.provinsi ? "Ketik atau pilih kota..." : "Pilih provinsi dulu"}
                            level="regency"
                            parentCode={faskesCodes.province}
                            value={faskesAdminData.kota}
                            onChange={(val, item) => {
                              setFaskesAdminData({ ...faskesAdminData, kota: val, kecamatan: "", kelurahan: "" });
                              setFaskesCodes((prev) => ({ ...prev, regency: item?.code || "", district: "" }));
                            }}
                            disabled={!faskesAdminData.provinsi}
                            required
                            error={errors.faskesKota}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <RegionCombobox
                            id="faskesKecamatan"
                            label="Kecamatan"
                            placeholder={faskesAdminData.kota ? "Ketik atau pilih kecamatan..." : "Pilih kota dulu"}
                            level="district"
                            parentCode={faskesCodes.regency}
                            value={faskesAdminData.kecamatan}
                            onChange={(val, item) => {
                              setFaskesAdminData({ ...faskesAdminData, kecamatan: val, kelurahan: "" });
                              setFaskesCodes((prev) => ({ ...prev, district: item?.code || "" }));
                            }}
                            disabled={!faskesAdminData.kota}
                            error={errors.faskesKecamatan}
                          />

                          <RegionCombobox
                            id="faskesKelurahan"
                            label="Kelurahan / Desa"
                            placeholder={faskesAdminData.kecamatan ? "Ketik atau pilih kelurahan..." : "Pilih kecamatan dulu"}
                            level="village"
                            parentCode={faskesCodes.district}
                            value={faskesAdminData.kelurahan}
                            onChange={(val) => {
                              setFaskesAdminData({ ...faskesAdminData, kelurahan: val });
                            }}
                            disabled={!faskesAdminData.kecamatan}
                            error={errors.faskesKelurahan}
                          />
                        </div>

                        <div>
                          <label htmlFor="alamatLengkapFaskes" className="block text-sm font-semibold text-[#0F3040] mb-1">
                            Alamat Lengkap (Jalan, RT/RW) *
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
                          {errors.emailFaskes || errors.email ? (
                            <p className="text-xs text-[#B3261E] mt-1">{errors.emailFaskes || errors.email}</p>
                          ) : null}
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
                              Fasilitas Kesehatan Penugasan *
                            </label>
                            <FacilityCombobox
                              id="faskesTujuan"
                              subperan={subperan}
                              value={faskesNakesData.facilityId}
                              selectedName={faskesNakesData.faskesTujuan}
                              onChange={(facId, fac) => {
                                setFaskesNakesData({
                                  ...faskesNakesData,
                                  facilityId: facId,
                                  faskesTujuan: fac?.name || "",
                                });
                              }}
                              error={errors.faskesTujuan}
                              required
                            />
                            <p className="text-xs text-[#464858]/70 mt-1.5">
                              Setelah mendaftar, admin fasilitas aktif ini akan menerima permohonan persetujuan Anda.
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
                      <RegionCombobox
                        id="provinsiVerif"
                        label="Provinsi"
                        placeholder="Ketik atau pilih provinsi..."
                        level="province"
                        value={verifikatorData.provinsi}
                        onChange={(val, item) => {
                          setVerifikatorData({ ...verifikatorData, provinsi: val, kota: "", kecamatan: "", kelurahan: "" });
                          setVerifikatorCodes({ province: item?.code || "", regency: "", district: "" });
                        }}
                        required
                        error={errors.provinsiVerif}
                      />

                      <RegionCombobox
                        id="kotaVerif"
                        label="Kota / Kabupaten"
                        placeholder={verifikatorData.provinsi ? "Ketik atau pilih kota..." : "Pilih provinsi dulu"}
                        level="regency"
                        parentCode={verifikatorCodes.province}
                        value={verifikatorData.kota}
                        onChange={(val, item) => {
                          setVerifikatorData({ ...verifikatorData, kota: val, kecamatan: "", kelurahan: "" });
                          setVerifikatorCodes((prev) => ({ ...prev, regency: item?.code || "", district: "" }));
                        }}
                        disabled={!verifikatorData.provinsi}
                        required
                        error={errors.kotaVerif}
                      />
                    </div>

                    {subperan !== "dinas-sosial" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <RegionCombobox
                          id="kecamatanVerif"
                          label="Kecamatan"
                          placeholder={verifikatorData.kota ? "Ketik atau pilih kecamatan..." : "Pilih kota dulu"}
                          level="district"
                          parentCode={verifikatorCodes.regency}
                          value={verifikatorData.kecamatan}
                          onChange={(val, item) => {
                            setVerifikatorData({ ...verifikatorData, kecamatan: val, kelurahan: "" });
                            setVerifikatorCodes((prev) => ({ ...prev, district: item?.code || "" }));
                          }}
                          disabled={!verifikatorData.kota}
                          error={errors.kecamatanVerif}
                        />

                        {subperan === "kelurahan" && (
                          <RegionCombobox
                            id="kelurahanVerif"
                            label="Kelurahan / Desa"
                            placeholder={verifikatorData.kecamatan ? "Ketik atau pilih kelurahan..." : "Pilih kecamatan dulu"}
                            level="village"
                            parentCode={verifikatorCodes.district}
                            value={verifikatorData.kelurahan}
                            onChange={(val) => {
                              setVerifikatorData({ ...verifikatorData, kelurahan: val });
                            }}
                            disabled={!verifikatorData.kecamatan}
                            error={errors.kelurahanVerif}
                          />
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
                      {errors.emailDinas || errors.email ? (
                        <p className="text-xs text-[#B3261E] mt-1">{errors.emailDinas || errors.email}</p>
                      ) : null}
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
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-[14px] text-sm font-semibold bg-[#8F5A4E] text-white hover:bg-[#A56F63] active:bg-[#7B4B40] transition-colors shadow-sm ml-auto disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mendaftarkan...</span>
                </>
              ) : (
                <>
                  <span>{currentStep === steps.length - 1 ? "Selesaikan Pendaftaran" : "Lanjutkan"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
