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

// ============================================================================
// TIPE & ACTION PASIEN: VERIFIKASI & PENJAMIN BIAYA (Tahap 5b)
// ============================================================================

export interface MyVerificationItem {
  id: string;
  type: "domisili" | "kurang_mampu";
  status: "menunggu" | "disetujui" | "ditolak";
  document_paths: string[];
  patient_note: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  valid_until: string | null;
  subject_name: string;
  is_family: boolean;
  created_at: string;
}

export interface MyVerificationsResponse {
  success: boolean;
  data?: MyVerificationItem[];
  error?: string;
}

export interface PayerSubjectInfo {
  id: string;
  full_name: string;
  relation?: string;
  is_family: boolean;
  payer_type: "bpjs" | "asuransi" | "mandiri" | "jaminan_daerah";
  bpjs_number: string | null;
  insurance_name: string | null;
  insurance_policy_number: string | null;
}

export interface MyPayerStatusResponse {
  success: boolean;
  subjects?: PayerSubjectInfo[];
  error?: string;
}

// ── 1. Mengambil riwayat pengajuan verifikasi pasien ──
export async function listMyVerificationsAction(): Promise<MyVerificationsResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Sesi login tidak ditemukan." };
    }

    const { data, error } = await supabase.rpc("list_my_verifications");

    if (error) {
      return {
        success: false,
        error: "Gagal memuat daftar verifikasi: " + error.message,
      };
    }

    return {
      success: true,
      data: Array.isArray(data) ? (data as MyVerificationItem[]) : [],
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: "Terjadi kesalahan: " + msg };
  }
}

// ── 2. Mengajukan verifikasi domisili / SKTM beserta unggah berkas ──
export async function submitVerificationAction(
  formData: FormData
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Sesi login tidak ditemukan." };
    }

    const type = formData.get("type") as string;
    const familyMemberId = (formData.get("familyMemberId") as string) || null;
    const patientNote = (formData.get("patientNote") as string) || null;
    const file = formData.get("file") as File | null;

    if (!type || (type !== "domisili" && type !== "kurang_mampu")) {
      return {
        success: false,
        error: "Pilih jenis verifikasi yang sah (domisili atau kurang mampu).",
      };
    }

    if (!file || file.size === 0) {
      return {
        success: false,
        error: "Wajib melampirkan berkas bukti dokumen pendukung.",
      };
    }

    // Validasi batas ukuran berkas 5 MB
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return {
        success: false,
        error: "Ukuran berkas melebihi batas maksimal 5 MB.",
      };
    }

    // Validasi tipe MIME yang diizinkan
    const allowedMime = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowedMime.includes(file.type)) {
      return {
        success: false,
        error: "Format berkas tidak didukung. Harap unggah format JPG, PNG, atau PDF.",
      };
    }

    // Bersihkan nama berkas dan tentukan storage path
    const sanitizedName = file.name
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .toLowerCase();
    const filePath = `${user.id}/${Date.now()}_${sanitizedName}`;

    // Unggah ke bucket privat 'verification-documents'
    const { error: uploadError } = await supabase.storage
      .from("verification-documents")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      return {
        success: false,
        error: "Gagal mengunggah berkas dokumen: " + uploadError.message,
      };
    }

    // Panggil RPC submit_verification
    const { data: newId, error: rpcError } = await supabase.rpc(
      "submit_verification",
      {
        p_type: type,
        p_family_member_id: familyMemberId,
        p_document_paths: [filePath],
        p_patient_note: patientNote ? patientNote.trim() : null,
      }
    );

    if (rpcError) {
      // Hapus file yang sudah diunggah jika insert RPC gagal
      await supabase.storage.from("verification-documents").remove([filePath]);
      return {
        success: false,
        error: "Gagal mengajukan verifikasi: " + rpcError.message,
      };
    }

    return {
      success: true,
      id: typeof newId === "string" ? newId : undefined,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: "Terjadi kesalahan: " + msg };
  }
}

