"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// ============================================================================
// TIPE DATA PENCARIAN PASIEN (hasil rpc find_patient_by_nik)
// ============================================================================

export interface PatientSearchResult {
  patient_id: string;
  family_member_id: string | null;
  full_name: string;
  nik_masked: string;
  dob: string | null;
  gender: string | null;
  relation: string | null;
  city: string | null;
  district: string | null;
}

export interface PatientSearchResponse {
  success: boolean;
  results?: PatientSearchResult[];
  error?: string;
}

// ============================================================================
// SERVER ACTION: CARI PASIEN VIA find_patient_by_nik
// ============================================================================

export async function cariPasienAction(nik: string): Promise<PatientSearchResponse> {
  const cleanNik = nik.trim();

  if (!cleanNik || cleanNik.length !== 16 || !/^\d{16}$/.test(cleanNik)) {
    return { success: false, error: "NIK harus berupa 16 digit angka." };
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Sesi login tidak ditemukan. Silakan masuk kembali." };
    }

    const { data, error } = await supabase.rpc("find_patient_by_nik", { p_nik: cleanNik });

    if (error) {
      // Petakan pesan galat database ke bahasa Indonesia
      const msg = error.message || "";
      if (msg.includes("bukan dokter aktif") || msg.includes("not an active doctor") || msg.includes("Hanya dokter aktif")) {
        return { success: false, error: "Hanya dokter aktif di fasilitas aktif yang berwenang mencari pasien." };
      }
      if (msg.includes("16 digit") || msg.includes("invalid NIK")) {
        return { success: false, error: "NIK harus terdiri dari tepat 16 digit angka." };
      }
      if (msg.includes("terlalu banyak") || msg.includes("rate limit") || msg.includes("too many")) {
        return { success: false, error: "Terlalu banyak pencarian. Coba lagi beberapa menit kemudian." };
      }
      return { success: false, error: error.message };
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      return { success: false, error: "Pasien tidak ditemukan atau akunnya belum aktif." };
    }

    const results = Array.isArray(data) ? data : [data];
    return { success: true, results: results as PatientSearchResult[] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: "Terjadi kesalahan saat mencari pasien: " + msg };
  }
}

// ============================================================================
// TIPE DATA PENCARIAN RUMAH SAKIT (hasil rpc list_active_facilities)
// ============================================================================

export interface FasilitasOption {
  id: string;
  name: string;
  type: string;
  city: string | null;
  district: string | null;
}

export interface CariFaskesResponse {
  success: boolean;
  results?: FasilitasOption[];
  error?: string;
}

// ============================================================================
// SERVER ACTION: CARI RUMAH SAKIT TUJUAN VIA list_active_facilities
// ============================================================================

export async function cariFaskesAction(
  query: string,
  limit = 20
): Promise<CariFaskesResponse> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("list_active_facilities", {
      p_type: "rumah_sakit",
      p_query: query.trim(),
      p_limit: limit,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const results = Array.isArray(data) ? data : [];
    return { success: true, results: results as FasilitasOption[] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: "Gagal memuat daftar rumah sakit: " + msg };
  }
}

// ============================================================================
// TIPE DATA DOKTER TUJUAN (hasil rpc list_active_doctors)
// ============================================================================

export interface DokterOption {
  staff_id: string;
  full_name: string;
  specialization: string | null;
}

export interface ListDokterResponse {
  success: boolean;
  results?: DokterOption[];
  error?: string;
}

// ============================================================================
// SERVER ACTION: DAFTAR DOKTER AKTIF DI RS TUJUAN
// ============================================================================

