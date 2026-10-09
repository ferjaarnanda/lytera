"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface StaffSpecializationDetail {
  id: string;
  specialization_id: string | null;
  name: string;
  is_verified: boolean;
}

export interface StaffItem {
  id: string;
  profile_id: string;
  facility_id: string;
  staff_role: "dokter" | "petugas" | "apoteker";
  profession: string | null;
  str_number: string | null;
  sip_number: string | null;
  specialization: string | null;
  rejection_reason: string | null;
  status: "menunggu" | "aktif" | "ditolak";
  created_at: string;
  specializations: StaffSpecializationDetail[];
  profiles: {
    id?: string;
    full_name: string | null;
    email: string | null;
  } | null;
}

export interface FacilityAdminInfo {
  id: string;
  name: string;
  type: string;
  status: string;
  city: string | null;
  district: string | null;
}

export interface GetStaffResult {
  success: boolean;
  facility?: FacilityAdminInfo;
  staff?: StaffItem[];
  error?: string;
}

export interface UpdateStaffResult {
  success: boolean;
  error?: string;
  message?: string;
}

export interface ReviewStaffInput {
  staffId: string;
  decision: "aktif" | "ditolak";
  staffRole?: "dokter" | "petugas" | "apoteker";
  verifiedSpecIds?: string[];
  rejectionReason?: string;
}

/**
 * Mengambil data fasilitas milik admin faskes yang sedang login beserta daftar stafnya dan rincian spesialisasi.
 */
