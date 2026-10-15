"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// ============================================================================
// SKEMA VALIDASI ZOD UNTUK VERIFIKASI FASILITAS KESEHATAN OLEH DINKES
// ============================================================================

const VerifikasiFasilitasSchema = z
  .object({
    facilityId: z.string().uuid("ID Fasilitas tidak valid"),
    decision: z.enum(["disetujui", "ditolak"], {
      message: "Keputusan harus 'disetujui' atau 'ditolak'",
    }),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.decision === "ditolak") {
        return !!data.notes && data.notes.trim().length > 0;
      }
      return true;
    },
    {
      message: "Alasan penolakan wajib diisi",
      path: ["notes"],
    }
  );

export type VerifikasiFasilitasInput = z.infer<typeof VerifikasiFasilitasSchema>;

export interface VerifikasiFasilitasResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

// ============================================================================
// SERVER ACTION: VERIFIKASI PENDAFTARAN FASILITAS KESEHATAN
// ============================================================================

export async function verifikasiFasilitasAction(
  payload: unknown
): Promise<VerifikasiFasilitasResult> {
  if (!payload || typeof payload !== "object") {
    return { success: false, error: "Data verifikasi tidak valid" };
  }

  // 1. Validasi Zod
  const parsed = VerifikasiFasilitasSchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.issues.forEach((issue) => {
      const key = issue.path[0];
      if (key) fieldErrors[String(key)] = issue.message;
    });
    return {
      success: false,
      error: fieldErrors.notes || "Data verifikasi tidak valid",
      fieldErrors,
    };
  }

  const { facilityId, decision, notes } = parsed.data;

  try {
    const supabase = await createClient();

    // 2. Verifikasi Sesi Pengguna Aktif
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

    // 3. Verifikasi Peran 'dinkes'
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, status")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return {
        success: false,
        error: "Gagal memverifikasi profil akun: " + profileError.message,
      };
    }

    if (!profile || profile.role !== "dinkes") {
      return {
        success: false,
        error: "Akses ditolak: Hanya akun Dinas Kesehatan yang berwenang melakukan verifikasi fasilitas kesehatan.",
      };
    }

    // 4. Eksekusi RPC transaksional: verifikasi faskes, sinkronisasi profil admin, dan catat registration_reviews
    const reviewNotes =
      decision === "ditolak"
        ? notes!.trim()
        : notes?.trim() || "Pendaftaran fasilitas kesehatan disetujui oleh Dinas Kesehatan";

    const { error: rpcError } = await supabase.rpc(
      "verify_facility_registration",
      {
        p_facility_id: facilityId,
        p_decision: decision,
        p_notes: reviewNotes,
      }
    );

    if (rpcError) {
      return {
        success: false,
        error: "Gagal memproses verifikasi fasilitas kesehatan: " + rpcError.message,
      };
    }

    return {
      success: true,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: "Terjadi kesalahan sistem saat memproses verifikasi: " + msg,
    };
  }
}

// ============================================================================
// SERVER ACTION: MEMBUAT SIGNED URL UNTUK MELIHAT BERKAS IZIN OPERASIONAL
// ============================================================================

export interface SignedUrlResult {
  success: boolean;
  signedUrl?: string;
  error?: string;
}

export async function getFacilityDocumentSignedUrlAction(
  filePath: string
): Promise<SignedUrlResult> {
  if (!filePath || typeof filePath !== "string" || filePath.trim() === "") {
    return { success: false, error: "Lokasi berkas dokumen tidak valid" };
  }

  try {
    const supabase = await createClient();

    // 1. Verifikasi sesi pengguna
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

    // 2. Verifikasi peran Dinkes
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return {
        success: false,
        error: "Gagal memverifikasi profil akun.",
      };
    }

    if (profile.role !== "dinkes") {
      return {
        success: false,
        error: "Akses ditolak: Hanya akun Dinas Kesehatan yang berwenang melihat berkas izin operasional faskes.",
      };
    }

    // 3. Buat signed URL berdurasi 60 detik dari bucket privat 'facility-documents'
    const { data, error: storageError } = await supabase.storage
      .from("facility-documents")
      .createSignedUrl(filePath.trim(), 60);

    if (storageError || !data?.signedUrl) {
      return {
        success: false,
        error:
          "Gagal mengakses berkas izin: " +
          (storageError?.message || "Berkas tidak ditemukan pada penyimpanan."),
      };
    }

    return {
      success: true,
      signedUrl: data.signedUrl,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: "Terjadi kendala sistem saat membuka dokumen: " + msg,
    };
  }
}