export async function listDokterAction(facilityId: string): Promise<ListDokterResponse> {
  if (!facilityId) {
    return { success: true, results: [] };
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("list_active_doctors", {
      p_facility_id: facilityId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const results = Array.isArray(data) ? data : [];
    return { success: true, results: results as DokterOption[] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: "Gagal memuat daftar dokter: " + msg };
  }
}

// ============================================================================
// SKEMA VALIDASI ZOD DI SISI SERVER
// ============================================================================

const BuatRujukanSchema = z.object({
  patientId: z.string().uuid("ID Pasien tidak valid"),
  familyMemberId: z.string().uuid().nullable().optional(),
  destinationFacilityId: z.string().uuid("Fasilitas kesehatan tujuan wajib dipilih"),
  destinationDoctorId: z.string().uuid().nullable().optional(),
  poli: z.string().min(2, "Poli spesialis tujuan wajib diisi"),
  priority: z.enum(["elektif", "urgent", "gawat_darurat"], {
    message: "Prioritas rujukan wajib dipilih",
  }),
  diagnosisIcd10: z.string().min(2, "Diagnosis ICD-10 wajib diisi"),
  catatanKlinis: z.string().min(5, "Catatan klinis dan riwayat awal minimal 5 karakter"),
});

export type BuatRujukanInput = z.infer<typeof BuatRujukanSchema>;

export interface BuatRujukanResult {
  success: boolean;
  referralId?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
}

// ============================================================================
// SERVER ACTION: BUAT RUJUKAN DIGITAL & CATAT REFERRAL EVENT
// ============================================================================

export async function buatRujukanAction(payload: unknown): Promise<BuatRujukanResult> {
  if (!payload || typeof payload !== "object") {
    return { success: false, error: "Data formulir rujukan tidak valid" };
  }

  // 1. Validasi Zod di sisi server
  const parsed = BuatRujukanSchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.issues.forEach((issue) => {
      const key = issue.path[0];
      if (key) fieldErrors[String(key)] = issue.message;
    });
    return {
      success: false,
      error: "Mohon lengkapi dan periksa kembali data formulir rujukan",
      fieldErrors,
    };
  }

  const data = parsed.data;

  try {
    const supabase = await createClient();

    // 2. Verifikasi sesi pengguna aktif
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: "Sesi login tidak ditemukan atau telah kedaluwarsa. Silakan masuk kembali.",
      };
    }

    // 3. Verifikasi staf faskes: harus dokter, status aktif, dan punya facility_id
    const { data: staff, error: staffError } = await supabase
      .from("facility_staff")
      .select("id, profile_id, facility_id, staff_role, status")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (staffError) {
      return {
        success: false,
        error: "Gagal memverifikasi status staf fasilitas: " + staffError.message,
      };
    }

    if (!staff || !staff.facility_id) {
      return {
        success: false,
        error: "Akun Anda belum terdaftar atau belum terhubung ke fasilitas kesehatan mana pun.",
      };
    }

    if (staff.staff_role !== "dokter") {
      return {
        success: false,
        error: `Hak akses terbatas: Hanya staf dengan peran dokter yang berwenang membuat rujukan. Peran akun Anda: '${staff.staff_role}'.`,
      };
    }

    if (staff.status !== "aktif") {
      return {
        success: false,
        error: `Akun staf Anda saat ini berstatus '${staff.status}'. Hanya dokter dengan status aktif yang berwenang menerbitkan rujukan.`,
      };
    }

    // 4. Verifikasi status fasilitas kesehatan asal harus aktif
    const { data: originFacility, error: originFacError } = await supabase
      .from("facilities")
      .select("id, name, status")
      .eq("id", staff.facility_id)
      .maybeSingle();

    if (originFacError || !originFacility) {
      return {
        success: false,
        error: "Fasilitas kesehatan asal tidak ditemukan pada basis data sistem Lytera.",
      };
    }

    if (originFacility.status !== "aktif") {
      return {
        success: false,
        error: `Fasilitas kesehatan asal (${originFacility.name}) saat ini berstatus '${originFacility.status}'. Surat rujukan hanya dapat diterbitkan dari fasilitas kesehatan yang berstatus aktif.`,
      };
    }

    // 5. Insert baris baru ke tabel 'referrals'
    //    Database guard (trg_guard_referrals) akan memaksa status='diajukan'
    //    dan memvalidasi destination_facility_id harus rumah_sakit aktif.
    const { data: referral, error: referralError } = await supabase
      .from("referrals")
      .insert({
        patient_id: data.patientId,
        family_member_id: data.familyMemberId || null,
        origin_facility_id: staff.facility_id,
        destination_facility_id: data.destinationFacilityId,
        destination_doctor_id: data.destinationDoctorId || null,
        poli: data.poli.trim(),
        priority: data.priority,
        status: "diajukan",
        diagnosis_icd10: data.diagnosisIcd10.trim(),
        catatan_klinis: data.catatanKlinis.trim(),
        created_by: user.id,
      })
      .select("id")
      .single();

    if (referralError || !referral) {
      return {
        success: false,
        error:
          "Gagal menyimpan data rujukan: " +
          (referralError?.message || "Kesalahan database"),
      };
    }

    // 6. Insert riwayat ke 'referral_events'
    const { error: eventError } = await supabase.from("referral_events").insert({
      referral_id: referral.id,
      status: "diajukan",
      catatan: "Rujukan dibuat",
      created_by: user.id,
    });

    if (eventError) {
      // Tidak membatalkan — rujukan sudah tersimpan
      console.error("Peringatan: Gagal mencatat referral_event:", eventError.message);
    }

    return {
      success: true,
      referralId: referral.id,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: "Terjadi kesalahan sistem saat membuat rujukan: " + msg,
    };
  }
}

// ============================================================================
// TIPE & ACTION: TIMELINE REFERRAL EVENTS
// ============================================================================

export interface ReferralEventItem {
  id: string;
  status: string;
  catatan: string;
  created_at: string;
  actor_name: string | null;
}

export async function listReferralEventsAction(referralId: string): Promise<{
  success: boolean;
  events?: ReferralEventItem[];
  error?: string;
}> {
  if (!referralId) return { success: true, events: [] };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("list_referral_events", {
      p_referral_id: referralId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, events: (data as ReferralEventItem[]) || [] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: "Gagal memuat riwayat rujukan: " + msg };
  }
}

// ============================================================================
// SERVER ACTION: PROSES STATUS RUJUKAN OLEH RUMAH SAKIT
// ============================================================================