export async function getAdminFacilityStaffAction(): Promise<GetStaffResult> {
  try {
    const supabase = await createClient();

    // 1. Cek sesi login
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

    // 2. Ambil profil user untuk mengecek peran
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, sub_role, full_name")
      .eq("id", user.id)
      .maybeSingle();

    // 3. Cari fasilitas yang di-admin oleh user ini
    const { data: facility, error: facError } = await supabase
      .from("facilities")
      .select("id, name, type, status, city, district")
      .eq("admin_id", user.id)
      .maybeSingle();

    if (facError) {
      return {
        success: false,
        error: "Gagal memuat data fasilitas: " + facError.message,
      };
    }

    if (!facility) {
      if (profile?.role === "dinkes") {
        return {
          success: false,
          error: "Akun Dinas Kesehatan mengelola verifikasi fasilitas melalui menu Verifikasi Faskes Dinkes.",
        };
      }
      return {
        success: false,
        error: "Akun Anda belum terdaftar sebagai administrator fasilitas kesehatan manapun.",
      };
    }

    // 4. Ambil staf milik fasilitas ini dengan join profiles
    const { data: staffList, error: staffError } = await supabase
      .from("facility_staff")
      .select(`
        id,
        profile_id,
        facility_id,
        staff_role,
        profession,
        str_number,
        sip_number,
        specialization,
        rejection_reason,
        status,
        created_at,
        profiles(id, full_name, email)
      `)
      .eq("facility_id", facility.id)
      .order("created_at", { ascending: false });

    if (staffError) {
      return {
        success: false,
        facility,
        error: "Gagal memuat daftar staf: " + staffError.message,
      };
    }

    const staffIds = (staffList || []).map((s) => s.id);

    // 5. Ambil data spesialisasi dari facility_staff_specializations untuk seluruh staf ini
    const specMap: Record<string, StaffSpecializationDetail[]> = {};
    if (staffIds.length > 0) {
      const { data: fssList, error: fssError } = await supabase
        .from("facility_staff_specializations")
        .select(`
          id,
          facility_staff_id,
          specialization_id,
          custom_specialization,
          is_verified,
          staff_specializations(name)
        `)
        .in("facility_staff_id", staffIds);

      if (!fssError && fssList) {
        fssList.forEach((row) => {
          const rawItem = row as {
            id: string;
            facility_staff_id: string;
            specialization_id: string | null;
            custom_specialization: string | null;
            is_verified: boolean;
            staff_specializations: { name?: string } | { name?: string }[] | null;
          };
          const specObj = Array.isArray(rawItem.staff_specializations)
            ? rawItem.staff_specializations[0]
            : rawItem.staff_specializations;
          const sName =
            specObj?.name || rawItem.custom_specialization || "Spesialisasi";
          if (!specMap[rawItem.facility_staff_id]) {
            specMap[rawItem.facility_staff_id] = [];
          }
          specMap[rawItem.facility_staff_id].push({
            id: rawItem.id,
            specialization_id: rawItem.specialization_id,
            name: sName,
            is_verified: !!rawItem.is_verified,
          });
        });
      }
    }

    // Normalisasi staf list
    const normalizedStaff: StaffItem[] = (staffList || []).map((item) => {
      const rawProfile = item.profiles;
      const prof = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile;
      return {
        id: item.id,
        profile_id: item.profile_id,
        facility_id: item.facility_id,
        staff_role: item.staff_role,
        profession: item.profession || null,
        str_number: item.str_number || null,
        sip_number: item.sip_number || null,
        specialization: item.specialization || null,
        rejection_reason: item.rejection_reason || null,
        status: item.status,
        created_at: item.created_at,
        specializations: specMap[item.id] || [],
        profiles: prof
          ? {
              id: prof.id,
              full_name: prof.full_name || null,
              email: prof.email || null,
            }
          : null,
      };
    });

    return {
      success: true,
      facility,
      staff: normalizedStaff,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Error getAdminFacilityStaffAction:", msg);
    return {
      success: false,
      error: "Terjadi kesalahan saat memuat data staf: " + msg,
    };
  }
}

/**
 * Menyetujui atau menolak permohonan staf fasilitas kesehatan dengan penetapan role final,
 * pengesahan spesialisasi terstruktur, dan catatan alasan penolakan wajib.
 */
export async function reviewFacilityStaffAction(
  input: ReviewStaffInput
): Promise<UpdateStaffResult> {
  const { staffId, decision, staffRole, verifiedSpecIds, rejectionReason } = input;

  if (!staffId || (decision !== "aktif" && decision !== "ditolak")) {
    return {
      success: false,
      error: "Parameter permohonan staf tidak valid",
    };
  }

  if (decision === "ditolak" && (!rejectionReason || !rejectionReason.trim())) {
    return {
      success: false,
      error: "Alasan penolakan wajib diisi agar pendaftar memahami catatan evaluasi",
    };
  }

  try {
    const supabase = await createClient();

    // Panggil RPC review_facility_staff yang aman dan transaksional
    const { data: res, error: rpcError } = await supabase.rpc("review_facility_staff", {
      p_staff_id: staffId,
      p_decision: decision,
      p_staff_role: staffRole || null,
      p_verified_spec_ids: verifiedSpecIds || null,
      p_rejection_reason: rejectionReason ? rejectionReason.trim() : null,
    });

    if (rpcError) {
      console.error("Database review error:", rpcError);
      return {
        success: false,
        error: "Gagal memproses permohonan staf: " + rpcError.message,
      };
    }

    revalidatePath("/portal", "layout");

    const responseObj = res as { success?: boolean; message?: string } | null;
    return {
      success: true,
      message:
        responseObj?.message ||
        `Permohonan staf berhasil ${decision === "aktif" ? "disetujui" : "ditolak"}.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Error reviewFacilityStaffAction:", msg);
    return {
      success: false,
      error: "Terjadi galat sistem saat meninjau staf: " + msg,
    };
  }
}

/**
 * Backward compatibility handler untuk updateStaffStatusAction
 */
export async function updateStaffStatusAction(
  staffId: string,
  newStatus: "aktif" | "ditolak",
  rejectionReason?: string
): Promise<UpdateStaffResult> {
  return reviewFacilityStaffAction({
    staffId,
    decision: newStatus,
    rejectionReason,
  });
}
