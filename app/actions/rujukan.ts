"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// ============================================================================
// SKEMA VALIDASI ZOD DI SISI SERVER
// ============================================================================

const BuatRujukanSchema = z.object({
  patientId: z.string().uuid("ID Pasien tidak valid"),
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

    // 3. Verifikasi staf faskes: harus dokter atau petugas, status aktif, dan punya facility_id
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

    if (staff.status !== "aktif") {
      return {
        success: false,
        error: `Akun staf Anda saat ini berstatus '${staff.status}'. Hanya staf aktif yang dapat membuat rujukan.`,
      };
    }

    if (staff.staff_role !== "dokter" && staff.staff_role !== "petugas") {
      return {
        success: false,
        error: "Hanya tenaga medis (dokter) atau petugas faskes yang berwenang membuat rujukan.",
      };
    }

    // 4. Verifikasi bahwa pasien terdaftar di tabel patients
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("id")
      .eq("id", data.patientId)
      .maybeSingle();

    if (patientError || !patient) {
      return {
        success: false,
        error: "Pasien tujuan tidak ditemukan pada basis data sistem Lytera.",
      };
    }

    // 5. Insert baris baru ke tabel 'referrals'
    const { data: referral, error: referralError } = await supabase
      .from("referrals")
      .insert({
        patient_id: data.patientId,
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
        error: "Gagal menyimpan data rujukan ke Supabase: " + (referralError?.message || "Kesalahan database"),
      };
    }

    // 6. Insert baris pencatatan riwayat ke 'referral_events'
    const { error: eventError } = await supabase.from("referral_events").insert({
      referral_id: referral.id,
      status: "diajukan",
      catatan: "Rujukan dibuat",
      created_by: user.id,
    });

    if (eventError) {
      console.error("Peringatan: Gagal mencatat referral_event:", eventError.message);
      // Rujukan utama sudah tersimpan, tidak membatalkan proses keseluruhan
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
