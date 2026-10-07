"use server";

import { createClient } from "@/lib/supabase/server";

// ============================================================================
// TIPE DATA VERIFIKASI ADMINISTRASI (Tahap 5)
// ============================================================================

export interface VerificationQueueItem {
  id: string;
  patient_id: string;
  family_member_id: string | null;
  subject_name: string;
  nik_masked: string | null;
  type: "domisili" | "kurang_mampu";
  status: "menunggu" | "disetujui" | "ditolak";
  document_paths: string[];
  patient_note: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  valid_until: string | null;
  province: string | null;
  city: string | null;
  district: string | null;
  village: string | null;
  created_at: string;
}

export interface VerificationQueueResponse {
  success: boolean;
  data?: VerificationQueueItem[];
  error?: string;
}

export interface ReviewVerificationResponse {
  success: boolean;
  error?: string;
}

export interface PendingVerifierItem {
  id: string;
  full_name: string;
  email: string;
  nip: string | null;
  jabatan: string | null;
  level: string;
  unit: string | null;
  province: string | null;
  city: string | null;
  district: string | null;
  village: string | null;
  created_at: string;
}

export interface PendingVerifiersResponse {
  success: boolean;
  data?: PendingVerifierItem[];
  error?: string;
}

// ============================================================================
// SERVER ACTION: ANTREAN VERIFIKASI (list_verification_queue)
// ============================================================================

export async function listVerificationQueueAction(
  status: string = "menunggu"
): Promise<VerificationQueueResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Sesi login tidak ditemukan." };
    }

    const { data, error } = await supabase.rpc("list_verification_queue", {
      p_status: status,
    });

    if (error) {
      return { success: false, error: "Gagal memuat antrean verifikasi: " + error.message };
    }

    return {
      success: true,
      data: Array.isArray(data) ? (data as VerificationQueueItem[]) : [],
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: "Terjadi kesalahan: " + msg };
  }
}

// ============================================================================
// SERVER ACTION: TINJAU VERIFIKASI (review_verification)
// ============================================================================

export async function reviewVerificationAction(params: {
  id: string;
  decision: "disetujui" | "ditolak";
  note?: string;
  validUntil?: string;
}): Promise<ReviewVerificationResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Sesi login tidak ditemukan." };
    }

    if (params.decision === "ditolak" && (!params.note || !params.note.trim())) {
      return { success: false, error: "Alasan penolakan wajib disertakan." };
    }

    const { error } = await supabase.rpc("review_verification", {
      p_id: params.id,
      p_decision: params.decision,
      p_note: params.note ? params.note.trim() : null,
      p_valid_until: params.validUntil ? params.validUntil : null,
    });

    if (error) {
      return { success: false, error: "Gagal memproses verifikasi: " + error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: "Terjadi kesalahan: " + msg };
  }
}

// ============================================================================
// SERVER ACTION: BUAT SIGNED URL DOKUMEN VERIFIKASI
// ============================================================================

export async function getVerificationDocumentSignedUrlAction(
  filePath: string
): Promise<{ success: boolean; signedUrl?: string; error?: string }> {
  try {
    const cleanPath = (filePath || "").trim();
    if (!cleanPath) {
      return { success: false, error: "Path dokumen tidak valid." };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Sesi login tidak ditemukan." };
    }

    // Buat signed URL berlaku 10 menit (600 detik)
    const { data, error } = await supabase.storage
      .from("verification-documents")
      .createSignedUrl(cleanPath, 600);

    if (error) {
      return { success: false, error: "Gagal membuka berkas: " + error.message };
    }

    return { success: true, signedUrl: data.signedUrl };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: "Terjadi kesalahan: " + msg };
  }
}

// ============================================================================
// SERVER ACTION: DINKES - ANTREAN PERSETUJUAN VERIFIKATOR (list_pending_verifiers)
// ============================================================================

export async function listPendingVerifiersAction(): Promise<PendingVerifiersResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Sesi login tidak ditemukan." };
    }

    const { data, error } = await supabase.rpc("list_pending_verifiers");

    if (error) {
      return { success: false, error: "Gagal memuat permohonan verifikator: " + error.message };
    }

    return {
      success: true,
      data: Array.isArray(data) ? (data as PendingVerifierItem[]) : [],
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: "Terjadi kesalahan: " + msg };
  }
}

// ============================================================================
// SERVER ACTION: DINKES - TINJAU AKUN VERIFIKATOR (review_verifier)
// ============================================================================

export async function reviewVerifierAction(params: {
  id: string;
  decision: "aktif" | "ditolak";
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Sesi login tidak ditemukan." };
    }

    const { error } = await supabase.rpc("review_verifier", {
      p_id: params.id,
      p_decision: params.decision,
    });

    if (error) {
      return { success: false, error: "Gagal meninjau verifikator: " + error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: "Terjadi kesalahan: " + msg };
  }
}
