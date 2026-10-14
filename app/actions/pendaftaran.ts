"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// ============================================================================
// SKEMA VALIDASI ZOD DI SISI SERVER
// ============================================================================

const PasienPribadiSchema = z.object({
  peran: z.literal("pasien"),
  subperan: z.literal("pribadi"),
  email: z.string().email("Format email tidak valid, gunakan format seperti nama@contoh.com"),
  password: z.string().min(6, "Kata sandi minimal 6 karakter"),
  nik: z.string().regex(/^\d{16}$/, "NIK harus terdiri dari 16 digit angka"),
  nama: z.string().min(2, "Nama lengkap wajib diisi sesuai kartu identitas"),
  tanggalLahir: z.string().min(1, "Tanggal lahir wajib dipilih"),
  jenisKelamin: z.string().min(1, "Jenis kelamin wajib dipilih"),
  noHp: z.string().regex(/^(08|62|\+62)\d{8,12}$/, "Nomor HP tidak valid, gunakan format 08xx atau 62xx (10-14 digit)"),
  provinsi: z.string().min(1, "Provinsi wajib dipilih"),
  kota: z.string().min(1, "Kota/Kabupaten wajib dipilih"),
  kecamatan: z.string().min(1, "Kecamatan wajib dipilih"),
  kelurahan: z.string().min(1, "Kelurahan wajib dipilih"),
  alamatDetail: z.string().min(5, "Alamat lengkap wajib diisi minimal 5 karakter"),
  noBpjs: z.string().optional().or(z.literal("")),
  penjamin: z.enum(["mandiri", "bpjs", "asuransi", "jaminan_daerah"]).optional().default("mandiri"),
  namaAsuransi: z.string().optional().or(z.literal("")),
  nomorPolisAsuransi: z.string().optional().or(z.literal("")),
  riwayatAlergi: z.string().optional().or(z.literal("")),
  setujuKetentuan: z.boolean().refine((val) => val === true, {
    message: "Anda wajib menyetujui pemrosesan data medis untuk melanjutkan",
  }),
});

const PasienKeluargaSchema = z.object({
  peran: z.literal("pasien"),
  subperan: z.literal("keluarga"),
  email: z.string().email("Format email tidak valid, gunakan format seperti nama@contoh.com"),
  password: z.string().min(6, "Kata sandi minimal 6 karakter"),
  nikWali: z.string().regex(/^\d{16}$/, "NIK wali harus 16 digit angka"),
  namaWali: z.string().min(2, "Nama lengkap wali wajib diisi sesuai KTP"),
  noHpWali: z.string().regex(/^(08|62|\+62)\d{8,12}$/, "Nomor HP wali tidak valid, gunakan format 08xx atau 62xx (10-14 digit)"),
  hubunganWali: z.string().min(1, "Hubungan keluarga wajib dipilih"),
  noKk: z.string().regex(/^\d{16}$/, "Nomor Kartu Keluarga harus 16 digit angka"),
  provinsi: z.string().optional().or(z.literal("")),
  kota: z.string().optional().or(z.literal("")),
  kecamatan: z.string().optional().or(z.literal("")),
  kelurahan: z.string().optional().or(z.literal("")),
  alamatWali: z.string().optional().or(z.literal("")),
  anggotaKeluarga: z
    .array(
      z.object({
        id: z.string(),
        nama: z.string().min(1, "Nama anggota keluarga wajib diisi"),
        nik: z.string().regex(/^\d{16}$/, "NIK anggota keluarga harus 16 digit angka"),
        tanggalLahir: z.string().min(1, "Tanggal lahir anggota wajib dipilih"),
        hubungan: z.string().min(1, "Hubungan anggota keluarga wajib diisi"),
        penjamin: z.enum(["mandiri", "bpjs", "asuransi", "jaminan_daerah"]).optional().default("mandiri"),
        noBpjs: z.string().optional().or(z.literal("")),
        namaAsuransi: z.string().optional().or(z.literal("")),
        nomorPolisAsuransi: z.string().optional().or(z.literal("")),
      })
    )
    .min(1, "Tambahkan minimal satu anggota keluarga"),
  setujuKetentuan: z.boolean().refine((val) => val === true, {
    message: "Anda wajib menyetujui perwalian data keluarga untuk melanjutkan",
  }),
});

