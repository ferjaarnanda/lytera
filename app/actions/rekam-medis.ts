"use server";

import { createClient } from "@/lib/supabase/server";

// ============================================================================
// TIPE DATA TOKEN IZIN PASIEN
// ============================================================================

export interface TokenStatus {
  has_active_token: boolean;
  is_locked: boolean;
  is_revoked: boolean;
  is_expired: boolean;
  expires_at: string | null;
  seconds_remaining: number | null;
  failed_attempts: number | null;
}

export interface TokenStatusResponse {
  success: boolean;
  status?: TokenStatus;
  error?: string;
}

export interface CreateTokenResponse {
  success: boolean;
  /** Kode 6-digit mentah — hanya dikembalikan SEKALI. Jangan simpan di DB atau log. */
  token_code?: string;
  expires_at?: string;
  error?: string;
}

export interface RevokeTokenResponse {
  success: boolean;
  error?: string;
}

// ============================================================================
// TIPE DATA REKAM MEDIS
// ============================================================================

export interface MedicalRecordItem {
  id: string;
  patient_id: string;
  family_member_id: string | null;
  facility_id: string | null;
  facility_name: string | null;
  doctor_name: string | null;
  visit_date: string | null;
  diagnosis_icd10: string | null;
  ringkasan: string | null;
  referral_id: string | null;
  created_at: string;
  subject_name: string | null;
}

export interface MedicalRecordsResponse {
  success: boolean;
  records?: MedicalRecordItem[];
  error?: string;
}

// ============================================================================
// TIPE DATA LOG AKSES REKAM MEDIS
// ============================================================================

export interface AccessAuditLogItem {
  id: string;
  accessed_by: string;
  accessor_name: string | null;
  facility_id: string | null;
  facility_name: string | null;
  patient_id: string;
  family_member_id: string | null;
  subject_name: string | null;
  access_result: string;
  notes: string | null;
  created_at: string;
}

export interface AccessAuditLogsResponse {
  success: boolean;
  logs?: AccessAuditLogItem[];
  error?: string;
}

// ============================================================================
// SERVER ACTION: BUAT TOKEN IZIN AKSES (create_patient_access_token)
// ============================================================================

export async function createPatientAccessTokenAction(): Promise<CreateTokenResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Sesi login tidak ditemukan. Silakan masuk kembali." };
    }

    const { data, error } = await supabase.rpc("create_patient_access_token");

    if (error) {
      const msg = error.message || "";
      if (msg.includes("pasien aktif")) {
        return { success: false, error: "Akun Anda tidak terdaftar sebagai pasien aktif." };
      }
      return { success: false, error: "Gagal membuat kode izin: " + msg };
    }

    // Fungsi mengembalikan satu baris: {token_code, expires_at}
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || !row.token_code) {
      return { success: false, error: "Kode izin tidak diterima dari server." };
    }

    return {
      success: true,
      token_code: String(row.token_code),
      expires_at: row.expires_at ?? null,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: "Terjadi kesalahan: " + msg };
  }
}

// ============================================================================
// SERVER ACTION: STATUS TOKEN AKTIF (get_my_active_token_status)
// ============================================================================

export async function getMyActiveTokenStatusAction(): Promise<TokenStatusResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Sesi login tidak ditemukan." };
    }

    const { data, error } = await supabase.rpc("get_my_active_token_status");

    if (error) {
      return { success: false, error: "Gagal memeriksa status token: " + error.message };
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row || (!row.has_active_token && !row.expires_at && !row.is_locked)) {
      // Belum pernah membuat token
      return {
        success: true,
        status: {
          has_active_token: false,
          is_locked: false,
          is_revoked: false,
          is_expired: false,
          expires_at: null,
          seconds_remaining: null,
          failed_attempts: null,
        },
      };
    }

    const isLocked = Boolean(row.is_locked);
    const hasActive = Boolean(row.has_active_token) && !isLocked;
    const isRevoked = !hasActive && !isLocked && row.seconds_remaining === -1;
    const isExpired = !hasActive && !isLocked && row.seconds_remaining === 0 && Boolean(row.expires_at);

    return {
      success: true,
      status: {
        has_active_token: hasActive,
        is_locked: isLocked,
        is_revoked: isRevoked,
        is_expired: isExpired,
        expires_at: row.expires_at ?? null,
        seconds_remaining:
          row.seconds_remaining != null && row.seconds_remaining >= 0
            ? row.seconds_remaining
            : null,
        failed_attempts: row.failed_attempts ?? null,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: "Terjadi kesalahan: " + msg };
  }
}

// ============================================================================
// SERVER ACTION: CABUT TOKEN (revoke_patient_access_token)
// ============================================================================

export async function revokePatientAccessTokenAction(): Promise<RevokeTokenResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Sesi login tidak ditemukan." };
    }

    const { error } = await supabase.rpc("revoke_patient_access_token");

    if (error) {
      const msg = error.message || "";
      if (msg.includes("tidak ada token")) {
        return { success: false, error: "Tidak ada token aktif yang bisa dicabut." };
      }
      return { success: false, error: "Gagal mencabut token: " + msg };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: "Terjadi kesalahan: " + msg };
  }
}

// ============================================================================
// SERVER ACTION: DAFTAR REKAM MEDIS SAYA (list_my_medical_records)
// ============================================================================

export async function listMyMedicalRecordsAction(): Promise<MedicalRecordsResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Sesi login tidak ditemukan." };
    }

    const { data, error } = await supabase.rpc("list_my_medical_records");

    if (error) {
      return { success: false, error: "Gagal memuat riwayat medis: " + error.message };
    }

    return { success: true, records: (data ?? []) as MedicalRecordItem[] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: "Terjadi kesalahan: " + msg };
  }
}

// ============================================================================
// SERVER ACTION: LOG AUDIT AKSES REKAM MEDIS (list_my_access_audit_logs)
// ============================================================================

export async function listMyAccessAuditLogsAction(): Promise<AccessAuditLogsResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Sesi login tidak ditemukan." };
    }

    const { data, error } = await supabase.rpc("list_my_access_audit_logs");

    if (error) {
      return { success: false, error: "Gagal memuat log akses: " + error.message };
    }

    return { success: true, logs: (data ?? []) as AccessAuditLogItem[] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: "Terjadi kesalahan: " + msg };
  }
}