const ProsesRujukanSchema = z
  .object({
    referralId: z.string().uuid("ID Rujukan tidak valid"),
    action: z.enum(["terima", "tolak", "jadwalkan", "selesai"]),
    catatan: z.string().optional(),
    jadwalPemeriksaan: z.string().optional(),
    destinationDoctorId: z.string().uuid().nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.action === "tolak" && (!data.catatan || data.catatan.trim().length === 0)) {
        return false;
      }
      return true;
    },
    {
      message: "Alasan penolakan rujukan wajib diisi",
      path: ["catatan"],
    }
  )
  .refine(
    (data) => {
      if (data.action === "jadwalkan" && (!data.jadwalPemeriksaan || data.jadwalPemeriksaan.trim().length === 0)) {
        return false;
      }
      return true;
    },
    {
      message: "Tanggal dan jam jadwal pemeriksaan wajib diisi",
      path: ["jadwalPemeriksaan"],
    }
  );

export interface ProsesRujukanResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function prosesRujukanAction(payload: unknown): Promise<ProsesRujukanResult> {
  if (!payload || typeof payload !== "object") {
    return { success: false, error: "Data tindakan rujukan tidak valid" };
  }

  const parsed = ProsesRujukanSchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.issues.forEach((issue) => {
      const key = issue.path[0];
      if (key) fieldErrors[String(key)] = issue.message;
    });
    return {
      success: false,
      error: fieldErrors.catatan || fieldErrors.jadwalPemeriksaan || "Data tindakan tidak valid",
      fieldErrors,
    };
  }

  const { referralId, action, catatan, jadwalPemeriksaan, destinationDoctorId } = parsed.data;

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "Sesi login kedaluwarsa. Silakan masuk kembali." };
    }

    let targetStatus: "diterima" | "ditolak" | "dijadwalkan" | "selesai";
    let defaultCatatan = "";

    if (action === "terima") {
      targetStatus = "diterima";
      defaultCatatan = catatan?.trim() || "Rujukan diterima oleh rumah sakit";
    } else if (action === "tolak") {
      targetStatus = "ditolak";
      defaultCatatan = catatan!.trim();
    } else if (action === "jadwalkan") {
      targetStatus = "dijadwalkan";
      defaultCatatan = catatan?.trim() || `Pemeriksaan dijadwalkan pada ${jadwalPemeriksaan}`;
    } else {
      targetStatus = "selesai";
      defaultCatatan = catatan?.trim() || "Pemeriksaan dan tindakan spesialis selesai";
    }

    // Siapkan update rujukan
    const updatePayload: Record<string, unknown> = { status: targetStatus };
    if (action === "jadwalkan") {
      updatePayload.jadwal_pemeriksaan = jadwalPemeriksaan;
      if (destinationDoctorId !== undefined) {
        updatePayload.destination_doctor_id = destinationDoctorId;
      }
    }

    const { error: updateError } = await supabase
      .from("referrals")
      .update(updatePayload)
      .eq("id", referralId);

    if (updateError) {
      return {
        success: false,
        error: "Gagal memperbarui status rujukan: " + updateError.message,
      };
    }

    // Catat riwayat event
    const { error: eventError } = await supabase.from("referral_events").insert({
      referral_id: referralId,
      status: targetStatus,
      catatan: defaultCatatan,
      created_by: user.id,
    });

    if (eventError) {
      console.error("Gagal mencatat referral_event:", eventError.message);
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: "Terjadi kesalahan sistem: " + msg };
  }
}

// ============================================================================
// TIPE & ACTION: RUJUKAN SAYA (PASIEN)
// ============================================================================

export interface MyReferralItem {
  id: string;
  status: string;
  priority: string;
  poli: string;
  diagnosis_icd10: string;
  jadwal_pemeriksaan: string | null;
  created_at: string;
  origin_name: string;
  destination_name: string;
  destination_doctor: string | null;
  subject_name: string;   // nama pasien atau anggota keluarga
  is_family: boolean;
}

export async function listMyReferralsAction(): Promise<{
  success: boolean;
  referrals?: MyReferralItem[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return { success: false, error: "Sesi login tidak ditemukan." };
    }

    const { data, error } = await supabase.rpc("list_my_referrals");
    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, referrals: (data as MyReferralItem[]) || [] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: "Gagal memuat rujukan: " + msg };
  }
}

// ============================================================================
// TIPE & ACTION: LOG PENCARIAN (PASIEN — siapa yang mencari data saya)
// ============================================================================

export interface LookupLogItem {
  created_at: string;
  doctor_name: string;
  facility_name: string;
  subject_name: string;  // pasien atau anggota keluarga yang dicari
  purpose: string | null;
}

export async function listMyLookupLogsAction(): Promise<{
  success: boolean;
  logs?: LookupLogItem[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return { success: false, error: "Sesi login tidak ditemukan." };
    }

    const { data, error } = await supabase.rpc("list_my_lookup_logs");
    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, logs: (data as LookupLogItem[]) || [] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: "Gagal memuat log pencarian: " + msg };
  }
}