const FasilitasAdminSchema = z.object({
  peran: z.literal("fasilitas"),
  subperan: z.string(),
  tipe: z.literal("admin"),
  namaFaskes: z.string().min(2, "Nama resmi fasilitas kesehatan wajib diisi"),
  kodeFaskes: z.string().min(3, "Kode faskes atau nomor izin operasional wajib diisi"),
  provinsi: z.string().min(1, "Provinsi wajib dipilih"),
  kota: z.string().min(1, "Kota/Kabupaten wajib dipilih"),
  kecamatan: z.string().min(1, "Kecamatan wajib dipilih"),
  kelurahan: z.string().min(1, "Kelurahan wajib dipilih"),
  alamatLengkap: z.string().min(5, "Alamat lengkap fasilitas wajib diisi minimal 5 karakter"),
  noTelp: z.string().min(6, "Nomor telepon operasional faskes wajib diisi"),
  penanggungJawab: z.string().min(2, "Nama kepala faskes atau penanggung jawab wajib diisi"),
  emailFaskes: z.string().email("Format email tidak valid, gunakan format seperti nama@contoh.com"),
  password: z.string().min(6, "Kata sandi minimal 6 karakter"),
  setujuKetentuan: z.boolean().refine((val) => val === true, {
    message: "Anda wajib menyetujui kepatuhan standar fasilitas untuk melanjutkan",
  }),
});

const FasilitasNakesSchema = z.object({
  peran: z.literal("fasilitas"),
  subperan: z.string(),
  tipe: z.literal("nakes"),
  namaLengkap: z.string().min(2, "Nama lengkap tenaga medis beserta gelar wajib diisi"),
  nik: z.string().regex(/^\d{16}$/, "NIK harus 16 digit angka"),
  profesi: z.string().min(2, "Profesi tenaga kesehatan wajib diisi"),
  noStr: z.string().min(5, "Nomor STR aktif wajib diisi"),
  sipNomor: z.string().optional().or(z.literal("")),
  spesialisasi: z.string().optional().or(z.literal("")),
  facilityId: z.string().optional().nullable(),
  faskesTujuan: z.string().min(2, "Fasilitas kesehatan tempat bertugas wajib dipilih"),
  kodeUndangan: z.string().optional().or(z.literal("")),
  metodeFaskes: z.enum(["cari", "undangan"]),
  email: z.string().email("Format email tidak valid, gunakan format seperti nama@contoh.com"),
  password: z.string().min(6, "Kata sandi minimal 6 karakter"),
  setujuSumpah: z.boolean().refine((val) => val === true, {
    message: "Anda wajib menyetujui sumpah profesi dan kerahasiaan medis untuk melanjutkan",
  }),
});

const VerifikatorSchema = z
  .object({
    peran: z.literal("verifikator"),
    subperan: z.string(),
    namaLengkap: z.string().min(2, "Nama lengkap petugas verifikator wajib diisi"),
    nip: z.string().regex(/^\d{18}$/, "NIP harus 18 digit angka"),
    jabatan: z.string().min(2, "Jabatan atau seksi penugasan wajib diisi"),
    provinsi: z.string().min(1, "Provinsi penugasan wajib dipilih"),
    kota: z.string().min(1, "Kota / Kabupaten penugasan wajib dipilih"),
    kecamatan: z.string().optional().nullable().or(z.literal("")),
    kelurahan: z.string().optional().nullable().or(z.literal("")),
    emailDinas: z.string().email("Format email tidak valid, gunakan format seperti nama@contoh.com"),
    noHp: z
      .string()
      .regex(/^(08|62|\+62)\d{8,12}$/, "Nomor kontak tidak valid, gunakan format 08xx atau 62xx")
      .optional()
      .nullable()
      .or(z.literal("")),
    password: z.string().min(6, "Kata sandi minimal 6 karakter"),
    setujuIntegritas: z.boolean().refine((val) => val === true, {
      message: "Anda wajib menyetujui pakta integritas verifikasi data untuk melanjutkan",
    }),
  })
  .superRefine((data, ctx) => {
    const sp = data.subperan.toLowerCase().replace(/_/g, "-");
    // Kecamatan wajib dipilih untuk kelurahan dan kecamatan
    if (sp !== "dinas-sosial") {
      if (!data.kecamatan || data.kecamatan.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Kecamatan penugasan wajib dipilih",
          path: ["kecamatan"],
        });
      }
    }
    // Kelurahan wajib dipilih hanya untuk kelurahan
    if (sp === "kelurahan") {
      if (!data.kelurahan || data.kelurahan.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Kelurahan / Desa penugasan wajib dipilih",
          path: ["kelurahan"],
        });
      }
    }
  });