// ── 3. Mengambil data status penjamin pasien dan anggota keluarga ──
export async function getMyPayerStatusAction(): Promise<MyPayerStatusResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Sesi login tidak ditemukan." };
    }

    // Ambil profil nama pasien
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    // Ambil data penjamin dari pasien utama
    const { data: pat, error: patError } = await supabase
      .from("patients")
      .select("id, payer_type, bpjs_number, insurance_name, insurance_policy_number")
      .eq("id", user.id)
      .single();

    if (patError) {
      return { success: false, error: "Gagal memuat data pasien: " + patError.message };
    }

    const subjects: PayerSubjectInfo[] = [
      {
        id: user.id,
        full_name: profile?.full_name || "Pasien Utama",
        is_family: false,
        payer_type: (pat?.payer_type as PayerSubjectInfo["payer_type"]) || "mandiri",
        bpjs_number: pat?.bpjs_number || null,
        insurance_name: pat?.insurance_name || null,
        insurance_policy_number: pat?.insurance_policy_number || null,
      },
    ];

    // Ambil data anggota keluarga jika ada
    const { data: famMembers } = await supabase
      .from("family_members")
      .select("id, full_name, relation, payer_type, bpjs_number, insurance_name, insurance_policy_number")
      .eq("guardian_id", user.id);

    if (famMembers && famMembers.length > 0) {
      famMembers.forEach((fm) => {
        subjects.push({
          id: fm.id,
          full_name: fm.full_name,
          relation: fm.relation,
          is_family: true,
          payer_type: (fm.payer_type as PayerSubjectInfo["payer_type"]) || "mandiri",
          bpjs_number: fm.bpjs_number || null,
          insurance_name: fm.insurance_name || null,
          insurance_policy_number: fm.insurance_policy_number || null,
        });
      });
    }

    return { success: true, subjects };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: "Terjadi kesalahan: " + msg };
  }
}

// ── 4. Memperbarui penjamin pasien / anggota keluarga ──
export async function updatePatientPayerAction(params: {
  subjectId: string;
  isFamily: boolean;
  payerType: "bpjs" | "asuransi" | "mandiri" | "jaminan_daerah";
  bpjsNumber?: string | null;
  insuranceName?: string | null;
  insurancePolicyNumber?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Sesi login tidak ditemukan." };
    }

    const { subjectId, isFamily, payerType, bpjsNumber, insuranceName, insurancePolicyNumber } = params;

    // Normalisasi isian berdasarkan tipe penjamin
    const cleanBpjs = payerType === "bpjs" ? (bpjsNumber?.trim() || null) : null;
    const cleanInsName = payerType === "asuransi" ? (insuranceName?.trim() || null) : null;
    const cleanInsPolicy = payerType === "asuransi" ? (insurancePolicyNumber?.trim() || null) : null;

    if (payerType === "bpjs" && cleanBpjs && !/^\d{13}$/.test(cleanBpjs)) {
      return { success: false, error: "Nomor kartu BPJS Kesehatan harus terdiri dari 13 digit angka." };
    }

    if (payerType === "asuransi" && (!cleanInsName || !cleanInsPolicy)) {
      return { success: false, error: "Nama perusahaan asuransi dan nomor polis wajib diisi." };
    }

    if (isFamily) {
      const { error } = await supabase
        .from("family_members")
        .update({
          payer_type: payerType,
          bpjs_number: cleanBpjs,
          insurance_name: cleanInsName,
          insurance_policy_number: cleanInsPolicy,
        })
        .eq("id", subjectId)
        .eq("guardian_id", user.id);

      if (error) {
        return { success: false, error: "Gagal memperbarui penjamin anggota keluarga: " + error.message };
      }
    } else {
      const { error } = await supabase
        .from("patients")
        .update({
          payer_type: payerType,
          bpjs_number: cleanBpjs,
          insurance_name: cleanInsName,
          insurance_policy_number: cleanInsPolicy,
        })
        .eq("id", user.id);

      if (error) {
        return { success: false, error: "Gagal memperbarui penjamin pasien: " + error.message };
      }
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: "Terjadi kesalahan: " + msg };
  }
}
