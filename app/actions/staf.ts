"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface StaffItem {
  id: string;
  profile_id: string;
  facility_id: string;
  staff_role: "dokter" | "petugas" | "apoteker";
  str_number: string | null;
  sip_number: string | null;
  specialization: string | null;
  status: "menunggu" | "aktif" | "ditolak";
  created_at: string;
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

/**
 * Mengambil data fasilitas milik admin faskes yang sedang login beserta daftar stafnya.
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
      .select("id, role, subrole, full_name")
      .eq("id", user.id)
      .maybeSingle();

    // 3. Cari fasilitas yang di-admin oleh user ini
    const { data: facility, error: facError } = await supabase
      .from("facilities")
      .select("id, name, type, status, city, district")
      .eq("admin_id", user.id)
      .maybeSingle();

    // Jika bukan admin fasilitas dan bukan dinkes
    if (facError) {
      return {
        success: false,
        error: "Gagal memuat data fasilitas: " + facError.message,
      };
    }

    if (!facility) {
      // Cek apakah akun adalah staf faskes atau dinkes
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
        str_number,
        sip_number,
        specialization,
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

    // Normalisasi join profiles jika berbentuk array
    const normalizedStaff: StaffItem[] = (staffList || []).map((item) => {
      const rawProfile = item.profiles;
      const prof = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile;
      return {
        id: item.id,
        profile_id: item.profile_id,
        facility_id: item.facility_id,
        staff_role: item.staff_role,
        str_number: item.str_number,
        sip_number: item.sip_number,
        specialization: item.specialization,
        status: item.status,
        created_at: item.created_at,
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
 * Menyetujui atau menolak permohonan staf fasilitas kesehatan.
 * Memverifikasi hak akses admin fasilitas atau Dinkes di server sebelum melakukan update.
 */
export async function updateStaffStatusAction(
  staffId: string,
  newStatus: "aktif" | "ditolak"
): Promise<UpdateStaffResult> {
  if (!staffId || (newStatus !== "aktif" && newStatus !== "ditolak")) {
    return {
      success: false,
      error: "Parameter permohonan staf tidak valid",
    };
  }

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
        error: "Sesi login Anda telah kedaluwarsa. Silakan masuk kembali.",
      };
    }

    // 2. Ambil data staf yang akan diperbarui
    const { data: staff, error: staffFetchError } = await supabase
      .from("facility_staff")
      .select("id, facility_id, status, staff_role")
      .eq("id", staffId)
      .maybeSingle();

    if (staffFetchError || !staff) {
      return {
        success: false,
        error: "Data staf tidak ditemukan: " + (staffFetchError?.message || ""),
      };
    }

    // 3. Verifikasi kepemilikan: Pengguna harus admin dari fasilitas tempat staf terdaftar
    const { data: ownedFacility, error: facCheckError } = await supabase
      .from("facilities")
      .select("id, name, admin_id")
      .eq("id", staff.facility_id)
      .eq("admin_id", user.id)
      .maybeSingle();

    if (facCheckError) {
      return {
        success: false,
        error: "Gagal memverifikasi kepemilikan fasilitas: " + facCheckError.message,
      };
    }

    // Jika bukan admin fasilitas tersebut, periksa apakah pengguna adalah Dinkes
    if (!ownedFacility) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.role !== "dinkes") {
        return {
          success: false,
          error:
            "Akses ditolak: Anda tidak memiliki wewenang untuk menyetujui atau menolak staf di fasilitas ini.",
        };
      }
    }

    // 4. Update status staf di database
    const { error: updateError } = await supabase
      .from("facility_staff")
      .update({ status: newStatus })
      .eq("id", staffId);

    if (updateError) {
      // Laporkan pesan galat yang jujur sesuai instruksi
      console.error("Database update error on facility_staff:", updateError);
      return {
        success: false,
        error: "Aksi ditolak basis data: " + updateError.message,
      };
    }

    revalidatePath("/portal", "layout");

    return {
      success: true,
      message: `Permohonan staf berhasil ${newStatus === "aktif" ? "disetujui (status: aktif)" : "ditolak"}.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Error updateStaffStatusAction:", msg);
    return {
      success: false,
      error: "Terjadi galat sistem saat memperbarui status staf: " + msg,
    };
  }
}