export type PendaftaranPayload =
  | z.infer<typeof PasienPribadiSchema>
  | z.infer<typeof PasienKeluargaSchema>
  | z.infer<typeof FasilitasAdminSchema>
  | z.infer<typeof FasilitasNakesSchema>
  | z.infer<typeof VerifikatorSchema>;

export interface PendaftaranResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

// ============================================================================
// SERVER ACTION: SUBMIT PENDAFTARAN & TULIS KE TABEL DOMAIN SUPABASE
// ============================================================================

export async function submitPendaftaranAction(
  payloadInput: unknown
): Promise<PendaftaranResult> {
  if (!payloadInput) {
    return { success: false, error: "Data pendaftaran tidak valid" };
  }

  let payload: unknown;
  let uploadedFile: File | null = null;

  if (payloadInput instanceof FormData) {
    const rawPayload = payloadInput.get("payload");
    if (typeof rawPayload === "string") {
      try {
        payload = JSON.parse(rawPayload);
      } catch {
        return { success: false, error: "Format data pendaftaran tidak valid" };
      }
    } else {
      return { success: false, error: "Data pendaftaran tidak valid" };
    }

    const fileEntry = payloadInput.get("file");
    if (fileEntry instanceof File) {
      uploadedFile = fileEntry;
    }
  } else if (typeof payloadInput === "object") {
    payload = payloadInput;
  } else {
    return { success: false, error: "Data pendaftaran tidak valid" };
  }

  const raw = payload as Record<string, unknown>;
  const peran = raw.peran as string;
  const subperan = raw.subperan as string;
  const tipe = raw.tipe as string | undefined;

  let emailToRegister = "";
  let passwordToRegister = "";
  let fullName = "";
  let userMetadata: Record<string, unknown> = {};

  const supabase = await createClient();

  let pasienPribadiData: z.infer<typeof PasienPribadiSchema> | null = null;
  let pasienKeluargaData: z.infer<typeof PasienKeluargaSchema> | null = null;
  let fasilitasAdminData: z.infer<typeof FasilitasAdminSchema> | null = null;
  let fasilitasNakesData: z.infer<typeof FasilitasNakesSchema> | null = null;
  let verifikatorData: z.infer<typeof VerifikatorSchema> | null = null;

  // 1. Validasi Zod sesuai peran & subperan
  if (peran === "pasien" && subperan === "pribadi") {
    const result = PasienPribadiSchema.safeParse(payload);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0];
        if (key) fieldErrors[String(key)] = issue.message;
      });
      return {
        success: false,
        error: "Ada isian yang belum sesuai, periksa kembali",
        fieldErrors,
      };
    }
    pasienPribadiData = result.data;
    emailToRegister = pasienPribadiData.email;
    passwordToRegister = pasienPribadiData.password;
    fullName = pasienPribadiData.nama;
    userMetadata = {
      role: "pasien",
      subrole: "pribadi",
      status: "aktif",
      nama: pasienPribadiData.nama,
      nik: pasienPribadiData.nik,
      tanggalLahir: pasienPribadiData.tanggalLahir,
      jenisKelamin: pasienPribadiData.jenisKelamin,
      noHp: pasienPribadiData.noHp,
      provinsi: pasienPribadiData.provinsi,
      kota: pasienPribadiData.kota,
      kecamatan: pasienPribadiData.kecamatan,
      kelurahan: pasienPribadiData.kelurahan,
      alamatDetail: pasienPribadiData.alamatDetail,
      noBpjs: pasienPribadiData.noBpjs || null,
      riwayatAlergi: pasienPribadiData.riwayatAlergi || null,
    };
  } else if (peran === "pasien" && subperan === "keluarga") {
    const result = PasienKeluargaSchema.safeParse(payload);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const p0 = issue.path[0];
        if (
          p0 === "anggotaKeluarga" &&
          typeof issue.path[1] === "number" &&
          issue.path[2]
        ) {
          const sub = String(issue.path[2]);
          const subKey =
            sub === "tanggalLahir" ? "tgl" : sub === "hubungan" ? "hub" : sub;
          fieldErrors[`anggota_${subKey}_${issue.path[1]}`] = issue.message;
          fieldErrors.anggota = issue.message;
        } else if (p0 === "email") {
          fieldErrors.email = issue.message;
          fieldErrors.emailWali = issue.message;
        } else if (p0 === "password") {
          fieldErrors.password = issue.message;
          fieldErrors.passwordWali = issue.message;
        } else if (p0) {
          fieldErrors[String(p0)] = issue.message;
        }
      });
      return {
        success: false,
        error: "Ada isian yang belum sesuai, periksa kembali",
        fieldErrors,
      };
    }
    pasienKeluargaData = result.data;
    emailToRegister = pasienKeluargaData.email;
    passwordToRegister = pasienKeluargaData.password;
    fullName = pasienKeluargaData.namaWali;
    userMetadata = {
      role: "pasien",
      subrole: "keluarga",
      status: "menunggu",
      namaWali: pasienKeluargaData.namaWali,
      nikWali: pasienKeluargaData.nikWali,
      noHpWali: pasienKeluargaData.noHpWali,
      hubunganWali: pasienKeluargaData.hubunganWali,
      noKk: pasienKeluargaData.noKk,
      jumlahAnggota: pasienKeluargaData.anggotaKeluarga.length,
      anggotaKeluarga: pasienKeluargaData.anggotaKeluarga,
    };
  } else if (peran === "fasilitas" && tipe === "admin") {
    const result = FasilitasAdminSchema.safeParse(payload);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0];
        if (key) {
          fieldErrors[String(key)] = issue.message;
          if (key === "emailFaskes") fieldErrors.email = issue.message;
        }
      });
      return {
        success: false,
        error: "Ada isian yang belum sesuai, periksa kembali",
        fieldErrors,
      };
    }
    fasilitasAdminData = result.data;

    // Validasi berkas fisik izin operasional faskes
    if (!uploadedFile || uploadedFile.size === 0) {
      return {
        success: false,
        error: "Berkas surat izin operasional faskes wajib diunggah",
        fieldErrors: { file: "Unggah dokumen izin operasional faskes" },
      };
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    if (uploadedFile.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: "Ukuran berkas melebihi batas maksimal 5MB",
        fieldErrors: { file: "Ukuran berkas melebihi batas maksimal 5MB" },
      };
    }

    const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];
    const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];
    const fileNameLower = uploadedFile.name.toLowerCase();
    const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) =>
      fileNameLower.endsWith(ext)
    );
    const hasValidMime = ALLOWED_MIME_TYPES.includes(uploadedFile.type);

    if (!hasValidMime && !hasValidExtension) {
      return {
        success: false,
        error:
          "Format berkas tidak valid. Harap unggah dokumen dalam format PDF, JPG, atau PNG",
        fieldErrors: {
          file: "Format berkas tidak valid (gunakan PDF, JPG, atau PNG)",
        },
      };
    }

    emailToRegister = fasilitasAdminData.emailFaskes;
    passwordToRegister = fasilitasAdminData.password;
    fullName = fasilitasAdminData.penanggungJawab;
    userMetadata = {
      role: "fasilitas",
      subrole: fasilitasAdminData.subperan,
      tipe: "admin",
      status: "menunggu",
      namaFaskes: fasilitasAdminData.namaFaskes,
      kodeFaskes: fasilitasAdminData.kodeFaskes,
      provinsi: fasilitasAdminData.provinsi,
      kota: fasilitasAdminData.kota,
      kecamatan: fasilitasAdminData.kecamatan,
      kelurahan: fasilitasAdminData.kelurahan,
      alamatLengkap: fasilitasAdminData.alamatLengkap,
      noTelp: fasilitasAdminData.noTelp,
      penanggungJawab: fasilitasAdminData.penanggungJawab,
    };
  } else if (peran === "fasilitas" && tipe === "nakes") {
    const result = FasilitasNakesSchema.safeParse(payload);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0];
        if (key) fieldErrors[String(key)] = issue.message;
      });
      return {
        success: false,
        error: "Ada isian yang belum sesuai, periksa kembali",
        fieldErrors,
      };
    }
    fasilitasNakesData = result.data;

    // Validasi penempatan faskes di server
    if (fasilitasNakesData.metodeFaskes === "undangan") {
      if (!fasilitasNakesData.kodeUndangan || !fasilitasNakesData.kodeUndangan.trim()) {
        return {
          success: false,
          error: "Kode undangan fasilitas wajib diisi",
          fieldErrors: { kodeUndangan: "Kode undangan wajib diisi" },
        };
      }

      let expectedRole: "dokter" | "petugas" | "apoteker" = "petugas";
      const profLower = fasilitasNakesData.profesi.toLowerCase();
      const spLower = String(subperan).toLowerCase();
      if (profLower.includes("apoteker") || spLower === "apotek") {
        expectedRole = "apoteker";
      } else if (profLower.includes("dokter")) {
        expectedRole = "dokter";
      } else {
        expectedRole = "petugas";
      }

      // Panggil RPC validate_invitation_code di server dengan pengecekan role & profesi
      const { data: invResult, error: invRpcErr } = await supabase.rpc("validate_invitation_code", {
        p_code: fasilitasNakesData.kodeUndangan.trim(),
        p_expected_role: expectedRole,
        p_expected_profession: fasilitasNakesData.profesi,
      });

      if (invRpcErr || !invResult || !(invResult as { valid?: boolean }).valid) {
        const msg = (invResult as { message?: string })?.message || "Kode undangan tidak valid atau kedaluwarsa";
        return {
          success: false,
          error: msg,
          fieldErrors: { kodeUndangan: msg },
        };
      }

      const invData = invResult as {
        valid: boolean;
        facility_id: string;
        facility_name: string;
      };

      fasilitasNakesData.facilityId = invData.facility_id;
      fasilitasNakesData.faskesTujuan = invData.facility_name;
    } else {
      // Metode cari dari fasilitas terdaftar
      if (!fasilitasNakesData.facilityId) {
        return {
          success: false,
          error: "Fasilitas kesehatan penugasan wajib dipilih",
          fieldErrors: { faskesTujuan: "Pilih fasilitas kesehatan penugasan" },
        };
      }

      // Verifikasi faskes aktif di DB via RPC get_active_facility
      const { data: targetFac, error: facErr } = await supabase
        .rpc("get_active_facility", { p_facility_id: fasilitasNakesData.facilityId })
        .maybeSingle();

      if (facErr || !targetFac) {
        return {
          success: false,
          error: "Fasilitas kesehatan yang dipilih tidak aktif atau tidak ditemukan",
          fieldErrors: { faskesTujuan: "Fasilitas tidak valid atau belum aktif" },
        };
      }
    }

    emailToRegister = fasilitasNakesData.email;
    passwordToRegister = fasilitasNakesData.password;
    fullName = fasilitasNakesData.namaLengkap;
    userMetadata = {
      role: "fasilitas",
      subrole: fasilitasNakesData.subperan,
      tipe: "nakes",
      status: "menunggu",
      namaLengkap: fasilitasNakesData.namaLengkap,
      nik: fasilitasNakesData.nik,
      profesi: fasilitasNakesData.profesi,
      noStr: fasilitasNakesData.noStr,
      sipNomor: fasilitasNakesData.sipNomor || null,
      spesialisasi: fasilitasNakesData.spesialisasi || null,
      facilityId: fasilitasNakesData.facilityId,
      faskesTujuan: fasilitasNakesData.faskesTujuan,
      kodeUndangan: fasilitasNakesData.kodeUndangan || null,
      metodeFaskes: fasilitasNakesData.metodeFaskes,
    };
  } else if (peran === "verifikator") {
    const result = VerifikatorSchema.safeParse(payload);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0];
        if (key) {
          fieldErrors[String(key)] = issue.message;
          if (key === "namaLengkap") fieldErrors.namaPetugas = issue.message;
          if (key === "nip") fieldErrors.nipPetugas = issue.message;
          if (key === "jabatan") fieldErrors.jabatanPetugas = issue.message;
          if (key === "provinsi") fieldErrors.provinsiVerif = issue.message;
          if (key === "kota") fieldErrors.kotaVerif = issue.message;
          if (key === "kecamatan") fieldErrors.kecamatanVerif = issue.message;
          if (key === "kelurahan") fieldErrors.kelurahanVerif = issue.message;
          if (key === "emailDinas") fieldErrors.email = issue.message;
        }
      });
      return {
        success: false,
        error: "Ada isian yang belum sesuai, periksa kembali",
        fieldErrors,
      };
    }
    verifikatorData = result.data;
    emailToRegister = verifikatorData.emailDinas;
    passwordToRegister = verifikatorData.password;
    fullName = verifikatorData.namaLengkap;
    userMetadata = {
      role: "verifikator",
      subrole: verifikatorData.subperan,
      status: "menunggu",
      namaLengkap: verifikatorData.namaLengkap,
      nip: verifikatorData.nip,
      jabatan: verifikatorData.jabatan,
      provinsi: verifikatorData.provinsi,
      kota: verifikatorData.kota,
      kecamatan: verifikatorData.kecamatan?.trim() || null,
      kelurahan: verifikatorData.kelurahan?.trim() || null,
      noHp: verifikatorData.noHp?.trim() || null,
    };
  } else {
    return { success: false, error: "Peran pendaftaran tidak dikenali" };
  }

  try {
    // 2. Daftar akun via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: emailToRegister.trim(),
      password: passwordToRegister,
      options: {
        data: userMetadata,
      },
    });

    if (authError) {
      const msg = authError.message.toLowerCase();
      if (
        msg.includes("already registered") ||
        msg.includes("user already exists") ||
        msg.includes("already been registered")
      ) {
        return {
          success: false,
          error: "Alamat email ini sudah terdaftar. Silakan masuk atau gunakan email lain.",
        };
      }
      if (msg.includes("rate limit") || msg.includes("too many requests")) {
        return {
          success: false,
          error: "Terlalu banyak permintaan pendaftaran. Mohon tunggu beberapa saat.",
        };
      }
      return { success: false, error: "Pendaftaran gagal: " + authError.message };
    }

    const userId = authData.user?.id;
    if (!userId) {
      return {
        success: false,
        error: "Akun tidak dapat dibuat. Silakan coba kembali.",
      };
    }

    // Pastikan sesi otentikasi benar-benar aktif SEBELUM operasi database & storage
    let activeSession = authData.session;
    if (!activeSession) {
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: emailToRegister.trim(),
          password: passwordToRegister,
        });

      if (signInError) {
        return {
          success: false,
          error: "Pendaftaran akun berhasil, namun gagal mengaktifkan sesi login: " + signInError.message,
        };
      }
      activeSession = signInData.session;
    }

    if (activeSession?.access_token && activeSession?.refresh_token) {
      await supabase.auth.setSession({
        access_token: activeSession.access_token,
        refresh_token: activeSession.refresh_token,
      });
    }

    // Verifikasi bahwa getSession() mengembalikan user yang sesuai
    const { data: verifiedSessionData } = await supabase.auth.getSession();
    let verifiedUser = verifiedSessionData.session?.user;

    if (!verifiedUser || verifiedUser.id !== userId) {
      // Tunggu jeda singkat jika token propagation membutuhkan waktu
      await new Promise((resolve) => setTimeout(resolve, 300));
      const { data: retrySessionData } = await supabase.auth.getSession();
      verifiedUser = retrySessionData.session?.user;
      if (!verifiedUser || verifiedUser.id !== userId) {
        return {
          success: false,
          error: "Sesi otentikasi belum siap untuk operasi data. Silakan coba beberapa saat lagi.",
        };
      }
    }

    // 3. Tulis baris ke tabel profiles
    // Aturan: status 'aktif' untuk semua pasien (pribadi & keluarga) agar bisa demo tanpa approval
    const profileStatus =
      peran === "pasien" ? "aktif" : "menunggu";

    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      role: peran,
      sub_role: subperan,
      full_name: fullName,
      email: emailToRegister.trim(),
      status: profileStatus,
    });

    if (profileError) {
      return {
        success: false,
        error: "Gagal membuat profil pengguna: " + profileError.message,
      };
    }

    // 4. Tulis baris ke tabel domain sesuai peran (dilakukan berurutan)
    if (peran === "pasien" && subperan === "pribadi" && pasienPribadiData) {
      const { error: patientError } = await supabase.from("patients").insert({
        id: userId,
        patient_type: "pribadi",
        nik: pasienPribadiData.nik,
        dob: pasienPribadiData.tanggalLahir,
        gender: pasienPribadiData.jenisKelamin,
        phone: pasienPribadiData.noHp,
        province: pasienPribadiData.provinsi,
        city: pasienPribadiData.kota,
        district: pasienPribadiData.kecamatan,
        village: pasienPribadiData.kelurahan,
        address: pasienPribadiData.alamatDetail,
        bpjs_number: pasienPribadiData.penjamin === "bpjs" ? (pasienPribadiData.noBpjs || null) : null,
        blood_type: null,
        allergies: pasienPribadiData.riwayatAlergi || null,
        payer_type: pasienPribadiData.penjamin || "mandiri",
        insurance_name: pasienPribadiData.penjamin === "asuransi" ? (pasienPribadiData.namaAsuransi || null) : null,
        insurance_policy_number: pasienPribadiData.penjamin === "asuransi" ? (pasienPribadiData.nomorPolisAsuransi || null) : null,
      });

      if (patientError) {
        return {
          success: false,
          error: "Gagal menyimpan data pasien: " + patientError.message,
        };
      }
    } else if (peran === "pasien" && subperan === "keluarga" && pasienKeluargaData) {
      const { error: patientError } = await supabase.from("patients").insert({
        id: userId,
        patient_type: "keluarga",
        nik: pasienKeluargaData.nikWali,
        dob: null,
        gender: null,
        phone: pasienKeluargaData.noHpWali,
        province: pasienKeluargaData.provinsi || null,
        city: pasienKeluargaData.kota || null,
        district: pasienKeluargaData.kecamatan || null,
        village: pasienKeluargaData.kelurahan || null,
        address: pasienKeluargaData.alamatWali || null,
        bpjs_number: null,
        blood_type: null,
        allergies: null,
        payer_type: "mandiri",
      });

      if (patientError) {
        return {
          success: false,
          error: "Gagal menyimpan data wali keluarga: " + patientError.message,
        };
      }

      const membersToInsert = pasienKeluargaData.anggotaKeluarga.map((ang) => {
        let rel: "anak" | "pasangan" | "orang_tua" | "lainnya" = "lainnya";
        const h = ang.hubungan.toLowerCase().trim();
        if (h === "anak") {
          rel = "anak";
        } else if (h === "istri" || h === "suami" || h === "pasangan") {
          rel = "pasangan";
        } else if (
          h === "orang tua" ||
          h === "orang_tua" ||
          h.includes("orang tua") ||
          h === "ibu" ||
          h === "ayah"
        ) {
          rel = "orang_tua";
        } else {
          rel = "lainnya";
        }

        return {
          guardian_id: userId,
          full_name: ang.nama,
          nik: ang.nik,
          dob: ang.tanggalLahir,
          relation: rel,
          bpjs_number: ang.penjamin === "bpjs" ? (ang.noBpjs || null) : null,
          allergies: null,
          payer_type: ang.penjamin || "mandiri",
          insurance_name: ang.penjamin === "asuransi" ? (ang.namaAsuransi || null) : null,
          insurance_policy_number: ang.penjamin === "asuransi" ? (ang.nomorPolisAsuransi || null) : null,
        };
      });

      const { error: familyError } = await supabase
        .from("family_members")
        .insert(membersToInsert);

      if (familyError) {
        return {
          success: false,
          error: "Gagal menyimpan data anggota keluarga: " + familyError.message,
        };
      }
    } else if (peran === "fasilitas" && tipe === "admin" && fasilitasAdminData) {
      // 1. Verifikasi kembali bahwa sesi otentikasi siap untuk storage policy
      const { data: uploadSessionCheck } = await supabase.auth.getSession();
      const uploadUser = uploadSessionCheck.session?.user;
      if (!uploadUser || uploadUser.id !== userId) {
        return {
          success: false,
          error: "Sesi otentikasi akun belum aktif untuk mengunggah dokumen izin. Silakan coba kembali.",
          fieldErrors: {
            file: "Sesi otentikasi belum siap. Mohon ulangi pengiriman formulir.",
          },
        };
      }

      // 2. Upload berkas izin operasional ke Supabase Storage bucket 'facility-documents'
      // Path format wajib: "{user.id}/izin-operasional-{timestamp}-{namafile asli}"
      const timestamp = Date.now();
      const cleanFileName = (uploadedFile?.name || "izin_operasional.pdf").replace(/[\/\\]/g, "_");
      const storagePath = `${userId}/izin-operasional-${timestamp}-${cleanFileName}`;

      const fileBuffer = await uploadedFile!.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from("facility-documents")
        .upload(storagePath, fileBuffer, {
          contentType: uploadedFile!.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        let specificError = uploadError.message;
        const lowerMsg = uploadError.message.toLowerCase();

        if (
          lowerMsg.includes("row-level security") ||
          lowerMsg.includes("policy") ||
          lowerMsg.includes("unauthorized")
        ) {
          specificError =
            "Akses penyimpanan ditolak oleh kebijakan keamanan RLS. Sesi pengguna belum memiliki izin pada folder target.";
        } else if (
          lowerMsg.includes("payload too large") ||
          lowerMsg.includes("entity too large")
        ) {
          specificError =
            "Ukuran berkas melebihi batas yang diizinkan oleh server penyimpanan (maksimal 5MB).";
        } else if (
          lowerMsg.includes("fetch failed") ||
          lowerMsg.includes("network") ||
          lowerMsg.includes("connection")
        ) {
          specificError =
            "Gagal terhubung ke server penyimpanan Supabase. Periksa koneksi internet Anda.";
        }

        return {
          success: false,
          error: "Gagal mengunggah berkas izin operasional: " + specificError,
          fieldErrors: {
            file: "Gagal mengunggah berkas: " + specificError,
          },
        };
      }

      let fType: "puskesmas" | "klinik" | "rumah_sakit" | "apotek" = "puskesmas";
      const sp = String(subperan).toLowerCase();
      if (sp === "rumah-sakit" || sp === "rumah_sakit") {
        fType = "rumah_sakit";
      } else if (sp === "klinik") {
        fType = "klinik";
      } else if (sp === "apotek") {
        fType = "apotek";
      } else {
        fType = "puskesmas";
      }

      const { error: facilityError } = await supabase.from("facilities").insert({
        admin_id: userId,
        type: fType,
        name: fasilitasAdminData.namaFaskes,
        license_number: fasilitasAdminData.kodeFaskes,
        license_document_path: storagePath,
        address: fasilitasAdminData.alamatLengkap,
        province: fasilitasAdminData.provinsi,
        city: fasilitasAdminData.kota,
        district: fasilitasAdminData.kecamatan,
        phone: fasilitasAdminData.noTelp,
        email: fasilitasAdminData.emailFaskes,
        status: "menunggu",
      });

      if (facilityError) {
        return {
          success: false,
          error: "Gagal menyimpan data fasilitas kesehatan: " + facilityError.message,
        };
      }
    } else if (peran === "fasilitas" && tipe === "nakes" && fasilitasNakesData) {
      let sRole: "dokter" | "petugas" | "apoteker" = "petugas";
      const prof = fasilitasNakesData.profesi.toLowerCase();
      const sp = String(subperan).toLowerCase();
      if (prof.includes("apoteker") || sp === "apotek") {
        sRole = "apoteker";
      } else if (prof.includes("dokter")) {
        sRole = "dokter";
      } else {
        sRole = "petugas";
      }

      // Pendaftaran staf penempatan nakes secara transaksional (atomic)
      const specList = fasilitasNakesData.spesialisasi
        ? fasilitasNakesData.spesialisasi
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      const { data: regStaffResult, error: regStaffError } = await supabase.rpc(
        "register_facility_staff",
        {
          p_profile_id: userId,
          p_facility_id:
            fasilitasNakesData.metodeFaskes === "undangan"
              ? null
              : fasilitasNakesData.facilityId || null,
          p_staff_role: sRole,
          p_profession: fasilitasNakesData.profesi,
          p_str_number: fasilitasNakesData.noStr,
          p_sip_number: fasilitasNakesData.sipNomor || null,
          p_specialization: fasilitasNakesData.spesialisasi || null,
          p_specialization_names: specList,
          p_invitation_code:
            fasilitasNakesData.metodeFaskes === "undangan" && fasilitasNakesData.kodeUndangan
              ? fasilitasNakesData.kodeUndangan.trim()
              : null,
        }
      );

      if (regStaffError || !regStaffResult || !(regStaffResult as { success?: boolean }).success) {
        const errorMsg =
          regStaffError?.message ||
          ((regStaffResult as { message?: string })?.message || "Gagal mendaftarkan penempatan tenaga kesehatan");
        return {
          success: false,
          error: errorMsg,
        };
      }
    } else if (peran === "verifikator" && verifikatorData) {
      let vLevel: "kelurahan" | "kecamatan" | "dinas_sosial" = "kelurahan";
      const sp = String(subperan).toLowerCase();
      if (sp === "kecamatan") {
        vLevel = "kecamatan";
      } else if (sp === "dinas-sosial" || sp === "dinas_sosial") {
        vLevel = "dinas_sosial";
      } else {
        vLevel = "kelurahan";
      }

      const { error: verifierError } = await supabase
        .from("verifier_profiles")
        .insert({
          id: userId,
          level: vLevel,
          province: verifikatorData.provinsi,
          city: verifikatorData.kota,
          district: verifikatorData.kecamatan?.trim() || null,
          village: verifikatorData.kelurahan?.trim() || null,
          unit: null,
          nip: verifikatorData.nip,
          jabatan: verifikatorData.jabatan,
          status: "menunggu",
        });

      if (verifierError) {
        return {
          success: false,
          error: "Gagal menyimpan data profil verifikator: " + verifierError.message,
        };
      }
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: "Terjadi kesalahan jaringan atau sistem: " + msg,
    };
  }
}
